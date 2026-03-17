import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsDate, IsEnum, IsInt, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";
import { DebtMemberSplitExpenseLineDTO } from "./debt-member-split-expense-line.dto";


export class ExpenseRowDayWiseDTO {
    @IsInt()
    day: number;
    expensesPerDay: ExpenseRowDTO[];
}

export class ExpenseRowMonthWiseDTO {
    @IsInt()
    month: number;
    expensesPerMonth: ExpenseRowDTO[];
}

export class ExpenseRowYearWiseDTO {
    @IsInt()
    year: number;
    expensesPerYear: ExpenseRowDTO[];
}

export class ExpenseRowDTO {

    @IsInt()
    id: number;

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

    @IsBoolean()
    @IsOptional()
    isShared: boolean

    @IsNumber()
    balance: number;
}