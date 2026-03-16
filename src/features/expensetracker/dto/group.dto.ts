import { IsArray, IsInt, IsNumber, IsOptional, IsString, } from "class-validator";
import { Groups } from "../entities/groups";

export class GroupDTO {

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description: string;

  @IsArray()
  @IsOptional()
  @IsInt({ each: true }) // Ensures each item in the array is an integer ID
  groupMemberIds: number[];
}