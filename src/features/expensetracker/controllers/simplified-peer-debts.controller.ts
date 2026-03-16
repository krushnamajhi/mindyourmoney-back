import { NextFunction, Request, Response } from 'express';
import { SimplifiedPeerDebtService } from '../services/simplified-peer-debts.service';
import { APIError } from '../../../lib/custom-errors';

export class SimplifiedPeerDebtController {

    private simplifiedPeerDebtService: SimplifiedPeerDebtService
    constructor() {
        this.simplifiedPeerDebtService = new SimplifiedPeerDebtService();
    }

    getUserBalanceFromAllGroups = async (req: Request, res: Response, next: NextFunction) => {
        try {
            /**
             * 1. Extract and Validate User ID
             * In a real app, you'd get this from 'req.user.id' after auth middleware.
             * Here, we'll take it from a query param for testing.
             */
            const id = req.params.id?.toString();

            if (isNaN(Number(id)))
                throw new APIError("User Id is invalid")

            // 2. Call the Service
            const balances = await this.simplifiedPeerDebtService.getUserBalanceFromAllGroups(Number(id));
            // 3. Aggregate Totals for a "Dashboard" summary
            const summary = balances.reduce((acc, curr) => {
                if (curr.type === 'YOU_ARE_OWED') {
                    acc.totalYouAreOwed += curr.amount;
                } else {
                    acc.totalYouOwe += curr.amount;
                }
                return acc;
            }, { totalYouOwe: 0, totalYouAreOwed: 0 });

            // 4. Return the response
            return res.status(200).json({
                success: true,
                data: {
                    summary: {
                        ...summary,
                        netBalance: summary.totalYouAreOwed - summary.totalYouOwe
                    },
                    entries: balances
                }
            });

        } catch (error: any) {
            next(error)
        }
    }

    getUserBalanceByGroup = async (req: Request, res: Response, next: NextFunction) => {
        try {
            /**
             * 1. Extract and Validate User ID
             * In a real app, you'd get this from 'req.user.id' after auth middleware.
             * Here, we'll take it from a query param for testing.
             */
            const { id, groupId } = req.body;

            if (isNaN(Number(id)))
                throw new APIError("User Id is invalid")

            if (isNaN(Number(groupId)))
                throw new APIError("Group Id is invalid")

            // 2. Call the Service
            const balances = await this.simplifiedPeerDebtService.getUserBalanceByGroup(Number(id), Number(groupId));
            // 3. Aggregate Totals for a "Dashboard" summary
            const summary = balances.reduce((acc, curr) => {
                if (curr.type === 'YOU_ARE_OWED') {
                    acc.totalYouAreOwed += curr.amount;
                } else {
                    acc.totalYouOwe += curr.amount;
                }
                return acc;
            }, { totalYouOwe: 0, totalYouAreOwed: 0 });

            // 4. Return the response
            return res.status(200).json({
                success: true,
                data: {
                    summary: {
                        ...summary,
                        netBalance: summary.totalYouAreOwed - summary.totalYouOwe
                    },
                    entries: balances
                }
            });

        } catch (error: any) {
            next(error)
        }
    }

    getTotalBalances = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = Number(req.params.id?.toString());
            console.log(userId, "controller 1")

            if (isNaN(userId)) {
                throw new APIError("User Id is invalid")
            }
            console.log(userId, "controller 2")

            // Call the new aggregation service
            const totals = await this.simplifiedPeerDebtService.getUserBalance(userId);
            console.log(userId, "controller 3")

            return res.status(200).json({
                success: true,
                data: totals
            });
        } catch (error: any) {
            next(error)
        }
    }

}

