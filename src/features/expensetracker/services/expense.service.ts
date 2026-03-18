import { Brackets, EntityManager, FindOptionsWhere, In, IsNull, QueryRunner } from "typeorm";
import { Groups } from "../entities/groups";
import { Expense } from "../entities/expense";
import { ExpenseDTO } from "../dto/expense.dto";
import { ExpenseCategory } from "../entities/expense-category";
import { SQLUtils } from "../../../utils/sql.utils";
import { DebtMemberSplitExpenseLine } from "../entities/debt-member-split-expense-line";
import { NotFoundException, ValidationError } from "../../../lib/custom-errors";
import { User } from "../../user/entities/user";
import { ExpenseItemLineSplitType, ExpenseSplitType } from "../lib/split-type.enum";
import { DebtMemberSplitExpenseItemLine } from "../entities/debt-member-split-expense-item-line";
import { ExpenseItemLine } from "../entities/expense-item-line";
import { ExpenseItemLineDTO } from "../dto/expense-item-line.dto";
import { DebtMemberSplitExpenseLineDTO } from "../dto/debt-member-split-expense-line.dto";
import { DebtMemberSplitExpenseItemLineDTO } from "../dto/debt-member-split-expense-item-line.dto";
import { round } from "../lib/common.utils";
import { ExpenseFilterDTO } from "../dto/expense-filter.dto";
import { SettleExpenseDTO } from "../dto/settle-expense.dto";
import { UserBalance } from "../entities/simplified-peer-debt.view";
import { context } from "../../../utils/apiUtils";
import { Filter_ALL, Filter_NONE } from "../../../config/constants";
import { ExpenseRowDTO, ExpenseRowDayWiseDTO, ExpenseRowMonthWiseDTO } from "../dto/expenses-rows.dto";

export class ExpenseService {

    async create(expenseDTO: ExpenseDTO, userId: number, queryRunner?: QueryRunner): Promise<Expense> {
        return await SQLUtils.executeTransaction(async (manager: EntityManager) => {
            const { groupId, expenseCategoryId, debtMemberSplits, paidByUserId, isShared, expenseItemLines, ...details } = expenseDTO;
            const expense = manager.create(Expense, details);

            // 3. Handle User who paid
            if (paidByUserId) {
                const user = await SQLUtils.getRepo(User, manager).findOneBy({ userInfo: { id: paidByUserId } });
                if (!user) throw new Error(`User with ID ${paidByUserId} not found`);
                expense.paidByUser = user;
            }
            else if (!isShared) {
                const user = await SQLUtils.getRepo(User, manager).findOneBy({ userInfo: { id: userId } });
                if (!user) throw new Error(`User with ID ${paidByUserId} not found`);
                expense.paidByUser = user;
            }
            if (isShared) {
                expense.isShared = true;
                if (groupId) {
                    const group = await SQLUtils.getRepo(Groups, manager).findOneBy({ id: groupId });
                    if (!group) throw new ValidationError(`Group with ID ${groupId} not found`);
                    expense.group = group;
                }
            }
            else expense.isShared = false;

            if (expenseCategoryId) {
                const category = await SQLUtils.getRepo(ExpenseCategory).findOneBy({ id: expenseCategoryId as any });
                if (!category) throw new ValidationError(`Category with ID ${expenseCategoryId} not found`);
                expense.expenseCategory = category;
            }
            const savedExpense = await manager.save(expense)

            if (savedExpense.isShared) {
                if (expenseDTO.splitType === ExpenseSplitType.BY_ITEM && (!expenseItemLines || expenseItemLines.length === 0)) {
                    throw new ValidationError(`Atleast one Item is required to be added when ${ExpenseSplitType.BY_ITEM} split type is selected`);
                }
                if ((debtMemberSplits && debtMemberSplits.length > 0))
                    await this.split(expenseDTO.splitType, debtMemberSplits || [], expenseItemLines || [], savedExpense, manager)
                else if (expenseItemLines && expenseItemLines.length > 0) {
                    await this.split(expenseDTO.splitType, debtMemberSplits || [], expenseItemLines || [], savedExpense, manager)

                }
            }

            return savedExpense;
        }, queryRunner);
    }

    async getAll(transactionalManager?: EntityManager): Promise<ExpenseRowMonthWiseDTO[]> {
        const filter: Pick<ExpenseFilterDTO, 'groupId' | 'expenseCategoryId'> = {
            groupId: Filter_ALL,
            expenseCategoryId: Filter_ALL
        }
        return await this.filterExpenses(filter)
    }

    async getById(id: number, transactionalManager?: EntityManager): Promise<Expense | null> {
        return await SQLUtils.getRepo(Expense, transactionalManager).findOne({
            where: [
                { id: id as any, isSettled: false },
                { id: id as any, isSettled: IsNull() }
            ],
            relations: ['group', 'expenseCategory']
        });
    }

