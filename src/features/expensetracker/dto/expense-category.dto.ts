import { IsArray, IsInt, IsNumber, IsOptional, IsString, } from "class-validator";

export class ExpenseCategoryDTO {

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description: string;

}