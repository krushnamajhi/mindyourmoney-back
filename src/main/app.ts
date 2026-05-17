import 'dotenv/config';
import express, { Request, Response } from 'express';
import { middlewares } from '../middlewares/errorhandler.middleware';
import { startServer, createConnection, useFeatureRoutes } from './app.util';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app = express();
const PORT = process.env.PORT || 3000;

createConnection();
app.use(cors({
    origin: (origin, callback) => {
        // Reflect origin back dynamically (critical for cookies/credentials) or default to true
        callback(null, origin || true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposedHeaders: ['Set-Cookie']
}));
app.use(cookieParser());
useFeatureRoutes(app);
startServer(app)

app.use(middlewares.handleRequestError);

export { app }; 