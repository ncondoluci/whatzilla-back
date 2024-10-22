import WhatsAppSession from "@/models/WhatsAppSession";
import { AppError } from "@/providers/ErrorProvider";
import { sendResponse } from "@/utils/customResponse";
import { NextFunction, Request, Response } from "express";

export const patchSession = async (req: Request, res: Response, next: NextFunction) => {
    const { uid } = req.params;
    const data = req.body;

    try {
        const session = await WhatsAppSession.update(data, {
            where: { uid },
            returning: true 
        });

        if (!session) {
            return sendResponse(res, 200, {
                success: false,
                message: "Session not found",
            });
        }

        return sendResponse(res, 200, {
            success: true,
            message: 'Session updated successfully.',
            session
        });

    } catch (error) {
        next(new AppError({ 
            message: 'An error occurred in patchSession controller', 
            statusCode: 500, 
            isOperational: false, 
            data: error 
        }));
    }
};
