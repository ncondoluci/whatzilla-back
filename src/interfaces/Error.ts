export interface IAppError {
    message: string;
    statusCode: number;
    isOperational?: boolean;
    data?: any;
}

/**
 * Custom error format for express-validator errors.
 */
export interface ICustomValidationError {
    location: string;
    field: string;
    message: string;
}