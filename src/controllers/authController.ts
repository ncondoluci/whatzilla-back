import { Request, Response, NextFunction } from "express";
import User from "@/models/User";
import JWTProvider from "@/providers/JWTProvider";
import bcrypt from 'bcryptjs';
import { AppError } from "@/providers/ErrorProvider";
import { sendResponse } from "@/utils/customResponse";

export const authController = async ( req: Request, res: Response, next: NextFunction ) => {
    const { email, password } = req.body;
  
    try {
      const user = await User.findOne({
        where: { email }
      });
      
      if ( !user ) {
        return next( new AppError({ message: `User with email ${ email } does not exist.`, statusCode: 404 }));
      }
      
      if ( !user.status ) {
        return next( new AppError({ message: 'User is not active.', statusCode: 400 }));
      }
      
      const auth = bcrypt.compareSync( password, user.password );
      
      if (!auth) {
        return next( new AppError({ message: 'Incorrect password.', statusCode: 400 }));
      }
      
      const token = await JWTProvider( user.uid );
      
      return sendResponse( res, 200, { 
        success: true,
        message: 'Loged in.',
        token 
      });
  
    } catch ( error ) {
      console.error(error); 
      next( new AppError({ message: 'Internal server error', statusCode: 500, isOperational: false, data: error }));
    }
};

export const registrationController = async ( req: Request, res: Response, next: NextFunction ) => {
    const { first_name, last_name, email, password } = req.body;
  
    try {
      const salt = await bcrypt.genSalt( 10 );
      const passwordHash = await bcrypt.hash( password, salt );
      
      let user = await User.create({ first_name, last_name, email, password: passwordHash });
      
      return sendResponse(res, 201, {
        success: true,
        message: 'User registered successfully',
        user
      })
    } catch ( error ) {
      next( new AppError({ message: 'Error creating user.', statusCode: 500, isOperational: false, data: error }));
    }
};