    async getExpenseDetails(id: number, transactionalManager?: EntityManager): Promise<ExpenseDTO | null> {
        const manager = SQLUtils.getManager(transactionalManager);

        // 1. Fetch full hierarchy
        const expense = await this.getExpenseById(id, false, manager);

        // Fetch splits manually to avoid massive join explosions
        const debtMemberSplitsRaw = await manager.find(DebtMemberSplitExpenseLine, {
            where: { expenseId: expense.id },
            relations: ['groupMember']
        });

        const itemLinesRaw = await manager.find(ExpenseItemLine, {
            where: { expenseId: expense.id }
        });

        const itemDebtSplitsRaw = await manager.find(DebtMemberSplitExpenseItemLine, {
            where: { expenseId: expense.id },
            relations: ['groupMember']
        });

        // 2. Filter out the payer's credit row (where debtAmount > 0)
        const debtorSplits = debtMemberSplitsRaw.filter(split => split.debtAmount < 0);

        // 3. Determine Top-Level Split Type
        let mainSplitType: ExpenseSplitType = ExpenseSplitType.UNEQUAL;

        if (itemLinesRaw.length > 0) {
            mainSplitType = ExpenseSplitType.BY_ITEM;
        } else if (debtorSplits.length > 0) {
            // Check if all amounts are strictly equal
            const firstAmount = Math.abs(debtorSplits[0]!.debtAmount);
            const allEqual = debtorSplits.every(split => Math.abs(split.debtAmount) === firstAmount);
            mainSplitType = allEqual ? ExpenseSplitType.EQUAL : ExpenseSplitType.UNEQUAL;
        }

        // 4. Map Debt Member Splits to DTO format
        const debtMemberSplitsDTO: DebtMemberSplitExpenseLineDTO[] = debtorSplits.map(split => ({
            userId: split.groupMemberId,
            amount: Math.abs(split.debtAmount)
        } as DebtMemberSplitExpenseLineDTO));

        // 5. Map Item Lines & Determine Per-Item Split Type
        const expenseItemLinesDTO: ExpenseItemLineDTO[] = itemLinesRaw.map(itemLine => {
            // Find debt splits for *this* specific item line
            const itemDebts = itemDebtSplitsRaw.filter(
                split => split.expenseItemLineId === itemLine.id
            );

            let itemSplitType = ExpenseItemLineSplitType.UNEQUAL;

            if (itemDebts.length > 0) {
                const firstAmount = Math.abs(itemDebts[0]!.debtAmount);
                const allEqual = itemDebts.every(split => Math.abs(split.debtAmount) === firstAmount);
                itemSplitType = allEqual ? ExpenseItemLineSplitType.EQUAL : ExpenseItemLineSplitType.UNEQUAL;
            }

            return {
                name: itemLine.name,
                description: itemLine.description,
                amount: Math.abs(itemLine.amount),
                isShared: itemLine.isShared,
                splitType: itemSplitType,
                debtMemberSplitsExpenseItemLines: itemDebts.map(debt => ({
                    userId: debt.groupMemberId,
                    amount: Math.abs(debt.debtAmount)
                } as DebtMemberSplitExpenseItemLineDTO))
            } as ExpenseItemLineDTO;
        });
        // 6. Assemble Final DTO
        const dto: ExpenseDTO = {
            expenseDate: expense.expenseDate,
            title: expense.title,
            description: expense.description || "",
            amount: Number(expense.amount),
            paidByUserId: expense.paidByUser.userInfo.id,
            isShared: expense.isShared,
            splitType: mainSplitType,
            ...(debtMemberSplitsDTO.length > 0 && { debtMemberSplits: debtMemberSplitsDTO }),
            ...(expenseItemLinesDTO.length > 0 && { expenseItemLines: expenseItemLinesDTO }),
            ...(expense.group && { groupId: expense.group.id }),
            ...(expense.expenseCategory && { expenseCategoryId: expense.expenseCategory.id })
        };
        if (!dto) throw new NotFoundException('Expense not found');
        return dto;
    }

    async update(id: number, expenseDTO: ExpenseDTO, queryRunner?: QueryRunner): Promise<Expense | null> {
        return await SQLUtils.executeTransaction(async (manager: EntityManager) => {
            const { groupId, expenseCategoryId, debtMemberSplits, isShared, expenseItemLines, ...details } = expenseDTO;

            // 1. Fetch existing expense with relations needed for split logic
            // We need 'group' and 'paidByUser' to calculate splits correctly
            const expense = await SQLUtils.getRepo(Expense, manager).findOne({
                where: { id: id as any },
                relations: ['group', 'paidByUser', 'paidByUser.userInfo']
            });
            if (!expense) return null;

            // 2. Update basic fields
            Object.assign(expense, details);
            // 3. Handle User who paid (if changing)
            if (expenseDTO.paidByUserId && expenseDTO.paidByUserId != expense.paidByUser.userInfo.id) {
                const user = await SQLUtils.getRepo(User, manager).findOneBy({ userInfo: { id: expenseDTO.paidByUserId } });
                if (!user) throw new ValidationError(`User with ID ${expenseDTO.paidByUserId} not found`);
                expense.paidByUser = user;
            }

            // 5. Handle Category (if changing)
            if (expenseCategoryId) {
                const category = await SQLUtils.getRepo(ExpenseCategory, manager).findOneBy({ id: expenseCategoryId as any });
                if (!category) throw new ValidationError(`Category with ID ${expenseCategoryId} not found`);
                expense.expenseCategory = category;
            }
            if (isShared) {// 4. Handle Group (if changing)
                if (groupId) {
                    const group = await SQLUtils.getRepo(Groups, manager).findOneBy({ id: groupId });
                    if (!group) throw new ValidationError(`Group with ID ${groupId} not found`);
                    expense.group = group;
                    expense.isShared = true;
                }
                else {
                    expense.group = null as any;
                    expense.isShared = true;
                }

                // 6. Save the main expense changes
                const updatedExpense = await manager.save(expense);
                console.log(debtMemberSplits, expenseItemLines, "log2")

                // 7. Sync Splits: Delete old ones and create new ones
                if (debtMemberSplits || expenseItemLines) {
                    // Remove existing splits associated with this expense using soft deletion
                    await manager.delete(DebtMemberSplitExpenseItemLine, { expenseId: updatedExpense.id });
                    await manager.delete(ExpenseItemLine, { expenseId: updatedExpense.id });
                    await manager.delete(DebtMemberSplitExpenseLine, { expenseId: updatedExpense.id });

                    // If new splits are provided, recreate them
                    if (expenseItemLines && expenseItemLines.length > 0) {
                        await this.split(expenseDTO.splitType, debtMemberSplits || [], expenseItemLines || [], updatedExpense, manager);
                    }
                    else if (debtMemberSplits && debtMemberSplits.length > 0) {
                        await this.split(expenseDTO.splitType, debtMemberSplits, expenseItemLines || [], updatedExpense, manager);
                    }
                }
                return updatedExpense;
            }
            else {
                // 7. Remove relations
                expense.group = null as any;
                expense.isShared = false

                // 8. Delete all debt splits associated with this expense
                await manager.delete(DebtMemberSplitExpenseLine, { expenseId: expense.id });

                // 9. Save and return the "Private" expense
                return await manager.save(expense);
            }
        }, queryRunner);
    }

