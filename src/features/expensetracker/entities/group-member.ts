import { BaseEntity, Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryColumn, PrimaryGeneratedColumn, Unique } from "typeorm";
import { DefaultEntity } from "./default-entity";
import { Groups } from "./groups";
import { User } from "../../user/entities/user";

@Entity("group_members")
@Unique(["groupId", "userId"]) // This ensures the pair is referenceable
export class GroupMember extends DefaultEntity {
    
    @PrimaryColumn()
    groupId: number;

    @PrimaryColumn()
    userId: number;

    @Column({ default: true })
    isActive: boolean;

    @ManyToOne(() => Groups, group => group.groupMembers)
    @JoinColumn({ name: "groupId" })
    group: Groups;

    @ManyToOne(() => User, user => user.userMappings.groupMember)
    @JoinColumn({ name: "userId" })
    user: User;
}
