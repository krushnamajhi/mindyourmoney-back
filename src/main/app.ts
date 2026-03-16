import 'dotenv/config';
import express, { Request, Response } from 'express';
import { middlewares } from '../middlewares/errorhandler.middleware';
import { startServer, createConnection, useFeatureRoutes } from './app.util';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app = express();
const PORT = process.env.PORT || 3000;

createConnection();
app.use(cors());
app.use(cookieParser());
useFeatureRoutes(app);
startServer(app)

app.use(middlewares.handleRequestError);

export { app }; 