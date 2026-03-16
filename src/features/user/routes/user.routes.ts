import express from 'express';
import { UserController } from '../controllers/user.controller';
import { validate } from '../../../middlewares/validate-middlerware';
import { loginSchema, registerUserSchema, updaterUserSchema } from '../validators/user.validator';
import { authMiddleware } from '../../../middlewares/auth.middleware';

export function UserRoutes() {
    const userController = new UserController();
    const router = express.Router();

    router.get('/list', userController.allUsers);
    router.get('/:id', userController.getUserById);
    router.post('/email', userController.getUserByEmail);
    router.post('/create', validate(registerUserSchema), userController.createUser);
    router.put('/:id', validate(updaterUserSchema), userController.updateUser);
    router.post('/login', validate(loginSchema), userController.login);
    router.get('/current/me', authMiddleware, userController.getCurrentUser);
    return router;
}