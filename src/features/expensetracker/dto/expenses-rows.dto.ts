import { Type } from "class-transformer";
import { IsBoolean, IsDate, IsInt, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";


export class ExpenseRowDayWiseDTO {
    @IsInt()
    day: number;

    @ValidateNested({ each: true })
    @Type(() => ExpenseRowDTO)
    expensesPerDay: ExpenseRowDTO[];
}

export class ExpenseRowMonthWiseDTO {
    @IsString()
    month: string;

    @ValidateNested({ each: true })
    @Type(() => ExpenseRowDayWiseDTO)
    expensesPerMonth: ExpenseRowDayWiseDTO[];
}

export class ExpenseRowYearWiseDTO {
    @IsInt()
    year: number;

    @ValidateNested({ each: true })
    @Type(() => ExpenseRowMonthWiseDTO)
    expensesPerYear: ExpenseRowMonthWiseDTO[];
}

export class ExpenseRowUserDTO {
    @IsInt()
    id: number;

    @IsString()
    fullName: string;
}

export class ExpenseRowPaidToUserDTO {
    @IsInt()
    id: number;

    @IsString()
    fullName: string;
}

export class ExpenseRowGroupDTO {
    @IsInt()
    id: number;

    @IsString()
    name: string;
}

export class ExpenseRowCategoryDTO {
    @IsInt()
    id: number;

    @IsString()
    name: string;
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
    description?: string;

    @IsNumber()
    amount: number;

    @ValidateNested()
    @Type(() => ExpenseRowUserDTO)
    paidByUser: ExpenseRowUserDTO;

    @IsOptional()
    @ValidateNested()
    @Type(() => ExpenseRowPaidToUserDTO)
    paidToUser?: ExpenseRowPaidToUserDTO;

    @IsOptional()
    @ValidateNested()
    @Type(() => ExpenseRowGroupDTO)
    group?: ExpenseRowGroupDTO;

    @IsOptional()
    @ValidateNested()
    @Type(() => ExpenseRowCategoryDTO)
    expenseCategory?: ExpenseRowCategoryDTO;

    @IsBoolean()
    @IsOptional()
    isShared?: boolean

    @IsBoolean()
    @IsOptional()
    isSettled?: boolean

    @IsNumber()
    balance: number;
}
