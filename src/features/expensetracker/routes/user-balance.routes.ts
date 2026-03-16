import express from 'express';
import { SimplifiedPeerDebtController } from '../controllers/simplified-peer-debts.controller';
import { authMiddleware } from '../../../middlewares/auth.middleware';

export function UserBalanceRoutes() {
    const simplifiedPeerDebtContoller = new SimplifiedPeerDebtController();
    const router = express.Router();

    router.use(authMiddleware);
    // router.get('/list', simplifiedPeerDebtContoller.list);
    router.get('/grouped/all/:id', simplifiedPeerDebtContoller.getUserBalanceFromAllGroups);
    router.get('/grouped', simplifiedPeerDebtContoller.getUserBalanceByGroup);
    router.get('/all/:id', simplifiedPeerDebtContoller.getTotalBalances);
    return router;
}