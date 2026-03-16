import { IsNumber, IsString, IsOptional, IsArray, ValidateNested, IsNotEmpty } from 'class-validator';

export class DebtMemberSplitExpenseLineDTO {
    @IsNotEmpty()
    @IsNumber()
    userId: number;

    @IsNotEmpty()
    @IsNumber()
    amount: number;

    @IsOptional()
    @IsNumber()
    percent: number;

    @IsOptional()
    @IsNumber()
    share: number;
}