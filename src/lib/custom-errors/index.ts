import { Errors } from "../../config/constants";

export const BadRequestException = class BadRequestException extends Error { };
export const NotFoundException = class NotFoundException extends Error {};
export const ServerException = class ServerException extends Error {};
export const APIError = class APIError extends Error {
    public ErrorId: any;
    public code: any;
    constructor(message: string, code = null){
        super();
        Error.captureStackTrace(this, this.constructor);
        this.name = Errors.APIError.StatusMessage;
        this.message = message;
        this.ErrorId = Errors.APIError.StatusCode;
        if(code) this.code = code;
    }
}
export const ValidationError = class ValidationError extends Error {
    public ErrorId: any;
    public code: any;
    constructor(message: string, code = null){
        super();
        Error.captureStackTrace(this, this.constructor);
        this.name = Errors.ValidationError.StatusMessage;
        this.message = message;
        this.ErrorId = Errors.ValidationError.StatusCode;
        if(code) this.code = code;
    }
}