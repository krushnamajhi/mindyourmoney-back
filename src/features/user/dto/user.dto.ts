import { IsInt, IsOptional } from "class-validator";
import { UserBaseDTO } from "./user-base.dto";

export class UserDTO extends UserBaseDTO {

        @IsOptional()
        @IsInt({ each: true })
        groupId: number;
}