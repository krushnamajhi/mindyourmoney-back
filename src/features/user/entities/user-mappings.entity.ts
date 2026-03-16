import { BaseEntity, Column, CreateDateColumn, Entity, ManyToMany, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Groups } from "../../expensetracker/entities/groups";
import { IsOptional } from "class-validator";
import { Expense } from "../../expensetracker/entities/expense";
import { GroupMember } from "../../expensetracker/entities/group-member";

export class UserMappings {

    @ManyToMany(() => Groups, group => group.groupMembers)
    @IsOptional()
    groups: Groups[];

    @OneToMany(() => GroupMember, (gm) => gm.user)
    @IsOptional()
    groupMember: GroupMember[];
    
    @OneToMany(() => Expense, expense => expense.paidByUser)
    @IsOptional()
    expenses : Expense[]

    @OneToMany(() => Expense, expense => expense.paidToUser)
    @IsOptional()
    debts : Expense[]
}