import { NextFunction, RequestHandler } from "express";
import { ExpenseCategoryDTO } from "../dto/expense-category.dto";
import { ExpenseCategoryService } from "../services/expense-catagory.service";
import { getLoggedInUserId } from "../../../utils/apiUtils";

export class ExpenseCategoryController {
    private expenseCategoryService: ExpenseCategoryService
    constructor() {
        this.expenseCategoryService = new ExpenseCategoryService();
    }

    create: RequestHandler = async (req, res, next: NextFunction) => {
        const expenseCategoryDTO: ExpenseCategoryDTO = req.body;
        const userId = getLoggedInUserId(req);
        try {
            const category = await this.expenseCategoryService.create(expenseCategoryDTO, userId);
            res.status(200).json(category);
        } catch (error: any) {
            next(error)
        }
    }

    list: RequestHandler = async (req, res, next: NextFunction) => {
        const userId = getLoggedInUserId(req);
        try {
            const categories = await this.expenseCategoryService.getAll(userId);
            res.json(categories);
        } catch (error: any) {
            next(error)
        }
    }

    getById: RequestHandler = async (req, res, next: NextFunction) => {
        const { id } = req.params;
        try {
            const category = await this.expenseCategoryService.getById(Number(id));
            // Note: getById doesn't strictly check ownership yet, but list does. 
            // In a production app, we should verify visibility here too.
            res.json(category);
        } catch (error: any) {
            next(error)
        }
    }

    delete: RequestHandler = async (req, res, next: NextFunction) => {
        const { id } = req.params;
        const userId = getLoggedInUserId(req);
        try {
            const success = await this.expenseCategoryService.delete(Number(id), userId);
            res.json({ success });
        } catch (error: any) {
            next(error)
        }
    }

    update: RequestHandler = async (req, res, next: NextFunction) => {
        const { id } = req.params;
        const expenseCategoryDTO: ExpenseCategoryDTO = req.body;
        const userId = getLoggedInUserId(req);
        try {
            const category = await this.expenseCategoryService.update(Number(id), expenseCategoryDTO, userId);
            res.json(category);
        } catch (error: any) {
            next(error)
        }
    }
}