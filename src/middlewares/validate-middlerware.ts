import { NextFunction } from "express";
import { Errors } from "../config/constants";
import { ZodError } from "zod";

export const validate = (schema: any) => async (req: any, res: any, next: NextFunction) => {
    try {
        console.log(req.body)
        const parseBody = await schema.parseAsync(req.body);
        req.body = parseBody;
        next();
    }
    catch (error : any) {
        console.log(error)
        next(error);
    }
}