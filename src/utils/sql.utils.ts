import { QueryRunner, DataSource, EntityManager, EntityTarget, Repository, ObjectLiteral } from "typeorm";
import { AppDataSource } from "../config/database";

export class SQLUtils {
    private static dataSource: DataSource = AppDataSource;

    static getRepo<T extends ObjectLiteral>(type: EntityTarget<T>, manager?: EntityManager): Repository<T> {
        // We cast to any or the specific Repository<T> to satisfy strict compiler checks
        return this.getManager(manager).getRepository(type);
    }

    static getManager(manager?: EntityManager): EntityManager {
        if (manager) {
            return manager;
        }
        return this.dataSource.manager;
    }

    static getManagerFromQueryRunner(queryRunner?: QueryRunner): EntityManager {
        if (queryRunner) {
            return queryRunner.manager;
        }
        return this.dataSource.manager;
    }

    static getQueryRunner(queryRunner?: QueryRunner): QueryRunner {
        if (queryRunner) {
            return queryRunner;
        }
        return this.dataSource.createQueryRunner();
    }
    /**
     * Executes logic within a transaction using a QueryRunner.
     * Handles connect, start, commit, rollback, and release automatically.
     */
    static async executeTransaction<T>(
        work: (manager: EntityManager, queryRunner: QueryRunner) => Promise<T>,
        existingQueryRunner?: QueryRunner
    ): Promise<T> {
        // Use existing runner if provided (for nested calls), otherwise create new
        const qr = this.getQueryRunner(existingQueryRunner);
        const isInternal = !existingQueryRunner;

        if (isInternal) {
            await qr.connect();
            await qr.startTransaction();
        }

        try {
            // Execute the business logic passed into the 'work' callback
            const result = await work(qr.manager, qr);

            if (isInternal) {
                await qr.commitTransaction();
            }

            return result;
        } catch (error) {
            if (isInternal) {
                await qr.rollbackTransaction();
            }
            throw error; // Re-throw to be handled by controller/middleware
        } finally {
            if (isInternal) {
                await qr.release();
            }
        }
    }
}