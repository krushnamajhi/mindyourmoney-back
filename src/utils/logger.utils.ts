import { createLogger, format, transports } from 'winston';

// Custom format for local development
const customFormat = format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.colorize(), // Adds colors to the console
    format.printf(({ timestamp, level, message, ...metadata }) => {
        let msg = `[${timestamp}] ${level}: ${message}`;
        if (Object.keys(metadata).length > 0) {
            msg += ` ${JSON.stringify(metadata)}`;
        }
        return msg;
    })
);

const logger = createLogger({
    level: 'info', // Default level
    format: format.json(), // Base format for files
    transports: [
        // 1. Log everything to the console with colors
        new transports.Console({
            format: customFormat
        }),
        // 2. Save only errors to error.log
        new transports.File({ 
            filename: 'logs/error.log', 
            level: 'error' 
        }),
        // 3. Save all logs to combined.log
        new transports.File({ 
            filename: 'logs/combined.log' 
        })
    ]
});

export default logger;