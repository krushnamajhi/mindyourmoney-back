import { IsInt, IsOptional, IsString } from "class-validator";
import { UserBaseDTO } from "./user-base.dto";

export class CreateUserDTO extends UserBaseDTO {

        @IsString()
        password: string;
}