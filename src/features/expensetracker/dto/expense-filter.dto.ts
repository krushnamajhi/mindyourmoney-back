import { IsArray, IsBoolean, IsDate, IsInt, IsNumber, IsOptional, IsString, } from "class-validator";
import { Filter_ALL, Filter_NONE } from "../../../config/constants";

export type MultiSelectFilter<T> = T[] | typeof Filter_ALL;

export class ExpenseFilterDTO {
    @IsDate()
    startDate: Date;

    @IsDate()
    endDate: Date;

    @IsString()
    @IsOptional()
    title: string;

    @IsString()
    @IsOptional()
    description: string;

    @IsNumber()
    @IsOptional()
    amount: number;

    @IsNumber()
    @IsOptional()
    paidByUserId: MultiSelectFilter<number>;

    @IsOptional()
    @IsInt({ each: true })
    groupId: MultiSelectFilter<number | typeof Filter_NONE>;

    @IsOptional()
    @IsInt({ each: true })
    expenseCategoryId: MultiSelectFilter<number | typeof Filter_NONE>;

    @IsBoolean()
    @IsOptional()
    isShared: MultiSelectFilter<boolean>;

    @IsNumber()
    @IsOptional()
    limit?: number;

}
