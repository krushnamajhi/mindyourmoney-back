import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsDate, IsEnum, IsInt, IsNumber, IsOptional, IsString, ValidateNested, } from "class-validator";
import { DebtMemberSplitExpenseItemLineDTO } from "./debt-member-split-expense-item-line.dto";
import { ExpenseItemLineSplitType } from "../lib/split-type.enum";

export class ExpenseItemLineDTO {


    @IsString()
    name: string;

    @IsString()
    @IsOptional()
    description: string;

    @IsNumber()
    amount: number;

    @IsEnum(ExpenseItemLineSplitType)
    @IsOptional()
    splitType : ExpenseItemLineSplitType;

    @IsBoolean()
    @IsOptional()
    isShared : boolean

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => DebtMemberSplitExpenseItemLineDTO)
    debtMemberSplitsExpenseItemLines?: DebtMemberSplitExpenseItemLineDTO[];
}