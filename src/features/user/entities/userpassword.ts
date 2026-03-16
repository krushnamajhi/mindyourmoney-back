import { ChildEntity, Column, Entity } from "typeorm";
import { UserInfo } from "./user-info";

export class UserPassword {

        @Column({select: false})
        passwordHash: string;
}