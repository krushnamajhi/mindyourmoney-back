import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsActiveToGroupMembers1760100000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE group_members
            ADD COLUMN isActive TINYINT(1) NOT NULL DEFAULT 1
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE group_members
            DROP COLUMN isActive
        `);
    }
}
