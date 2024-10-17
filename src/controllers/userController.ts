import { NextFunction, Request, Response } from "express";
import User from "@/models/User";
import { AppError } from "@/providers/ErrorProvider";
import { sendResponse } from "@/utils/customResponse";

export const getUser = async (req: Request, res: Response, next: NextFunction) => {
    const { uid } = req.params;

    try {
        const user = await User.findOne({ where: { uid } });
        
        if (!user) {
            return sendResponse(res, 200, {
                success: false,
                message:"User not found."
            });
        }

        const { first_name, last_name, email, status } = user;

        return sendResponse(res, 200, {
            success: true,
            message: "User found.",
            data: {
                uid,
                first_name,
                last_name,
                email,
                status
            }
        });

    } catch (error) {
        next(new AppError({ message: 'Internal server error.', statusCode: 500, isOperational: false, data: error }));
    }
};
