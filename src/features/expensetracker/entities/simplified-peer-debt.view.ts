import { ViewEntity, ViewColumn } from "typeorm";

@ViewEntity({
    name: "simplified_peer_debts",
    expression: `SELECT * FROM simplified_peer_debts`
})
export class UserBalance {
    @ViewColumn()
    userId: number;

    @ViewColumn()
    peerId: number;

    @ViewColumn()
    balance: number;

    @ViewColumn()
    groupId: number | null;

    @ViewColumn()
    groupName: string;
}