import { EntityManager, In, IsNull, QueryRunner } from "typeorm";
import { ExpenseCategoryDTO } from "../dto/expense-category.dto";
import { ExpenseCategory } from "../entities/expense-category";
import { ValidationError } from "../../../lib/custom-errors";
import { SQLUtils } from "../../../utils/sql.utils";

export class ExpenseCategoryService {

    /**
     * Creates a new expense category with uniqueness check.
     */
    async create(expenseCategoryDTO: ExpenseCategoryDTO, createdUserId: number, queryRunner?: QueryRunner): Promise<ExpenseCategory> {
        return await SQLUtils.executeTransaction(async (manager: EntityManager) => {
            const { ...details } = expenseCategoryDTO;

            // 1. Uniqueness check for this user
            const repo = SQLUtils.getRepo(ExpenseCategory, manager);
            const existingCount = await repo.count({
                where: { name: details.name, createdUserId: createdUserId }
            });

            if (existingCount > 0) {
                throw new ValidationError(
                    `Expense Category with name "${details.name}" already exists for you`,
                );
            }

            const category = manager.create(ExpenseCategory, { ...details, createdUserId });

            return await manager.save(category);
        }, queryRunner);
    }

    /**
     * Fetches all categories accessible to the user (shared + own).
     */
    async getAll(createdUserId: number, transactionalManager?: EntityManager): Promise<ExpenseCategory[]> {
        return await SQLUtils.getRepo(ExpenseCategory, transactionalManager).find({
            where: [
                { createdUserId: IsNull() },
                { createdUserId: createdUserId }
            ]
        });
    }

    /**
     * Fetches a category by ID.
     */
    async getById(id: number, transactionalManager?: EntityManager): Promise<ExpenseCategory | null> {
        return await SQLUtils.getRepo(ExpenseCategory, transactionalManager).findOne({
            where: { id: id as any }
        });
    }

    /**
     * Updates a category, checking for name conflicts and ownership.
     */
    async update(id: number, expenseCategoryDTO: ExpenseCategoryDTO, createdUserId: number, queryRunner?: QueryRunner): Promise<ExpenseCategory | null> {
        return await SQLUtils.executeTransaction(async (manager: EntityManager) => {
            const { ...details } = expenseCategoryDTO;

            const category = await this.getById(id, manager);
            if (!category) return null;

            // Ownership check
            if (category.createdUserId === null) {
                throw new ValidationError("Shared categories cannot be updated");
            }
            if (category.createdUserId !== createdUserId) {
                throw new ValidationError("You do not have permission to update this category");
            }

            // 1. Uniqueness check if name is being updated
            if (details.name && category.name !== details.name) {
                const repo = SQLUtils.getRepo(ExpenseCategory, manager);
                const count = await repo.count({ where: { name: details.name, createdUserId } });
                if (count > 0) {
                    throw new ValidationError(`Name "${details.name}" already exists for you`);
                }
            }

            // 2. Update properties
            Object.assign(category, details);

            return await manager.save(category);
        }, queryRunner);
    }

    /**
     * Deletes a category if owned by the user.
     */
    async delete(id: number, createdUserId: number, queryRunner?: QueryRunner): Promise<boolean> {
        return await SQLUtils.executeTransaction(async (manager: EntityManager) => {
            const category = await this.getById(id, manager);
            if (!category) return false;

            if (category.createdUserId === null) {
                throw new ValidationError("Shared categories cannot be deleted");
            }
            if (category.createdUserId !== createdUserId) {
                throw new ValidationError("You do not have permission to delete this category");
            }

            const result = await manager.delete(ExpenseCategory, id);
            return !!(result.affected && result.affected > 0);
        }, queryRunner);
    }
}