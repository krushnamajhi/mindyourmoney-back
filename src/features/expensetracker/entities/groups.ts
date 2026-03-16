import { Column, Entity, OneToMany } from "typeorm";
import { DefaultEntity } from "./default-entity";
import { Expense } from "./expense";
import { IsOptional } from "class-validator";
import { GroupMember } from "./group-member";

@Entity()
export class Groups extends DefaultEntity {

    @Column()
    name: string;

    @Column({ nullable: true })
    description?: string;

    @OneToMany(() => GroupMember, (gm) => gm.group)
    groupMembers: GroupMember[];

    @OneToMany(() => Expense, expense => expense.group)
    @IsOptional()
    expenses: Expense[];
}