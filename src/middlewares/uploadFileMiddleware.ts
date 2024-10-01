import path from "path";
import { AppError } from "@/providers/ErrorProvider";

export const fileValidator = (req: Request, res: Response, next: NextFunction) => {
    if (!req.files || !req.files.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.files.file;

    if (file.size > 50 * 1024 * 1024) { // Max file size 50MB
        return next(new AppError({ message: 'File is too large. Max size is 5MB.', statusCode: 400 }));
    }

    const allowedExtensions = ['.csv', '.xlsx'];
    const fileExtension = path.extname(file.name);
    if (!allowedExtensions.includes(fileExtension)) {
        return next(new AppError({ message: 'Invalid file type. Only csv, xlsx allowed.', statusCode: 400 }));
    }

    next();
};
