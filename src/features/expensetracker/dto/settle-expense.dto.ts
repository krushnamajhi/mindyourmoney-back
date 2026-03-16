import { Type } from "class-transformer";
import { IsInt, IsNumber, IsOptional } from "class-validator";

export class SettleExpenseDTO {
    @IsOptional()
    @IsNumber()
    expenseId?: number;

    @IsNumber()
    amount: number;

    @IsNumber()
    paidByUserId: number;

    @IsOptional()
    @IsInt({ each: true })
    groupId: number;

    @IsNumber()
    settledMemberId: number;
}