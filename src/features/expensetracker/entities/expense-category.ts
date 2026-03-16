import { BaseEntity, Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, Unique } from "typeorm";
import { User } from "../../user/entities/user";
import { DefaultEntity } from "./default-entity";
import { Expense } from "./expense";
import { IsOptional } from "class-validator";

@Entity()
@Unique(["name", "createdUserId"])
export class ExpenseCategory extends DefaultEntity {

    @Column()
    name: string;

    @Column({ nullable: true })
    createdUserId: number | null;

    @ManyToOne(() => User)
    @JoinColumn({ name: "createdUserId" })
    @IsOptional()
    createdUser: User;

    @Column({ nullable: true })
    description?: string;

    @OneToMany(() => Expense, expense => expense.expenseCategory)
    @IsOptional()
    expenses: Expense[];
}