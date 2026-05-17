import 'dotenv/config';
import express, { Request, Response } from 'express';
import { middlewares } from '../middlewares/errorhandler.middleware';
import { startServer, createConnection, useFeatureRoutes } from './app.util';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app = express();

const startApp = async () => {
    // Await database connection before accepting traffic
    await createConnection();

    app.use(cors());
    app.use(cookieParser());
    useFeatureRoutes(app);
    startServer(app);

    app.use(middlewares.handleRequestError);
};

startApp().catch((err) => {
    console.error("Failed to start application:", err);
    process.exit(1);
});

export { app }; 