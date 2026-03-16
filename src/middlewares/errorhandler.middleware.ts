import { APIError, NotFoundException, ServerException, ValidationError } from "../lib/custom-errors";
import { Errors } from "../config/constants";
import { NextFunction } from "express";
import { ZodError } from "zod";
import logger from "../utils/logger.utils";

export const middlewares = {
    handleRequestError(err: any, req: any, res: any, next: NextFunction) {
        logger.error("Error Encountered :", err, "Request : ", req, "Response : ", res)
        switch (true) {
            case (err instanceof NotFoundException):
                res.status(Errors.NotFound.StatusCode).json({
                    success: false, error: Errors.NotFound.StatusMessage, statusCode: Errors.NotFound.StatusCode
                });
                break;
            case (err instanceof ServerException):
                res.status(Errors.InternalServerError.StatusCode).json({
                    success: false, error: Errors.InternalServerError.StatusMessage, statusCode: Errors.InternalServerError.StatusCode, errors: [Errors.InternalServerError.StatusMessage]
                });
                break;
            case (err instanceof APIError):
                res.status(Errors.APIError.StatusCode).json({
                    success: false, error: Errors.APIError.StatusMessage, statusCode: Errors.APIError.StatusCode, errors: [err.message]
                });
                break;
            case (err instanceof ZodError):
                const errors: any[] = JSON.parse(err.message)
                const parsedErrors = errors.map(({ path, message }) => ({ path: path.join("."), message }));
                res.status(Errors.ZodError.StatusCode).json({
                    success: false, error: Errors.ZodError.StatusMessage, statusCode: Errors.ZodError.StatusCode, errors: parsedErrors
                })
                break;
            case (err instanceof ValidationError):
                res.status(err.ErrorId).json({
                    success: false, error: Errors.ValidationError.StatusMessage, statusCode: err.ErrorId, errors: [err.message]
                });
                break;
            default:
                res.status(Errors.InternalServerError.StatusCode).json({
                    success: false, error: Errors.InternalServerError.StatusMessage, statusCode: Errors.InternalServerError.StatusCode, errors: [Errors.InternalServerError.StatusMessage]
                });
        }
    }
}