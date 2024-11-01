import path from "path";
import { Request, Response, NextFunction } from "express";
import { AppError } from "@/providers/ErrorProvider";
import { UploadedFile } from "express-fileupload";

export const fileValidator = (req: Request, res: Response, next: NextFunction) => {
    if (!req.files || !req.files.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = Array.isArray(req.files.file) ? req.files.file[0] : req.files.file as UploadedFile;

    if (file.size > 50 * 1024 * 1024) {
        return next(new AppError({ message: 'File is too large. Max size is 50MB.', statusCode: 400 }));
    }

    const allowedExtensions = ['.csv', '.xlsx'];
    const fileExtension = path.extname(file.name);
    if (!allowedExtensions.includes(fileExtension)) {
        return next(new AppError({ message: 'Invalid file type. Only csv, xlsx allowed.', statusCode: 400 }));
    }

    next();
};
