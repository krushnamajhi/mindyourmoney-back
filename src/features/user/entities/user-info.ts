import { BaseEntity, BeforeInsert, BeforeUpdate, Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";

export class UserInfo extends BaseEntity {

    @PrimaryGeneratedColumn()
    id: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @Column({unique: true})
    email: string;

    @Column()
    firstName: string;

    @Column()
    lastName: string;

    @Column()
    fullName: string;

    @BeforeInsert()
    @BeforeUpdate()
    updateFullName() {
        // We trim and combine to prevent extra spaces if names are empty
        this.fullName = `${this.firstName || ""} ${this.lastName || ""}`.trim();
    }
}