    async delete(id: number, queryRunner?: QueryRunner): Promise<boolean> {
        return await SQLUtils.executeTransaction(async (manager: EntityManager) => {
            await SQLUtils.getRepo(DebtMemberSplitExpenseItemLine, manager).softDelete({ expenseId: id });
            await SQLUtils.getRepo(ExpenseItemLine, manager).softDelete({ expenseId: id });
            await SQLUtils.getRepo(DebtMemberSplitExpenseLine, manager).softDelete({ expenseId: id });
            const result = await manager.softDelete(Expense, id);
            return !!(result.affected && result.affected > 0);
        }, queryRunner);
    }

    async deleteByGroupId(groupId: number, queryRunner?: QueryRunner): Promise<boolean> {
        return await SQLUtils.executeTransaction(async (manager: EntityManager) => {
            await SQLUtils.getRepo(DebtMemberSplitExpenseLine, manager).softDelete({ groupId: groupId });
            const result = await manager.softDelete(Expense, { group: { id: groupId } });
            return !!(result.affected && result.affected > 0);
        }, queryRunner);
    }

    async filterExpenses_1(filter: Partial<ExpenseFilterDTO>, queryRunner?: QueryRunner): Promise<(Expense & { userDebt: number })[]> {
        const { groupId, isShared, paidByUserId, expenseCategoryId, title } = filter;
        const manager = SQLUtils.getManagerFromQueryRunner(queryRunner);

        // 1. Initialize QueryBuilder with required joins to satisfy your Schema
        const query = manager.createQueryBuilder(Expense, "expense")
            .leftJoinAndSelect("expense.paidByUser", "user")
            .leftJoinAndSelect("expense.group", "group")
            .leftJoinAndSelect("expense.expenseCategory", "category");

        if (isShared && isShared !== Filter_ALL) {
            query.andWhere("expense.isShared IN(:...isShared)", { isShared: isShared });
        }

        if (groupId && groupId !== Filter_ALL) {
            const gIds = (groupId as any[]).filter(g => g !== Filter_NONE);
            const hasNone = (groupId as any[]).includes(Filter_NONE);

            if (hasNone || gIds.length > 0) {
                query.andWhere(new Brackets(qb => {
                    if (hasNone) {
                        qb.where("expense.groupId IS NULL");
                        if (gIds.length > 0) qb.orWhere("group.id IN(:...gIds)", { gIds });
                    } else {
                        qb.where("group.id IN(:...gIds)", { gIds });
                    }
                }));
            }
        }

        // Add a subquery to calculate the logged-in user's debt for each expense
        const userId = context().getUser().id;
        query.addSelect(sub => {
            return sub
                .select("SUM(debt.debtAmount)", "sum")
                .from(DebtMemberSplitExpenseLine, "debt")
                .where("debt.expenseId = expense.id")
                .andWhere("debt.groupMemberId = :userId", { userId });
        }, "userDebt");

        // Exclude orphan shared expenses where:
        // group is null, isShared=true, payer is someone else, and current user has no debt split row.
        const userMembershipSubQuery = query.subQuery()
            .select("1")
            .from(DebtMemberSplitExpenseLine, "membershipDebt")
            .where("membershipDebt.expenseId = expense.id")
            .andWhere("membershipDebt.groupMemberId = :userId")
            .getQuery();

        query.andWhere(new Brackets(qb => {
            qb.where("expense.groupId IS NOT NULL")
                .orWhere("expense.isShared = :isSharedFalse", { isSharedFalse: false })
                .orWhere("user.id = :userId")
                .orWhere(`EXISTS ${userMembershipSubQuery}`);
        }));

        if (paidByUserId && paidByUserId !== Filter_ALL) {
            query.andWhere("user.id IN(:...paidByUserId)", { paidByUserId: paidByUserId });
        }

        if (expenseCategoryId && expenseCategoryId !== Filter_ALL) {
            const cIds = (expenseCategoryId as any[]).filter(c => c !== Filter_NONE);
            const hasNone = (expenseCategoryId as any[]).includes(Filter_NONE);

            if (hasNone || cIds.length > 0) {
                query.andWhere(new Brackets(qb => {
                    if (hasNone) {
                        qb.where("expense.expenseCategoryId IS NULL");
                        if (cIds.length > 0) qb.orWhere("category.id IN(:...cIds)", { cIds });
                    } else {
                        qb.where("category.id IN(:...cIds)", { cIds });
                    }
                }));
            }
        }

        if (title && title.trim() !== "") {
            query.andWhere(new Brackets(qb => {
                qb.where("expense.title LIKE :search", { search: `%${title}%` })
                    .orWhere("expense.description LIKE :search", { search: `%${title}%` });
            }));
        }

        if (filter.startDate) {
            query.andWhere("expense.expenseDate >= :startDate", { startDate: filter.startDate })
        }
        if (filter.endDate) {
            query.andWhere("expense.expenseDate <= :endDate", { endDate: filter.endDate })
        }

        // 3. Order and Execution
        query.orderBy("expense.expenseDate", "DESC");
        query.orderBy("expense.id", "DESC");

        try {
            console.log(`[CYBER-LOG]: Dispatching Filtered Query...`);
            const { entities, raw } = await query.getRawAndEntities();
            console.log('entities', entities);
            console.log('raw', raw);

            // Map the virtual 'userDebt' column manually to each expense
            return entities.map((ex, index) => {
                const userDebt = raw[index].userDebt ? raw[index].userDebt : ex.isShared ? 0 : -ex.amount;
                return Object.assign(ex, { userDebt: userDebt }) as Expense & { userDebt: number };
            });
        } catch (error) {
            // If this fails, it's likely a column naming mismatch in your Entity file
            console.error("[SYSTEM ERROR]: SQL Execution Blocked", error);
            throw error;
        }
    }

