import { IsNumber } from "class-validator";
import { GroupDTO } from "./group.dto";
import { Groups } from "../entities/groups";

export class GroupWithBalanceDTO extends Groups {

    @IsNumber()
    balance: number;
}