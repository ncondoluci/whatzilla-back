import winston from 'winston';

const logger = winston.createLogger({
    level: 'info',  // Default log level
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        // Log only errors to error.log file
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        // Log everything (info and errors) to the console
        new winston.transports.Console({ format: winston.format.simple() })
    ],
    exceptionHandlers: [
        // Handle uncaught exceptions and log them
        new winston.transports.File({ filename: 'exceptions.log' })
    ]
});

export { logger };