    async filterExpenses(filter: Partial<ExpenseFilterDTO>, queryRunner?: QueryRunner): Promise<ExpenseRowMonthWiseDTO[]> {
        const { groupId, isShared, paidByUserId, expenseCategoryId, title, startDate, endDate, limit } = filter;
        const manager = SQLUtils.getManagerFromQueryRunner(queryRunner);
        const userId = context().getUser().id;

        const normalizeBoolean = (value: unknown): boolean => value === true || value === "true" || value === 1;
        const normalizeIdArray = <T>(value: T[] | string | undefined, noneToken: string) => {
            if (!value || value === Filter_ALL) {
                return { ids: [] as T[], hasNone: false, hasFilter: false };
            }
            const arr = value as T[];
            return {
                ids: arr.filter((item) => item !== (noneToken as unknown as T)),
                hasNone: arr.includes(noneToken as unknown as T),
                hasFilter: arr.length > 0,
            };
        };

        // 1. Build a lean query: fetch only columns required by ExpenseRowDTO.
        const query = manager.createQueryBuilder(Expense, "expense")
            .leftJoin("expense.paidByUser", "user")
            .leftJoin("expense.group", "group")
            .leftJoin("expense.expenseCategory", "category")
            .leftJoin(
                DebtMemberSplitExpenseLine,
                "settlementDebt",
                "settlementDebt.expenseId = expense.id AND expense.isSettled = :isSettledTrue AND settlementDebt.debtAmount < 0",
                { isSettledTrue: true }
            )
            .leftJoin(User, "paidToUser", "paidToUser.id = settlementDebt.groupMemberId")
            .select("expense.id", "id")
            .addSelect("expense.expenseDate", "expenseDate")
            .addSelect("expense.title", "title")
            .addSelect("expense.description", "description")
            .addSelect("expense.amount", "amount")
            .addSelect("expense.isShared", "isShared")
            .addSelect("expense.isSettled", "isSettled")
            .addSelect("user.id", "paidByUserId")
            .addSelect("user.fullName", "paidByUserFullName")
            .addSelect("settlementDebt.groupMemberId", "paidToUserId")
            .addSelect("paidToUser.fullName", "paidToUserFullName")
            .addSelect("group.id", "groupId")
            .addSelect("group.name", "groupName")
            .addSelect("category.id", "expenseCategoryId")
            .addSelect("category.name", "expenseCategoryName");

        if (isShared && isShared !== Filter_ALL) {
            query.andWhere("expense.isShared IN(:...isShared)", { isShared: isShared });
        }

        const normalizedGroupFilter = normalizeIdArray(groupId as any[] | string | undefined, Filter_NONE);
        if (normalizedGroupFilter.hasFilter) {
            query.andWhere(new Brackets(qb => {
                if (normalizedGroupFilter.hasNone) {
                    qb.where("expense.groupId IS NULL");
                    if (normalizedGroupFilter.ids.length > 0) {
                        qb.orWhere("group.id IN(:...gIds)", { gIds: normalizedGroupFilter.ids });
                    }
                } else {
                    qb.where("group.id IN(:...gIds)", { gIds: normalizedGroupFilter.ids });
                }
            }));
        }

        // Add a subquery to calculate the logged-in user's debt for each expense
        query.addSelect(sub => {
            return sub
                .select("SUM(debt.debtAmount)", "sum")
                .from(DebtMemberSplitExpenseLine, "debt")
                .where("debt.expenseId = expense.id")
                .andWhere("debt.groupMemberId = :userId", { userId });
        }, "userDebt");

        // Exclude orphan shared expenses where:
        // group is null, isShared=true, payer is someone else, and current user has no debt split row.
        const userMembershipSubQuery = query.subQuery()
            .select("1")
            .from(DebtMemberSplitExpenseLine, "membershipDebt")
            .where("membershipDebt.expenseId = expense.id")
            .andWhere("membershipDebt.groupMemberId = :userId")
            .getQuery();

        query.andWhere(new Brackets(qb => {
            qb.where("expense.groupId IS NOT NULL")
                .orWhere("expense.isShared = :isSharedFalse", { isSharedFalse: false })
                .orWhere("user.id = :userId")
                .orWhere(`EXISTS ${userMembershipSubQuery}`);
        }));

        if (paidByUserId && paidByUserId !== Filter_ALL) {
            query.andWhere("user.id IN(:...paidByUserId)", { paidByUserId: paidByUserId });
        }

        const normalizedCategoryFilter = normalizeIdArray(expenseCategoryId as any[] | string | undefined, Filter_NONE);
        if (normalizedCategoryFilter.hasFilter) {
            query.andWhere(new Brackets(qb => {
                if (normalizedCategoryFilter.hasNone) {
                    qb.where("expense.expenseCategoryId IS NULL");
                    if (normalizedCategoryFilter.ids.length > 0) {
                        qb.orWhere("category.id IN(:...cIds)", { cIds: normalizedCategoryFilter.ids });
                    }
                } else {
                    qb.where("category.id IN(:...cIds)", { cIds: normalizedCategoryFilter.ids });
                }
            }));
        }

        if (title && title.trim() !== "") {
            query.andWhere(new Brackets(qb => {
                qb.where("expense.title LIKE :search", { search: `%${title}%` })
                    .orWhere("expense.description LIKE :search", { search: `%${title}%` });
            }));
        }

        if (startDate) {
            query.andWhere("expense.expenseDate >= :startDate", { startDate })
        }
        if (endDate) {
            query.andWhere("expense.expenseDate <= :endDate", { endDate })
        }

        // 3. Order and execution
        query.orderBy("expense.expenseDate", "DESC");
        query.addOrderBy("expense.id", "DESC");
        if (typeof limit === "number" && Number.isFinite(limit) && limit > 0) {
            const safeLimit = Math.floor(limit);
            // `getRawMany` honors SQL `LIMIT` more consistently across drivers than `take`.
            query.limit(safeLimit);
        }

        try {
            const rawRows = await query.getRawMany<{
                id: number | string;
                expenseDate: Date | string;
                title: string;
                description: string | null;
                amount: number | string;
                paidByUserId: number | string | null;
                paidByUserFullName: string | null;
                paidToUserId: number | string | null;
                paidToUserFullName: string | null;
                groupId: number | string | null;
                groupName: string | null;
                expenseCategoryId: number | string | null;
                expenseCategoryName: string | null;
                isShared: boolean | string | number | null;
                isSettled: boolean | string | number | null;
                userDebt: number | string | null;
            }>();

            if (rawRows.length === 0) {
                return [];
            }

            const monthNames = [
                "January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"
            ];

            // O(n) grouping using hash maps: year -> month -> day -> expenses
            const groupedByYear = new Map<number, Map<number, Map<number, ExpenseRowDTO[]>>>();

            for (const row of rawRows) {
                const expenseDate = new Date(row.expenseDate);
                const year = expenseDate.getFullYear();
                const month = expenseDate.getMonth() + 1;
                const day = expenseDate.getDate();

                const expenseRow: ExpenseRowDTO = {
                    id: Number(row.id),
                    expenseDate,
                    title: row.title,
                    description: row.description || "",
                    amount: Number(row.amount),
                    paidByUser: {
                        id: Number(row.paidByUserId || 0),
                        fullName: row.paidByUserFullName || "Unknown User"
                    },
                    isShared: normalizeBoolean(row.isShared),
                    isSettled: normalizeBoolean(row.isSettled),
                    balance: Number(row.userDebt || 0)
                };
                if (normalizeBoolean(row.isSettled) && row.paidToUserId != null) {
                    expenseRow.paidToUser = {
                        id: Number(row.paidToUserId),
                        fullName: row.paidToUserFullName || "Unknown User"
                    };
                }
                if (row.groupId != null) {
                    expenseRow.group = {
                        id: Number(row.groupId),
                        name: row.groupName || "Unnamed Group"
                    };
                }
                if (row.expenseCategoryId != null) {
                    expenseRow.expenseCategory = {
                        id: Number(row.expenseCategoryId),
                        name: row.expenseCategoryName || "Uncategorized"
                    };
                }

                let monthsMap = groupedByYear.get(year);
                if (!monthsMap) {
                    monthsMap = new Map<number, Map<number, ExpenseRowDTO[]>>();
                    groupedByYear.set(year, monthsMap);
                }

                let daysMap = monthsMap.get(month);
                if (!daysMap) {
                    daysMap = new Map<number, ExpenseRowDTO[]>();
                    monthsMap.set(month, daysMap);
                }

                let dayRows = daysMap.get(day);
                if (!dayRows) {
                    dayRows = [];
                    daysMap.set(day, dayRows);
                }
                dayRows.push(expenseRow);
            }

            return Array.from(groupedByYear.entries())
                .sort(([yearA], [yearB]) => yearB - yearA)
                .flatMap(([year, monthsMap]) =>
                    Array.from(monthsMap.entries())
                        .sort(([monthA], [monthB]) => monthB - monthA)
                        .map(([month, daysMap]) => {
                            const expensesPerMonth: ExpenseRowDayWiseDTO[] = Array.from(daysMap.entries())
                                .sort(([dayA], [dayB]) => dayB - dayA)
                                .map(([day, expensesPerDay]) => ({
                                    day,
                                    expensesPerDay
                                }));

                            return {
                                year,
                                month: monthNames[month - 1] ?? "Unknown",
                                expensesPerMonth
                            };
                        })
                );
        } catch (error) {
            // If this fails, it's likely a column naming mismatch in your Entity file
            console.error("[SYSTEM ERROR]: SQL Execution Blocked", error);
            throw error;
        }
    }

