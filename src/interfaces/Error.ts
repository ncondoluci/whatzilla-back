export interface IAppError {
    message: string;
    statusCode: number;
    isOperational?: boolean;
    data?: any;
}

export interface IServiceError {
    message: string;
    statusCode: number;
    service: string;
    isOperational?: boolean;
    data?: any;
}

export interface IJobError {
    message: string;
    jobId: string;
    isOperational?: boolean;
    data?: any;
}

export interface IUnhandledError {
    message: string;
    stack: string;
    context?: string;
}  

/**
 * Custom error format for express-validator errors.
 */
export interface ICustomValidationError {
    location: string;
    field: string;
    message: string;
}