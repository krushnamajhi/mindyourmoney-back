import { Column, Entity, ForeignKey, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, DeleteDateColumn } from "typeorm";
import { DefaultEntity } from "./default-entity";
import { IsOptional } from "class-validator";
import { Groups } from "./groups";
import { Expense } from "./expense";
import { GroupMember } from "./group-member";

@Entity()
export class DebtMemberSplitExpenseLine extends DefaultEntity {

    @Column({ nullable: true })
    groupId: number

    @Column()
    groupMemberId: number;

    @Column()
    expenseId : number

    @ManyToOne(() => GroupMember, { onDelete: 'CASCADE' })
    @JoinColumn([
        { name: "groupId", referencedColumnName: "groupId" },
        { name: "groupMemberId", referencedColumnName: "userId" }
    ])
    groupMember: GroupMember

    @ManyToOne(() => Expense)
    @JoinColumn({ name: "expenseId" })
    expense: Expense;

    @Column("decimal", { precision: 10, scale: 2 })
    debtAmount: number

    @DeleteDateColumn()
    deletedAt: Date;
}