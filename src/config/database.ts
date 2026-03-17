import { DataSource } from "typeorm";


if (!process.env.DB_URL) {
    throw new Error("DATABASE_URL is not defined");
}

if (!process.env.DB_TYPE) {
    throw new Error("DB_TYPE is not defined");
}

export const AppDataSource = new DataSource({
    type: process.env.DB_TYPE as any,
    url: process.env.DB_URL,
    // host: "localhost",
    // port: 3306,
    // username: "root",
    // password: "root123",
    // database: "mymdb",
    synchronize: false,
    logging: true,
    connectTimeout: 10000,
    entities: [
        "./src/features/**/entities/*.ts"
    ],
    subscribers: [
        "./src/subscribers/*.ts"
    ],
    migrations: [
        "./src/features/**/migrates/*.ts"
    ]
});