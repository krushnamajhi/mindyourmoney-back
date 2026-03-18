import { EntityManager, QueryRunner, In } from "typeorm";
import { Groups } from "../entities/groups";
import { GroupMember } from "../entities/group-member";
import { GroupDTO } from "../dto/group.dto";
import { SQLUtils } from "../../../utils/sql.utils";
import { ExpenseService } from "./expense.service";
import { Expense } from "../entities/expense";
import { APIError, ValidationError } from "../../../lib/custom-errors";
import { context } from "../../../utils/apiUtils";
import { UserBalance } from "../entities/simplified-peer-debt.view";
import { GroupMemberDTO } from "../dto/group-member.dto";

export class GroupService {

    private expenseService = new ExpenseService();

    async create(groupDTO: GroupDTO, creatorId: number, queryRunner?: QueryRunner): Promise<Groups> {
        return await SQLUtils.executeTransaction(async (manager: EntityManager) => {
            const { groupMemberIds, ...details } = groupDTO;
            // 1. Create and save the Group
            const group = manager.create(Groups, details);

            const savedGroup = await manager.save(group);

            // 3. Handle Junction Table: Group Members
            if (!creatorId) {
                throw new APIError("Creator ID is required to create a group membership");
            }

            let finalMemberIds = groupMemberIds || [];
            // Ensure creatorId is a number and compare safely
            const numCreatorId = Number(creatorId);
            if (!finalMemberIds.some(id => Number(id) === numCreatorId)) {
                finalMemberIds.push(numCreatorId);
            }

            if (finalMemberIds.length > 0) {
                const membershipRows = finalMemberIds.map((userId) => {
                    return manager.create(GroupMember, {
                        groupId: savedGroup.id,
                        userId: userId,
                        isActive: true,
                    });
                });
                await manager.save(GroupMember, membershipRows);
            }

            return savedGroup;
        }, queryRunner);
    }

    async getAll(transactionalManager?: EntityManager): Promise<(Groups & { balance: number })[]> {
        const userId = context().getUser().id;
        const repo = SQLUtils.getRepo(Groups, transactionalManager);

        // 1. Fetch the groups where the user is a member
        const groups = await repo.createQueryBuilder("group")
            .innerJoin("group.groupMembers", "filterMember", "filterMember.userId = :userId AND filterMember.isActive = true")
            .leftJoinAndSelect("group.groupMembers", "groupMembers", "groupMembers.isActive = true")
            .leftJoinAndSelect("groupMembers.user", "user")
            .leftJoinAndSelect("group.expenses", "expenses")
            .setParameter("userId", userId)
            .getMany();

        if (groups.length === 0) return [];

        // 2. Fetch the total balance for THIS user in each of these groups
        const groupIds = groups.map(g => g.id);
        const balances = await SQLUtils.getRepo(UserBalance, transactionalManager)
            .createQueryBuilder("ub")
            .select("ub.groupId", "groupId")
            .addSelect("SUM(ub.balance)", "total")
            .where("ub.userId = :userId", { userId })
            .andWhere("ub.groupId IN (:...groupIds)", { groupIds })
            .groupBy("ub.groupId")
            .getRawMany();

        // 3. Create a map for quick lookup
        const balanceMap = new Map(
            balances.map(b => [b.groupId, Number(b.total || 0)])
        );

        // 4. Attach the balance to each group object
        return groups.map(group => {
            const balance = balanceMap.get(group.id) || 0;
            return Object.assign(group, { balance }) as Groups & { balance: number };
        });
    }

    async getById(id: number, transactionalManager?: EntityManager): Promise<Groups | null> {
        return await SQLUtils.getRepo(Groups, transactionalManager)
            .createQueryBuilder("group")
            .leftJoinAndSelect("group.groupMembers", "groupMembers", "groupMembers.isActive = true")
            .leftJoinAndSelect("groupMembers.user", "user")
            .where("group.id = :id", { id })
            .getOne();
    }

    async getMembersByGroupId(groupId: number, transactionalManager?: EntityManager): Promise<GroupMemberDTO[]> {
        const rows = await SQLUtils.getRepo(GroupMember, transactionalManager)
            .createQueryBuilder("groupMember")
            .leftJoin("groupMember.user", "user")
            .select("groupMember.groupId", "groupId")
            .addSelect("groupMember.userId", "userId")
            .addSelect("groupMember.isActive", "isActive")
            .addSelect("user.id", "memberUserId")
            .addSelect("user.email", "memberUserEmail")
            .addSelect("user.firstName", "memberUserFirstName")
            .addSelect("user.lastName", "memberUserLastName")
            .addSelect("user.fullName", "memberUserFullName")
            .where("groupMember.groupId = :groupId", { groupId })
            .getRawMany<{
                groupId: number | string;
                userId: number | string;
                isActive: boolean | number | string;
                memberUserId: number | string | null;
                memberUserEmail: string | null;
                memberUserFirstName: string | null;
                memberUserLastName: string | null;
                memberUserFullName: string | null;
            }>();

        return rows.map((row) => ({
            groupId: Number(row.groupId),
            userId: Number(row.userId),
            isActive: row.isActive === true || row.isActive === 1 || row.isActive === "1" || row.isActive === "true",
            user: {
                id: Number(row.memberUserId || 0),
                email: row.memberUserEmail || "",
                firstName: row.memberUserFirstName || "",
                lastName: row.memberUserLastName || "",
                fullName: row.memberUserFullName || "",
            }
        }));
    }

