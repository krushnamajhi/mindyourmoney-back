import { Router } from "express";
import { ExpenseCategoryRoutes } from "./expense-catagory.routes";
import { ExpenseRoutes } from "./expense.routes";
import { GroupRoutes } from "./group.routes";
import { UserBalanceRoutes } from "./user-balance.routes";
import { authMiddleware } from "../../../middlewares/auth.middleware";

const expenseTrackerRoutes = Router();
const expTracker = "expense-tracker";
expenseTrackerRoutes.use(`/${expTracker}`, authMiddleware);
expenseTrackerRoutes.use(`/${expTracker}/group`, GroupRoutes());
expenseTrackerRoutes.use(`/${expTracker}/expense-category`, ExpenseCategoryRoutes());
expenseTrackerRoutes.use(`/${expTracker}/expense`, ExpenseRoutes());
expenseTrackerRoutes.use(`/${expTracker}/user-balance`, UserBalanceRoutes());


export { expenseTrackerRoutes };