    async getDebtAmuontForLoggedInUserInExpense(id: number, userId: number, transactionalManager?: EntityManager, queryRunner?: QueryRunner): Promise<number> {
        const manager = SQLUtils.getManagerFromQueryRunner(queryRunner);
        const query = manager.createQueryBuilder(DebtMemberSplitExpenseLine, "debt_member_split_expense_line")
            .select("SUM(debt_member_split_expense_line.debtAmount)", "sum")
            .where("debt_member_split_expense_line.expenseId = :expenseId", { expenseId: id })
            .andWhere("debt_member_split_expense_line.groupMemberId = :groupMemberId", { groupMemberId: userId })
            .groupBy("debt_member_split_expense_line.groupMemberId");

        const result = await query.getRawOne();
        return Number(result?.sum || 0);
    }

    async settleExpense(settleExpenseDTO: SettleExpenseDTO, queryRunner?: QueryRunner): Promise<Expense> {
        return await SQLUtils.executeTransaction(async (manager: EntityManager) => {
            const { settledMemberId, groupId, ...details } = settleExpenseDTO
            const userBalance = await manager.findOneBy(UserBalance, { userId: details.paidByUserId, groupId: groupId, peerId: settledMemberId })
            if (userBalance) {
                const totalBalance = userBalance.balance + details.amount;
                if (totalBalance > 0)
                    throw new ValidationError(`Settlement amount is greater than the balance amount. Balance amount is ${userBalance.balance} and Settled amount is ${details.amount}`)
            }
            const expense = manager.create(Expense, {
                ...details,
                expenseDate: new Date(),
                isSettled: true,
                isShared: true,
                title: "Settlement",
                description: "Settlement"
            });
            if (details.paidByUserId) {
                const user = await SQLUtils.getRepo(User, manager).findOneBy({ userInfo: { id: details.paidByUserId } });
                if (!user) throw new Error(`User with ID ${details.paidByUserId} not found`);
                expense.paidByUser = user;
            }
            if (groupId) {
                const group = await SQLUtils.getRepo(Groups, manager).findOneBy({ id: groupId });
                if (!group) throw new ValidationError(`Group with ID ${groupId} not found`);
                expense.group = group;
            }
            const selectedMember = await SQLUtils.getRepo(User, manager).findOneBy({ userInfo: { id: settledMemberId } });
            if (!selectedMember) throw new ValidationError(`User with ID ${settledMemberId} not found`);
            expense.description = `Paid amount of ${details.amount} by '${expense.paidByUser.userInfo.fullName}' to '${selectedMember.userInfo.fullName} as Settlement'`
            const savedExpense = await manager.save(expense)
            const debtMemberSplit = [this.createDebtMemberSplit(settledMemberId, savedExpense, details.amount, manager, true),
            this.createDebtMemberSplit(details.paidByUserId, savedExpense, details.amount, manager, false)
            ];
            await manager.save(DebtMemberSplitExpenseLine, debtMemberSplit);
            return savedExpense;
        }, queryRunner);
    }

