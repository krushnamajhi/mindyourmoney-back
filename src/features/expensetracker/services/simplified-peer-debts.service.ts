import { NextFunction } from "express";
import { SQLUtils } from "../../../utils/sql.utils";
import { EntityManager, QueryRunner } from "typeorm";
import { UserBalance } from "../entities/simplified-peer-debt.view";

export class SimplifiedPeerDebtService {

    async getUserBalanceFromAllGroups(userId: number, queryRunner?: QueryRunner) {

        return SQLUtils.executeTransaction(async (manager: EntityManager) => {

            // The view now provides rows specifically for the requested userId
            const relations = await SQLUtils.getRepo(UserBalance, manager).find({
                where: { userId: userId }
            });

            return relations.map(row => {
                return {
                    friendId: row.peerId,
                    groupId: row.groupId,
                    groupName: row.groupName,
                    amount: Math.abs(row.balance),
                    type: row.balance > 0 ? 'YOU_ARE_OWED' : 'YOU_OWE'
                };
            });

        }, queryRunner)
    }

    async getUserBalanceByGroup(userId: number, groupId: number, queryRunner?: QueryRunner) {

        return SQLUtils.executeTransaction(async (manager: EntityManager) => {

            // The view now provides rows specifically for the requested userId
            const relations = await SQLUtils.getRepo(UserBalance, manager).find({
                where: { userId: userId, groupId: groupId }
            });

            return relations.map(row => {
                return {
                    friendId: row.peerId,
                    groupId: row.groupId,
                    groupName: row.groupName,
                    amount: Math.abs(row.balance),
                    type: row.balance > 0 ? 'YOU_ARE_OWED' : 'YOU_OWE'
                };
            });

        }, queryRunner)
    }

    getUserBalance(userId: number, queryRunner?: QueryRunner) {
        return SQLUtils.executeTransaction(async (manager: EntityManager) => {

            // 1. Fetch all rows for this user
            const relations = await SQLUtils.getRepo(UserBalance, manager).find({
                where: { userId: userId }
            });

            /**
             * 2. Aggregate logic:
             * Sum up balances across different groups for the same peer.
             */
            const totalsMap = new Map<number, number>();

            relations.forEach(row => {
                const friendId = row.peerId;
                const balance = Number(row.balance);

                const currentTotal = totalsMap.get(friendId) || 0;
                totalsMap.set(friendId, currentTotal + balance);
            });

            // 3. Convert Map back to a clean array
            return Array.from(totalsMap.entries())
                .map(([friendId, totalAmount]) => ({
                    friendId,
                    amount: Math.abs(totalAmount),
                    type: totalAmount > 0 ? 'YOU_ARE_OWED' : 'YOU_OWE'
                }))
                .filter(item => item.amount !== 0);

        }, queryRunner)

    }
}