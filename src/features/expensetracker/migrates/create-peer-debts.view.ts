import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePeerDebtsView1716200000004 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create the Symmetric Peer Debts View
        await queryRunner.query(`
            CREATE OR REPLACE VIEW simplified_peer_debts AS
            SELECT 
                userId,
                peerId,
                SUM(calc_balance) AS balance,
                groupId,
                MAX(groupName) AS groupName
            FROM (
    -- View from the person who owes (negative balance)
    SELECT 
        ower.groupMemberId AS userId, 
        payer.groupMemberId AS peerId, 
        -ABS(ower.debtAmount) AS calc_balance,
        ower.groupId,
        COALESCE(g.name, 'Non-Group') AS groupName
    FROM debt_member_split_expense_line ower
    JOIN debt_member_split_expense_line payer ON ower.expenseId = payer.expenseId
    LEFT JOIN \`groups\` g ON ower.groupId = g.id
    WHERE ower.debtAmount < 0 AND payer.debtAmount > 0
    UNION ALL
    -- View from the person who is owed (positive balance)
    SELECT 
        payer.groupMemberId AS userId, 
        ower.groupMemberId AS peerId, 
        ABS(ower.debtAmount) AS calc_balance,
        ower.groupId,
        COALESCE(g.name, 'Non-Group') AS groupName
    FROM debt_member_split_expense_line ower
    JOIN debt_member_split_expense_line payer ON ower.expenseId = payer.expenseId
    LEFT JOIN \`groups\` g ON ower.groupId = g.id
    WHERE ower.debtAmount < 0 AND payer.debtAmount > 0
) AS combined
GROUP BY userId, peerId, groupId
HAVING balance != 0;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop the View
        await queryRunner.query(`DROP VIEW simplified_peer_debts`);
    }
}