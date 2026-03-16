import express from 'express';
import { ExpenseCategoryController } from '../controllers/expense-category.controller';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { validate } from '../../../middlewares/validate-middlerware';
import { ExpenseCategorySchema, UpdateExpenseCategorySchema } from '../validators/expense-category.validator';

export function ExpenseCategoryRoutes() {
    const expenseCategoryController = new ExpenseCategoryController();
    const router = express.Router();

    // Protect all category routes
    router.use(authMiddleware);

    router.get('/list', expenseCategoryController.list);
    router.get('/:id', expenseCategoryController.getById);
    router.post('/create', validate(ExpenseCategorySchema), expenseCategoryController.create);
    router.put('/:id', validate(UpdateExpenseCategorySchema), expenseCategoryController.update);
    router.delete('/:id', expenseCategoryController.delete);

    return router;
}