import { IAppError } from "../interfaces/Error";

class AppError extends Error {
    public statusCode: number;
    public isOperational: boolean;
    public data?: any;

    constructor({ message, statusCode, isOperational = true, data }: IAppError) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.data = data;
        Error.captureStackTrace(this, this.constructor);
    }
}

export { AppError, IAppError };
