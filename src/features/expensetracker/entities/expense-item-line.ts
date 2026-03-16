import { Column, Entity, JoinColumn, ManyToOne, DeleteDateColumn } from "typeorm";
import { DefaultEntity } from "./default-entity";
import { Expense } from "./expense";

@Entity()
export class ExpenseItemLine extends DefaultEntity {

    @Column({ nullable: false })
    name: string;

    @Column({ nullable: true })
    description?: string;

    @Column()
    expenseId : number

    @Column("decimal", { precision: 10, scale: 2 })
    amount: number;

    @ManyToOne(() => Expense)
    @JoinColumn({ name: "expenseId" })
    expense: Expense;

    @Column()
    isShared: boolean

    @DeleteDateColumn()
    deletedAt: Date;
}