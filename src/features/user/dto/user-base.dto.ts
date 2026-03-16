import { IsString, } from "class-validator";

export class UserBaseDTO {

    @IsString()
    email: string;

    @IsString()
    firstName: string;

    @IsString()
    lastName: string;

    @IsString()
    fullName: string;

}