    async editSettleExpense(id: number, settleExpenseDTO: SettleExpenseDTO, queryRunner?: QueryRunner): Promise<Expense | null> {
        return await SQLUtils.executeTransaction(async (manager: EntityManager) => {
            const { settledMemberId, groupId, ...details } = settleExpenseDTO;

            // 1. Fetch existing settlement expense
            const expense = await SQLUtils.getRepo(Expense, manager).findOne({
                where: { id: id as any, isSettled: true },
                relations: ['group', 'paidByUser', 'paidByUser.userInfo']
            });
            if (!expense) throw new NotFoundException('Settlement expense not found');

            // 2. Validate balance
            const userBalance = await manager.findOneBy(UserBalance, { userId: details.paidByUserId, groupId: groupId, peerId: settledMemberId });
            if (userBalance) {
                const totalBalance = userBalance.balance + details.amount;
                if (totalBalance > 0)
                    throw new ValidationError(`Settlement amount is greater than the balance amount. Balance amount is ${userBalance.balance} and Settled amount is ${details.amount}`);
            }

            // 3. Update basic fields
            expense.amount = details.amount;

            // 4. Handle User who paid (if changing)
            if (details.paidByUserId && details.paidByUserId !== expense.paidByUser.userInfo.id) {
                const user = await SQLUtils.getRepo(User, manager).findOneBy({ userInfo: { id: details.paidByUserId } });
                if (!user) throw new ValidationError(`User with ID ${details.paidByUserId} not found`);
                expense.paidByUser = user;
            }

            // 5. Handle Group (if changing)
            if (groupId) {
                const group = await SQLUtils.getRepo(Groups, manager).findOneBy({ id: groupId });
                if (!group) throw new ValidationError(`Group with ID ${groupId} not found`);
                expense.group = group;
            }

            // 6. Update settled member info and description
            const selectedMember = await SQLUtils.getRepo(User, manager).findOneBy({ userInfo: { id: settledMemberId } });
            if (!selectedMember) throw new ValidationError(`User with ID ${settledMemberId} not found`);
            expense.description = `Paid amount of ${details.amount} by '${expense.paidByUser.userInfo.fullName}' to '${selectedMember.userInfo.fullName} as Settlement'`;

            // 7. Save updated expense
            const savedExpense = await manager.save(expense);

            // 8. Delete old debt splits and recreate
            await manager.softDelete(DebtMemberSplitExpenseLine, { expenseId: savedExpense.id });

            const debtMemberSplit = [
                this.createDebtMemberSplit(settledMemberId, savedExpense, details.amount, manager, true),
                this.createDebtMemberSplit(details.paidByUserId, savedExpense, details.amount, manager, false)
            ];
            await manager.save(DebtMemberSplitExpenseLine, debtMemberSplit);

            return savedExpense;
        }, queryRunner);
    }


