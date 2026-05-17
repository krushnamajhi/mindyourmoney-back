import express from 'express';
import { ExpenseController } from '../controllers/expense.controller';
import { validate } from '../../../middlewares/validate-middlerware';
import { ExpenseFilterSchema, ExpenseSchema, CreateOrUpdateSettleExpenseSchema, UpdateExpenseSchema } from '../validators/expense.validator';
import { authMiddleware } from '../../../middlewares/auth.middleware';

export function ExpenseRoutes() {
    const expenseController = new ExpenseController();
    const router = express.Router();

    router.get('/list', expenseController.list);
    router.get('/:id/details', expenseController.getExpenseDetails);
    router.get('/:id/editable', expenseController.isEditable);
    router.get('/:id', expenseController.getById);
    router.post('/create', validate(ExpenseSchema), expenseController.create);
    router.put('/settle/:id', validate(CreateOrUpdateSettleExpenseSchema), expenseController.editSettleExpense);
    router.put('/:id', validate(UpdateExpenseSchema), expenseController.update);
    router.get('/debamount/:id', expenseController.getDebtAmountForLoggedInUserInExpense);
    router.delete('/:id', expenseController.delete);
    router.post('/filter', validate(ExpenseFilterSchema), expenseController.getExpenseByFilter);
    router.post('/settle', validate(CreateOrUpdateSettleExpenseSchema), expenseController.settleExpense);
    router.get('/settle/list', expenseController.getAllSettledExpense);
    router.get('/settle/:id', expenseController.getSettledExpense);
    
    return router;
}
