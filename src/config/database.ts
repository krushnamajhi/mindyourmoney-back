import { DataSource } from "typeorm";
import "dotenv/config";

const databaseUrl = process.env.DB_URL || process.env.DB_URL;

if (!databaseUrl) {
    throw new Error("DB_URL or DATABASE_URL is not defined");
}

if (!process.env.DB_TYPE) {
    throw new Error("DB_TYPE is not defined");
}

// Detect whether we're running from compiled dist/ or via ts-node/ts-node-dev
const isCompiled = __filename.endsWith('.js');
const srcRoot = isCompiled ? 'dist' : 'src';
const ext = isCompiled ? 'js' : 'ts';

export const AppDataSource = new DataSource({
    type: process.env.DB_TYPE as any,
    url: databaseUrl,
    synchronize: true,
    logging: true,
    connectTimeout: 30000,
    ssl: process.env.DB_TYPE === 'postgres' ? { rejectUnauthorized: false } : undefined,
    entities: [
        `./${srcRoot}/features/**/entities/*.${ext}`
    ],
    subscribers: [
        `./${srcRoot}/subscribers/*.${ext}`
    ],
    migrations: [
        `./${srcRoot}/features/**/migrates/*.${ext}`
    ]
});
