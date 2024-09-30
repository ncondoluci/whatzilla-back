import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationError } from 'express-validator';
import { AppError } from '../providers/ErrorProvider';
import { ICustomValidationError } from '../interfaces/Error';

/**
 * Middleware to handle validation results from express-validator.
 * 
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 * @param {NextFunction} next - The next middleware function to call.
 * @returns {void} If validation errors exist, throws a validation error. Otherwise, it calls next.
 */
export const validationMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const customErrors: ICustomValidationError[] = errors.array().map((err: ValidationError) => ({
            location: err.location || 'unknown',
            field: err.param,
            message: err.msg
        }));

        return next(new AppError({
            message: 'Validation failed',
            statusCode: 400,
            data: { errors: customErrors }
        }));
    }

    next();
};