    async update(id: number, groupDTO: GroupDTO, queryRunner?: QueryRunner): Promise<Groups | null> {
        return await SQLUtils.executeTransaction(async (manager: EntityManager) => {
            const { groupMemberIds, ...details } = groupDTO;

            // Reuse getById with the current manager
            const group = await this.getById(id, manager);
            if (!group) return null;

            // Update basic fields
            Object.assign(group, details);

            // Update Junction Table: Group Members (Sync pattern)
            if (groupMemberIds) {
                await manager.update(GroupMember, { groupId: id }, { isActive: false });

                if (groupMemberIds.length > 0) {
                    for (const userId of groupMemberIds) {
                        const existingMember = await manager.findOneBy(GroupMember, { groupId: id, userId });
                        if (existingMember) {
                            existingMember.isActive = true;
                            await manager.save(GroupMember, existingMember);
                        } else {
                            await manager.save(GroupMember, manager.create(GroupMember, {
                                groupId: id,
                                userId,
                                isActive: true
                            }));
                        }
                    }
                }
            }

            return await manager.save(group);
        }, queryRunner);
    }

    async delete(id: number, queryRunner?: QueryRunner): Promise<boolean> {
        return await SQLUtils.executeTransaction(async (manager: EntityManager) => {
            // Because of the foreign keys, you might need to delete members first 
            // if you didn't set 'onDelete: CASCADE' in your entity
            const userBalances = await manager.getRepository(UserBalance)
                .createQueryBuilder("ub")
                .where("ub.groupId = :groupId", { groupId: id })
                .andWhere("ub.balance != 0")
                .getMany();
            console.log(userBalances);
            if (userBalances.length > 0) {
                throw new ValidationError("Cannot delete the group as some members have unsettled balance in the group")
            }
            await this.expenseService.deleteByGroupId(id, manager.queryRunner)
            await manager.delete(GroupMember, { groupId: id });
            const result = await manager.delete(Groups, id);
            return !!(result.affected && result.affected > 0);
        }, queryRunner);
    }

    async addMember(groupDTO: Pick<GroupDTO, "groupMemberIds">, groupId: number, queryRunner?: QueryRunner): Promise<GroupMember[]> {
        return await SQLUtils.executeTransaction(async (manager: EntityManager) => {
            const { groupMemberIds } = groupDTO;
            // 3. Handle Junction Table: Group Members
            if (groupMemberIds?.length > 0) {
                const membershipRows: GroupMember[] = [];

                for (const userId of groupMemberIds) {
                    const existingMember = await manager.findOneBy(GroupMember, { groupId, userId });
                    if (existingMember) {
                        existingMember.isActive = true;
                        membershipRows.push(await manager.save(GroupMember, existingMember));
                    } else {
                        membershipRows.push(await manager.save(GroupMember, manager.create(GroupMember, {
                            groupId,
                            userId,
                            isActive: true,
                        })));
                    }
                }

                return membershipRows;
            }
            throw new APIError("No Members provided to add");

        }, queryRunner);

    }

    async removeMember(groupDTO: Pick<GroupDTO, "groupMemberIds">, groupId: number, queryRunner?: QueryRunner): Promise<boolean> {
        return await SQLUtils.executeTransaction(async (manager: EntityManager) => {
            const { groupMemberIds } = groupDTO;
            if (!groupMemberIds || groupMemberIds.length == 0) {
                throw new APIError("Member not Provided")
            }
            const userBalances = await manager.getRepository(UserBalance)
                .createQueryBuilder("ub")
                .where("ub.groupId = :groupId", { groupId })
                .andWhere("ub.userId IN (:...userIds)", { userIds: groupMemberIds })
                .andWhere("ub.balance != 0")
                .getMany();
            console.log(userBalances);
            if (userBalances.length > 0) {
                throw new ValidationError("Cannot remove members as they have a balance in the group")
            }
            const result = await manager.update(GroupMember, {
                groupId: groupId,
                userId: In(groupMemberIds),
            }, {
                isActive: false,
            });
            return !!(result.affected && result.affected > 0);
        }, queryRunner);

    }
}