    async getSettledExpense(id: number, transactionalManager?: EntityManager): Promise<SettleExpenseDTO> {
        const manager = SQLUtils.getManager(transactionalManager);

        const expense = await this.getExpenseById(id, true, manager);

        // Find debt splits for this expense
        const debtSplits = await manager.find(DebtMemberSplitExpenseLine, {
            where: { expenseId: expense.id }
        });

        // The settled member is the one with negative debtAmount (owes) who is NOT the payer
        const payerId = expense.paidByUser.userInfo.id;
        const settledSplit = debtSplits.find(s => s.debtAmount < 0 && s.groupMemberId !== payerId);

        const dto: SettleExpenseDTO = {
            expenseId: expense.id,
            amount: Number(expense.amount),
            paidByUserId: payerId,
            groupId: expense.group?.id,
            settledMemberId: settledSplit?.groupMemberId ?? 0
        } as SettleExpenseDTO;
        if (!dto) {
            throw new NotFoundException('Settlement expense not found');
        }

        return dto;
    }

    async getAllSettledExpense(transactionalManager?: EntityManager): Promise<SettleExpenseDTO[] | null> {
        const manager = SQLUtils.getManager(transactionalManager);

        // Optimized: Single query fetching debtor splits for settlements.
        // This gives us one row per settlement, containing both expense data and the settled member.
        const query = manager.createQueryBuilder(DebtMemberSplitExpenseLine, "debt")
            .innerJoinAndSelect("debt.expense", "expense")
            .leftJoinAndSelect("expense.paidByUser", "user")
            .leftJoinAndSelect("expense.group", "group")
            .where("expense.isSettled = :isSettled", { isSettled: true })
            .andWhere("debt.debtAmount < 0") // The settled member is the debtor in the settlement record
            .orderBy("expense.id", "DESC")
        const settlements = await query.getMany();

        return settlements.map(s => ({
            expenseId: s.expense.id,
            amount: Number(s.expense.amount),
            paidByUserId: s.expense.paidByUser.userInfo.id,
            groupId: s.expense.group?.id,
            settledMemberId: s.groupMemberId
        } as SettleExpenseDTO));
    }

    async split(splitType: string, debtMemberSplits: DebtMemberSplitExpenseLineDTO[], expenseItemLines: ExpenseItemLineDTO[], savedExpense: Expense, manager: EntityManager) {
        if ((!debtMemberSplits || debtMemberSplits.length === 0) && (!expenseItemLines || expenseItemLines.length === 0)) return;

        const payerId = savedExpense.paidByUser.userInfo.id

        const debtRows = []
        if (splitType === ExpenseSplitType.EQUAL) {

            // 1. Calculate share (Math.round or toFixed is safer for currency)
            const sharePerMember = savedExpense.amount / debtMemberSplits.length;

            // 2. Map existing split members
            debtRows.push(...debtMemberSplits.map((s) => {
                return this.createDebtMemberSplit(s.userId, savedExpense, sharePerMember, manager, true);
            }));
        }
        else if (splitType === ExpenseSplitType.BY_PERCENT) {
            // 2. Map existing split members
            debtRows.push(...debtMemberSplits.map((s) => {
                const sharePerMember = (s.percent / 100) * savedExpense.amount
                return this.createDebtMemberSplit(s.userId, savedExpense, sharePerMember, manager, true);
            }));
        }
        else if (splitType === ExpenseSplitType.BY_SHARE) {
            // 2. Map existing split members
            const totalShares = debtMemberSplits.reduce((accumulator, s) => accumulator + s.share, 0)
            const amountPerShare = savedExpense.amount / totalShares;
            debtRows.push(...debtMemberSplits.map((s) => {
                const sharePerMember = amountPerShare * s.share
                return this.createDebtMemberSplit(s.userId, savedExpense, sharePerMember, manager, true);
            }));
        }

        else if (splitType === ExpenseSplitType.UNEQUAL) {
            // 2. Map existing split members
            debtRows.push(...debtMemberSplits.map((s) => {
                return this.createDebtMemberSplit(s.userId, savedExpense, s.amount, manager, true);
            }));
        }
        else if (splitType === ExpenseSplitType.BY_ITEM) {
            if (!expenseItemLines || expenseItemLines.length === 0) {
                throw new ValidationError("Item lines are required for BY_ITEM split type");
            }
            const itemLinesRows = expenseItemLines.map((s) => {
                const { debtMemberSplitsExpenseItemLines, splitType, ...details } = s
                return { expenseItemLine: manager.create(ExpenseItemLine, { ...details, expense: savedExpense, amount: -details.amount }), debtMemberSplitsExpenseItemLines, splitType }
            })
            const savedExpenseLines = await manager.save(ExpenseItemLine, itemLinesRows.map((line) => line.expenseItemLine));
            const debtExpenseItemLineRows = [];
            for (let i = 0; i < itemLinesRows.length; i++) {
                const originalRow = itemLinesRows[i];
                const savedLine = savedExpenseLines[i]; // Matches index with itemLinesRows
                if (!savedLine)
                    continue;
                if (savedLine.isShared) {
                    // If there are splits for this specific item, process them
                    if (originalRow && originalRow.debtMemberSplitsExpenseItemLines && originalRow.debtMemberSplitsExpenseItemLines.length > 0) {
                        const rows = this.splitItemLine(originalRow.splitType, originalRow.debtMemberSplitsExpenseItemLines, savedLine, savedExpense, manager)
                        rows && debtExpenseItemLineRows.push(...rows);
                    }
                }
                else debtExpenseItemLineRows.push(this.createDebtMemberSplitExpenseItemLine(payerId, savedExpense, savedLine, savedLine.amount, manager))
            }
            const savedDebtExpenseItemLineRows = await manager.save(DebtMemberSplitExpenseItemLine, debtExpenseItemLineRows);

            let totalAddedAmount = 0;
            let groupMemberExpenseMap = new Map<number, number>();
            savedDebtExpenseItemLineRows.forEach((row) => {
                const amount = Math.abs(Number(row.debtAmount));
                groupMemberExpenseMap.set(row.groupMemberId, (groupMemberExpenseMap.get(row.groupMemberId) ?? 0) + amount);
                totalAddedAmount += amount;
            });
            if (round().currency(totalAddedAmount) !== round().currency(savedExpense.amount))
                throw new ValidationError(`Amount of items "${round().currency(totalAddedAmount)}" doesn't sum up with Expense amount "${savedExpense.amount}"`)
            debtRows.push(...groupMemberExpenseMap.entries().map(([groupMemberId, sharePerMember]) => {
                return this.createDebtMemberSplit(groupMemberId, savedExpense, Math.abs(sharePerMember), manager, true)
            }))
        }
        else throw new ValidationError(`split type value "${splitType}" is invalid`)

        // 3. Handle the Payer logic
        debtRows.push(this.createDebtMemberSplit(payerId, savedExpense, savedExpense.amount, manager, false));
        // 4. Save everything together
        // This MUST be awaited so the manager doesn't release the runner too early
        await manager.save(DebtMemberSplitExpenseLine, debtRows);
    }



