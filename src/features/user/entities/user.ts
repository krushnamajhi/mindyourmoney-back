import { BaseEntity, Column, CreateDateColumn, Entity, ManyToMany, PrimaryGeneratedColumn, TableInheritance, UpdateDateColumn } from "typeorm";
import { UserInfo } from "./user-info";
import { UserPassword } from "./userpassword";
import { UserMappings } from "./user-mappings.entity";

@Entity()
export class User extends BaseEntity {

    @Column(() => UserInfo,{prefix :false})
    userInfo: UserInfo

    @Column(() => UserPassword, {prefix :false})
    userPassword: UserPassword

    @Column(() => UserMappings ,{prefix :false})
    userMappings: UserMappings
}