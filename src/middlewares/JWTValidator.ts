import { Request, Response, NextFunction } from "express";
import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from "@/models/User";
import { AppError } from '@/providers/ErrorProvider';

export const JWTValidator = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new AppError({ message: 'No token provided', statusCode: 401 }));
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_PRIVATE_KEY!) as { uid: string };

        const user = await User.findOne({ where: { uid: decoded.uid } });

        if (!user) {
            return next(new AppError({ message: 'Invalid token - user does not exist in DB', statusCode: 401 }));
        }

        req.user = user.JWTuser();

        next();
    } catch (error) {
        return next(new AppError({ message: 'Invalid token', statusCode: 401 }));
    }
};

export const JWTValidatorSocket = async (socket: Socket, next: (err?: Error) => void) => {
  const token = socket.handshake.auth.token || '';

  if (!token) {
    return next(new AppError({ message: 'No token provided', statusCode: 401}));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_PRIVATE_KEY!) as { uid: string };

    const user = await User.findOne({ where: { uid: decoded.uid } });

    if (!user) {
      return next(new AppError({ message:'Invalid token - user does not exist in DB', statusCode: 401 }));
    }

    socket.user = user.JWTuser();

    next(); 
  } catch (error) {
    return next(new AppError({ message: 'Invalid token', statusCode: 401 }));
  }
};
