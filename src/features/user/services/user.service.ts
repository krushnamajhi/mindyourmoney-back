import { NextFunction } from "express";
import { AppDataSource } from "../../../config/database";
import { APIError, ValidationError } from "../../../lib/custom-errors";
import { UserInfo } from "../entities/user-info";
import { User } from "../entities/user";
import { CreateUserDTO } from "../dto/create-user.dto";
import { UpdateUserDTO } from "../dto/update-user.dto";
import { UserPassword } from "../entities/userpassword";
import { UserMappings } from "../entities/user-mappings.entity";
import { LoginUserDTO } from "../dto/login-user.dto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Like } from "typeorm";

export class UserService {

    private userRepo = AppDataSource.getRepository(User);


    async getUserById(id: number, next: NextFunction): Promise<User | null> {
        try {
            return await this.userRepo.findOneByOrFail({ userInfo: { id: id } });
        }
        catch (err: any) {
            throw new Error(err);
        }
    }

    async getUserByEmail(email: string, next: NextFunction): Promise<User | null> {
        try {
            return await this.userRepo.findOneByOrFail({ userInfo: { email: email } });
        }
        catch (err: any) {
            throw new Error(err);
        }
    }

async searchUser(searchedValue: string): Promise<UserInfo[]> {
    try {
        // We use an array of objects in 'where' to create an OR condition
        const users =  await this.userRepo.find({
            where: [
                { userInfo: { email: Like(`%${searchedValue}%`) } },
                { userInfo: { fullName: Like(`%${searchedValue}%`) } },
            ],
            relations: ['userInfo'] // Ensure the relation is loaded
        });

        return users.map(user => user.userInfo);
    } catch (err: any) {
        // Better to log the error and throw a custom ValidationError or a generic message
        throw new APIError(`User search failed: ${err.message}`);
    }
}


    async add(userDto: CreateUserDTO): Promise<User> {
        try {
            await this.isEmailExists(userDto.email);
            const user = new User();
            user.userInfo = new UserInfo();
            user.userInfo.firstName = userDto.firstName;
            user.userInfo.lastName = userDto.lastName;
            user.userInfo.email = userDto.email;

            user.userPassword = new UserPassword();
            // Hash password
            const salt = await bcrypt.genSalt(10);
            user.userPassword.passwordHash = await bcrypt.hash(userDto.password, salt);

            user.userMappings = new UserMappings();
            const userRepo = AppDataSource.getRepository(User);
            return await userRepo.save(user);
        }
        catch (err: any) {
            return Promise.reject(new ValidationError(err.message || 'Error creating user'))
        }
    }

    async getAllUsers(): Promise<User[] | null> {
        try {
            return await this.userRepo.find();
        }
        catch (err: any) {
            return Promise.reject(new ValidationError('User not Exists'))
        }
    }

    async updateUserInfo(id: number, updatedUserDetails: UpdateUserDTO, next: NextFunction): Promise<User> {
        const userInfo = await this.getUserById(id, next);
        try {
            if (!userInfo)
                throw new Error("User doesn't Exists");
            const { email } = updatedUserDetails;
            console.log(userInfo.userInfo.email, updatedUserDetails)
            if (email && userInfo.userInfo.email != email) this.isEmailExists(email);
            Object.assign(userInfo.userInfo, updatedUserDetails);
            return await this.userRepo.save(userInfo);
        }
        catch (err: any) {
            return Promise.reject(new ValidationError(err.message))
        }
    }

    async login(credentials: LoginUserDTO, next: NextFunction): Promise<{ user: User, token: string }> {
        try {
            const user = await this.userRepo.findOne({
                where: {
                    userInfo: {
                        email: credentials.email
                    }
                },
                select: {
                    userPassword: {
                        passwordHash: true
                    },
                    userInfo: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                }
            })
            console.log(user)

            if (!user) throw new Error("Invalid email or password");

            const isMatch = await bcrypt.compare(credentials.password, user.userPassword.passwordHash);
            if (!isMatch) throw new Error("Invalid email or password");

            const token = jwt.sign(
                { id: user.userInfo.id, email: user.userInfo.email },
                (process.env.JWT_SECRET as string) || 'secret',
                { expiresIn: '1d' }
            );

            return { user, token };
        }
        catch (err: any) {
            return Promise.reject(new ValidationError(err.message))
        }
    }

    async isEmailExists(email: string) {
        const exists = await this.userRepo.exists({
            where: { userInfo: { email: email } }
        });
        if (exists)
            throw new ValidationError("Email Already Exists");
    }

    getFullName(firstName: string, lastName: string) {
        return firstName + " " + lastName;
    }
}