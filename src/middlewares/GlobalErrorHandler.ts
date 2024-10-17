import { Request, Response, NextFunction } from 'express';
import { AppError }     from '@/providers/ErrorProvider';
import { sendResponse } from '@/utils/customResponse';
import { logger }       from '@/config/logger';

export const globalErrorHandler = (err: AppError, req: Request, res: Response, next: NextFunction) => {
    const statusCode = err.statusCode || 500;
    const isOperational = err.isOperational || false;

    logger.error(err.message, {
        statusCode,
        isOperational,
        stack: err.stack,
        originalError: err.data,
        method: req.method,
        url: req.url,
        params: req.params,
        query: req.query,
        body: req.body
    });

    const errorResponse = {
        success: false,
        message: isOperational ? err.message : 'Something went wrong!',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    };

    sendResponse(res, statusCode, errorResponse);
};