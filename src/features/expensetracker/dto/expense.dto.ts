import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsDate, IsEnum, IsInt, IsNumber, IsOptional, IsString, ValidateNested, } from "class-validator";
import { DebtMemberSplitExpenseLineDTO } from "./debt-member-split-expense-line.dto";
import { ExpenseSplitType } from "../lib/split-type.enum";
import { ExpenseItemLineDTO } from "./expense-item-line.dto";

export class ExpenseDTO {

    @IsDate()
    expenseDate: Date;

    @IsString()
    title: string;

    @IsString()
    @IsOptional()
    description: string;

    @IsNumber()
    amount: number;

    @IsNumber()
    paidByUserId: number;

    @IsOptional()
    @IsInt({ each: true })
    groupId: number;

    @IsOptional()
    @IsInt({ each: true })
    expenseCategoryId: number;

    @IsEnum(ExpenseSplitType)
    @IsOptional()
    splitType: ExpenseSplitType;

    @IsBoolean()
    @IsOptional()
    isShared: boolean

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => DebtMemberSplitExpenseLineDTO)
    debtMemberSplits?: DebtMemberSplitExpenseLineDTO[];

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ExpenseItemLineDTO)
    expenseItemLines?: ExpenseItemLineDTO[];
}