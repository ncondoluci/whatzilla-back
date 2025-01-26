import List from "@/models/List";
import { AppError } from "@/providers/ErrorProvider";
import { sendResponse } from "@/utils/customResponse";
import { Request, Response, NextFunction } from "express";

export const postList = async ( req: Request, res: Response, next: NextFunction ) => {
    const { uid: user_id } = req.user as { uid: string };
    const { name } = req.body;

    try {
        const list = await List.create({ name, user_id });

        return sendResponse( res, 201, {
            success: true,
            message: 'List created successfully.',
            list
        });

    } catch (error) {
        next(new AppError({ message: 'Internal server error.', statusCode: 500, isOperational: false, data: error }));
    }
}

export const getList = async (req: Request, res: Response, next: NextFunction) => {
    const { uid } = req.params;
    
    try {
        const list = await List.findOne({ where: { uid } });

        if (!list) {
            return sendResponse(res, 200, {
                success: false,
                message: 'List not found.',
                list: null
            });
        }

        return sendResponse( res, 200, {
            success: true,
            message: 'List found.',
            list
        });

    } catch (error) {
        next(new AppError({ message: 'Internal server error.', statusCode: 500, isOperational: false, data: error }));
    }
}

export const patchList = async (req: Request, res: Response, next: NextFunction) => {
    const { uid } = req.params;
    const { name, status } = req.body;

    const data: any = {};

    if (name) {
        data.name = name;
    }
    if (status) {
        data.status = status;
    }

    try {
        const [ affectedRows ] = await List.update( data , { where: { uid }} );

        if (affectedRows < 1) {
            return sendResponse(res, 200, {
                success: false,
                message: 'Update failed - list not found.',
            });
        }

        return sendResponse( res, 200, {
            success: true,
            message: 'List updated successfully.',
        });

    } catch (error) {
        next(new AppError({ message: 'Internal server error.', statusCode: 500, isOperational: false, data: error }));
    }
}

export const deleteList = async (req: Request, res: Response, next: NextFunction) => {
    const { uid } = req.params;

    try {
        const affectedRows = await List.destroy({ where: { uid }});

        if (affectedRows === 0) {
            return sendResponse(res, 200, {
                success: false,
                message: 'Delete failed - list not found.'
            });
        }

        return sendResponse(res, 200, {
            success: true,
            message: 'List deleted successfully.'
        });

    } catch (error) {
        next(new AppError({ message: 'Internal server error.', statusCode: 500, isOperational: false, data: error }));
    }
}
