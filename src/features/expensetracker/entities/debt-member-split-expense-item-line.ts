import { Column, Entity, ForeignKey, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, DeleteDateColumn } from "typeorm";
import { DefaultEntity } from "./default-entity";
import { IsOptional } from "class-validator";
import { Groups } from "./groups";
import { Expense } from "./expense";
import { GroupMember } from "./group-member";
import { ExpenseItemLine } from "./expense-item-line";

@Entity()
export class DebtMemberSplitExpenseItemLine extends DefaultEntity {
    
    @Column({ nullable: true })
    groupId: number;

    @Column()
    groupMemberId: number;

    @Column()
    expenseId: number;

    @Column()
    expenseItemLineId: number;

    // Composite Join for GroupMember
    @ManyToOne(() => GroupMember, { onDelete: 'CASCADE' })
    @JoinColumn([
        { name: "groupId", referencedColumnName: "groupId" },
        { name: "groupMemberId", referencedColumnName: "userId" }
    ])
    groupMember: GroupMember;

    // Composite Join for ExpenseItemLine
    // The 'name' refers to the column in THIS table.
    // The 'referencedColumnName' refers to the PK in the ExpenseItemLine table.
    @ManyToOne(() => ExpenseItemLine,  { onDelete: 'CASCADE' })
    @JoinColumn([
        { name: "expenseItemLineId", referencedColumnName: "id" },
        { name: "expenseId", referencedColumnName: "expenseId" }
    ])
    expenseItemLine: ExpenseItemLine;

    @Column("decimal", { precision: 10, scale: 2 })
    debtAmount: number;

    @DeleteDateColumn()
    deletedAt: Date;
}