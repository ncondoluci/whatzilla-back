import { Request, Response, NextFunction } from 'express';
import { AppError }     from '../providers/ErrorProvider'; // Import your custom error class
import { sendResponse } from '../utils/customResponse';
import { logger }       from '../utils/logger';

export const globalErrorHandler = (err: AppError, req: Request, res: Response, next: NextFunction) => {
    logger.error(err.message, {
        statusCode: err.statusCode,
        stack: err.stack,
        originalError: err.data
    });

    const statusCode = err.statusCode || 500;
    const isOperational = err.isOperational || false;

    const errorResponse = {
        success: false,
        message: isOperational ? err.message : 'Something went wrong!',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    };

    sendResponse(res, statusCode, errorResponse);
};
