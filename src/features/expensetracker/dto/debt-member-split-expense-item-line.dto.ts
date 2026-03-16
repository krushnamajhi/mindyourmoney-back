import { IsNumber, IsOptional, IsNotEmpty } from 'class-validator';

export class DebtMemberSplitExpenseItemLineDTO {
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