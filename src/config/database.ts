import { DataSource } from "typeorm";

export const AppDataSource = new DataSource({
    type: "mysql",
    host: "localhost",
    port: 3306,
    username: "root",
    password: "root123",
    database: "mymdb",
    synchronize: true,
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
