import { AppDataSource } from "../config/database";
import express, { Request, Response } from 'express';
import { expenseTrackerRoutes } from "../features/expensetracker/routes";
import { userRoutes } from "../features/user/routes";

export const createConnection = async () => {
    try {
        await AppDataSource.initialize();
        console.log('Database connection established successfully.');
        // Start your application (e.g., Express server)
    } catch (err) {
        console.error('Database connection error:', err);
        process.exit(1);
    }
};

export const useFeatureRoutes = (app: any) => {
    //featuere APIs
    app.use(express.json());
    app.use('/', expenseTrackerRoutes);
    app.use('/', userRoutes);

}

export const startServer = (app: any) => {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, '192.168.1.15', () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}