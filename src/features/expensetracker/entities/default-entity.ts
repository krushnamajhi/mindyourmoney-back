import { BaseEntity, Column, CreateDateColumn, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { User } from "../../user/entities/user";

export abstract class DefaultEntity extends BaseEntity {

    @PrimaryGeneratedColumn()
    id: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @Column({ nullable: true })
    createdByUserId: number;

    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL', eager: false })
    @JoinColumn({ name: 'createdByUserId' })
    createdBy: User;

    @Column({ nullable: true })
    updatedByUserId: number;

    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL', eager: false })
    @JoinColumn({ name: 'updatedByUserId' })
    updatedBy: User;
}