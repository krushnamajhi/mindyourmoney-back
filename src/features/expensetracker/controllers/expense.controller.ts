import { NextFunction, RequestHandler } from "express";
import { ExpenseDTO } from "../dto/expense.dto";
import { ExpenseService } from "../services/expense.service";
import { getLoggedInUserId } from "../../../utils/apiUtils";
import { SettleExpenseDTO } from "../dto/settle-expense.dto";
import { ExpenseFilterDTO } from "../dto/expense-filter.dto";
import { NotFoundException } from "../../../lib/custom-errors";

export class ExpenseController {
    private expenseService: ExpenseService
    constructor() {
        this.expenseService = new ExpenseService();
    }

    create: RequestHandler = async (req, res, next: NextFunction) => {
        const ExpenseDTO: ExpenseDTO = req.body;
        try {
            console.log(ExpenseDTO)
            const expense = await this.expenseService.create(ExpenseDTO, getLoggedInUserId(req));
            res.status(201).json(expense);
        } catch (error: any) {
            next(error)
        }
    }

    list: RequestHandler = async (req, res, next: NextFunction) => {
        try {
            const expenses = await this.expenseService.getAll();
            res.json({ expenses });
        } catch (error: any) {
            next(error)
        }
    }

    getById: RequestHandler = async (req, res, next: NextFunction) => {
        const { id } = req.params;
        try {
            const expense = await this.expenseService.getById(Number(id));
            res.json({ expense });
        } catch (error: any) {
            next(error)
        }
    }

    getExpenseDetails: RequestHandler = async (req, res, next: NextFunction) => {
        const { id } = req.params;
        try {
            const data = await this.expenseService.getExpenseDetails(Number(id));
            if (!data) {
                throw new NotFoundException('Expense not found');
            }
            res.status(200).json({ success: true, data });
        } catch (error: any) {
            next(error)
        }
    }

    delete: RequestHandler = async (req, res, next: NextFunction) => {
        const { id } = req.params;
        try {
            const success = await this.expenseService.delete(Number(id));
            res.json({ success });
        } catch (error: any) {
            next(error)
        }
    }

    update: RequestHandler = async (req, res, next: NextFunction) => {
        const { id } = req.params;
        const ExpenseDTO: ExpenseDTO = req.body;
        console.log(ExpenseDTO, "log")
        try {
            const expense = await this.expenseService.update(Number(id), ExpenseDTO);
            res.json({ expense });
        } catch (error: any) {
            next(error)
        }
    }

    getExpenseByFilter: RequestHandler = async (req, res, next: NextFunction) => {
        try {
            const filters: ExpenseFilterDTO = req.body;
            const expenses = await this.expenseService.filterExpenses(filters);
            res.status(200).json({
                status: 'success',
                results: expenses.length,
                data: {
                    expenses
                }
            });

        } catch (error) {
            next(error)
        }
    };

    getDebtAmountForLoggedInUserInExpense: RequestHandler = async (req, res, next: NextFunction) => {
        const { id } = req.params;
        try {
            const data = await this.expenseService.getDebtAmuontForLoggedInUserInExpense(Number(id), getLoggedInUserId(req));
            res.status(200).json(data);
        } catch (error: any) {
            next(error)
        }
    }

    settleExpense: RequestHandler = async (req, res, next: NextFunction) => {
        const expenseDto: SettleExpenseDTO = req.body;
        try {
            const data = await this.expenseService.settleExpense(expenseDto);
            res.status(200).json({ success: true, data });
        } catch (error: any) {
            next(error)
        }
    }

    editSettleExpense: RequestHandler = async (req, res, next: NextFunction) => {
        const expenseDto: SettleExpenseDTO = req.body;
        const { id } = req.params;
        try {
            const data = await this.expenseService.editSettleExpense(Number(id), expenseDto);
            res.status(200).json({ success: true, data });
        } catch (error: any) {
            next(error)
        }
    }

    getSettledExpense: RequestHandler = async (req, res, next: NextFunction) => {
        const { id } = req.params;
        try {
            const data = await this.expenseService.getSettledExpense(Number(id));
            if (!data) {
                res.status(404).json({ success: false, error: 'Settlement expense not found' });
                return;
            }
            res.status(200).json({ success: true, data });
        } catch (error: any) {
            next(error)
        }
    }

    getAllSettledExpense: RequestHandler = async (req, res, next: NextFunction) => {
        try {
            const data = await this.expenseService.getAllSettledExpense();
            console.log(data, "data settelements");
            if (!data) {
                throw new NotFoundException('Settlement expense not found');
            }
            res.status(200).json({ success: true, data });
        } catch (error: any) {
            next(error)
        }
    }
}