    createDebtMemberSplit(
        userId: number,
        savedExpense: Expense,
        sharePerMember: number,
        manager: EntityManager,
        isOwed: boolean
    ): DebtMemberSplitExpenseLine {
        // Use manager.create to benefit from TypeORM's entity initialization
        const data = manager.create(DebtMemberSplitExpenseLine, {
            expense: savedExpense,
            groupMemberId: userId,
            groupId: savedExpense.group?.id,
            debtAmount: round().currency(isOwed ? -sharePerMember : sharePerMember) // Storing as negative to represent "owing"
        });

        return data;
    }

    createDebtMemberSplitExpenseItemLine(
        userId: number,
        savedExpense: Expense,
        expenseItemLine: ExpenseItemLine,
        sharePerMember: number,
        manager: EntityManager,
    ): DebtMemberSplitExpenseItemLine {
        // Use manager.create to benefit from TypeORM's entity initialization
        const data = manager.create(DebtMemberSplitExpenseItemLine, {
            expense: savedExpense,
            groupMemberId: userId,
            expenseItemLine: expenseItemLine,
            groupId: savedExpense.group?.id,
            debtAmount: round().currency(sharePerMember) // Storing as negative to represent "owing"
        });
        return data;
    }

    splitItemLine(splitType: string, debtMemberSplits: DebtMemberSplitExpenseItemLineDTO[], savedExpenseLine: ExpenseItemLine, savedExpense: Expense, manager: EntityManager) {
        if (!debtMemberSplits || debtMemberSplits.length === 0) return;
        const debtRows = []
        if (splitType === ExpenseItemLineSplitType.EQUAL) {

            // 1. Calculate share (Math.round or toFixed is safer for currency)
            const sharePerMember = savedExpenseLine.amount / debtMemberSplits.length;
            const roundedSharePerMember = round().currency(sharePerMember);
            const remainingAmount = round().currency(savedExpenseLine.amount - (roundedSharePerMember * debtMemberSplits.length));
            // 2. Map existing split members
            let addedRemainingAmount = false;
            debtRows.push(...debtMemberSplits.map((s) => {
                if (addedRemainingAmount) {
                    return this.createDebtMemberSplitExpenseItemLine(s.userId, savedExpense, savedExpenseLine, roundedSharePerMember, manager);
                }
                else {
                    addedRemainingAmount = true;
                    return this.createDebtMemberSplitExpenseItemLine(s.userId, savedExpense, savedExpenseLine, roundedSharePerMember + remainingAmount, manager);
                }
            }));
        }
        else if (splitType === ExpenseItemLineSplitType.BY_PERCENT) {
            // 2. Map existing split members
            debtRows.push(...debtMemberSplits.map((s) => {
                const sharePerMember = (s.percent / 100) * savedExpenseLine.amount
                return this.createDebtMemberSplitExpenseItemLine(s.userId, savedExpense, savedExpenseLine, round().percent(sharePerMember), manager);
            }));
        }
        else if (splitType === ExpenseSplitType.BY_SHARE) {
            // 2. Map existing split members
            const totalShares = debtMemberSplits.reduce((accumulator, s) => accumulator + s.share, 0)
            const amountPerShare = savedExpenseLine.amount / totalShares;
            debtRows.push(...debtMemberSplits.map((s) => {
                const sharePerMember = amountPerShare * s.share
                return this.createDebtMemberSplitExpenseItemLine(s.userId, savedExpense, savedExpenseLine, round().currency(sharePerMember), manager);
            }));
        }

        else if (splitType === ExpenseSplitType.UNEQUAL) {
            // 2. Map existing split members
            debtRows.push(...debtMemberSplits.map((s) => {
                return this.createDebtMemberSplitExpenseItemLine(s.userId, savedExpense, savedExpenseLine, round().currency(s.amount), manager);
            }));
        }
        else throw new ValidationError(`split type value "${splitType}" is invalid`)
        return debtRows;
    }

    async getExpenseById(id: number, isSettled?: boolean, transactionalManager?: EntityManager): Promise<Expense> {
        const manager = SQLUtils.getManager(transactionalManager);
        let where: any[]
        if (!isSettled) {
            where = [
                { id: id as any, isSettled: false },
                { id: id as any, isSettled: IsNull() }
            ]
        }
        else {
            where = [{ id: id as any, isSettled: true }]
        }
        const expense = await manager.findOne(Expense, {
            where: where,
            relations: [
                'paidByUser.userInfo',
                'group',
                'expenseCategory'
            ]
        });

        if (!expense) throw new NotFoundException('Expense not found');
        return expense;
    }
}
