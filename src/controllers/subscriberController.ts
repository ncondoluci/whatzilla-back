import { NextFunction, Response, Request } from "express";
import { ISubscriber } from "@/interfaces/Subscriber";
import Subscriber from "@/models/Subscriber";
import { sendResponse } from "@/utils/customResponse";
import { AppError } from "@/providers/ErrorProvider";

export const postSubscriber = async ( req: Request, res: Response, next: NextFunction ) => {
    const { first_name, last_name, email, list_id, status = 'confirmed' } = req.body;

    try {
        const subscriber = await Subscriber.create({
            first_name,
            last_name,
            email,
            list_id,
            status
        });

        return sendResponse( res, 201, {
            success: true,
            message: "Subscriber created successfully",
            subscriber
        });

    } catch (error: any) {
        next(new AppError({ message: 'Internal server error.', statusCode: 500, isOperational: false }));
    }
};


export const getSubscriber = async ( req: Request, res: Response, next: NextFunction ) => {
    const { uid } = req.params;

    try {
        const subscriber = await Subscriber.findOne({ where: { uid }});

        if (!subscriber) {
            return next(new AppError({ message: 'Subscriber does not found', statusCode: 404 }));
        }

        return sendResponse( res, 200, {
            success: true,
            message: 'Subscriber found successfully',
            subscriber
        });

    } catch (error) {
        next(new AppError({ message: 'Internal server error.', statusCode: 500, isOperational: false }));
    }
}

export const patchSubscriber = async ( req: Request, res: Response, next: NextFunction ) => {
    const { uid } = req.params;
    const { first_name, last_name, email, status, list_id } = req.body;

    const data: Partial<ISubscriber> = {};

    if (first_name) {
        data.first_name = first_name;
    }
    if (last_name) {
        data.last_name = last_name;
    }
    if (email) {
        data.email = email;
    }
    if (status) {
        data.status = status;
    }
    if (list_id) {
        data.list_id = list_id;
    }

    try {
        const [affectedRows] = await Subscriber.update(data, {
            where: { uid },
        });

        if (affectedRows < 1) {
            return next(new AppError({ message: 'Subscriber does not exist', statusCode: 404 }));
        }

        return sendResponse( res, 200, {
            success: true,
            message: 'Subscriber updated.'
        })
    } catch (error) {
        next(new AppError({ message: 'Internal server error.', statusCode: 500, isOperational: false }));
    }
}

export const deleteSubscriber = async (req: Request, res: Response, next: NextFunction ) => {
    const { uid } = req.params;
  
    try {
      const affectedRows = await Subscriber.destroy({
        where: { uid },
      });
      
      if (affectedRows === 0) {
        return next(new AppError({ message: 'Subscriber not found.', statusCode: 404 }));
      }
  
      return sendResponse( res, 200, {
        success: true,
        message: 'Subscriber deleted successfully.'
      });
  
    } catch (error) {
      next(new AppError({
        message: 'Internal server error.',
        statusCode: 500,
        isOperational: false
      }));
    }
}

