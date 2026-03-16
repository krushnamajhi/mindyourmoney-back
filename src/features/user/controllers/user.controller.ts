import { Request, Response, NextFunction } from "express";
import { UserService } from "../services/user.service";
import { CreateUserDTO } from "../dto/create-user.dto";
import { UpdateUserDTO } from "../dto/update-user.dto";
import { LoginUserDTO } from "../dto/login-user.dto";

export class UserController {

    async allUsers(req: Request, res: Response, next: NextFunction) {
        const userService = new UserService();
        try {
            const users = await userService.getAllUsers();
            res.status(200).json(users?.map(user => user.userInfo));
        } catch (error: any) {
            next(error);
        }
    }

    async getUserById(req: Request, res: Response, next: NextFunction) {
        const userService = new UserService();
        const { id } = req.params;
        try {
            const user = await userService.getUserById(Number(id), next);
            res.status(200).json(user?.userInfo);
        } catch (error: any) {
            next(error)
        }
    }

    async getUserByEmail(req: Request, res: Response, next: NextFunction) {
        const userService = new UserService();
        const { email } = req.body;
        try {
            const user = await userService.getUserByEmail(email, next);
            res.status(200).json(user?.userInfo);
        } catch (error: any) {
            next(error)
        }
    }

    async createUser(req: Request, res: Response, next: NextFunction) {
        try {
            const userService = new UserService();
            const createUserDTO: CreateUserDTO = req.body;
            const newUser = await userService.add(createUserDTO);
            if (newUser) {
                res.status(201).json({ user: newUser, message: "User Saved Successfully" });
            }
        } catch (error: any) {
            next(error)
        }
    }

    async updateUser(req: Request, res: Response, next: NextFunction) {
        const userService = new UserService();
        const { id } = req.params;
        const updateUserDetails: UpdateUserDTO = req.body;
        try {
            const user = await userService.updateUserInfo(Number(id), updateUserDetails, next);
            res.status(200).json(user);
        } catch (error: any) {
            next(error)
        }
    }

    async login(req: Request, res: Response, next: NextFunction) {
        const userService = new UserService();
        const loginUserDTO: LoginUserDTO = req.body;
        try {
            console.log(req.body)
            const { user, token } = await userService.login(loginUserDTO, next);

            // Set token in cookie
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 24 * 60 * 60 * 1000 // 1 day
            });

            res.status(200).json({
                user: user.userInfo,
                token: token,
                message: "Logged in successfully"
            });
        }
        catch (error: any) {
            next(error);
        }
    }

    async getCurrentUser(req: Request, res: Response, next: NextFunction) {
        const userService = new UserService();
        // ID comes from authMiddleware
        const userId = (req as any).user?.id;

        try {
            if (!userId) {
                res.status(401).json({ message: "Not authenticated" });
                return;
            }
            const user = await userService.getUserById(userId, next);
            res.status(200).json(user?.userInfo);
        } catch (error: any) {
            next(error);
        }
    }
}