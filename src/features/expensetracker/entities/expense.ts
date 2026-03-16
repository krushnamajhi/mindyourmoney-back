import { Column, Entity, ManyToOne, OneToMany, DeleteDateColumn } from "typeorm";
import { DefaultEntity } from "./default-entity";
import { Groups } from "./groups";
import { IsOptional } from "class-validator";
import { ExpenseCategory } from "./expense-category";
import { User } from "../../user/entities/user";
import { ExpenseItemLine } from "./expense-item-line";

@Entity()
export class Expense extends DefaultEntity {

    @Column({ type: 'date', nullable: false })
    expenseDate: Date;

    @Column()
    title: string;

    @Column({ nullable: true })
    description?: string;

    @Column("decimal", { precision: 10, scale: 2 })
    amount: number;

    @ManyToOne(() => Groups, group => group.expenses)
    @IsOptional()
    group: Groups;

    @ManyToOne(() => ExpenseCategory, expenseCategory => expenseCategory.expenses)
    @IsOptional()
    expenseCategory: ExpenseCategory;

    @ManyToOne(() => User, user => user.userMappings.expenses)
    paidByUser: User

    @ManyToOne(() => User, user => user.userMappings.debts)
    paidToUser: User

    @Column()
    isShared: boolean

    @Column({ nullable: true })
    isSettled: boolean

    @DeleteDateColumn()
    deletedAt: Date;
}