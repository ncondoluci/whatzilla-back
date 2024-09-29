import { Request, Response, NextFunction } from "express";
import User from "@/models/User";
import JWTProvider from "@/providers/JWTProvider";
import bcrypt from 'bcryptjs';
import { AppError } from "@/providers/ErrorProvider";

export const authController = async ( req: Request, res: Response, next: NextFunction ) => {
    const { email, password } = req.body;
  
    try {
      const user = await User.findOne( email );
      
      if ( !user ) {
        return next( new AppError( `User with email ${ email } does not exist.`, 404 ) );
      }
      
      if ( !user.status ) {
        return next( new AppError( 'User is not active.', 400 ) );
      }
      
      const auth = bcrypt.compareSync( password, user.password );
      
      if (!auth) {
        return next( new AppError( 'Incorrect password.', 400 ) );
      }
      
      const token = await JWTProvider( user.uid );
      
      res.status( 200 ).json({
        user,
        token,
      });
  
    } catch ( error ) {
      next( new AppError( 'Internal server error', 500, false, error ) );
    }
};

export const registrationController = async ( req: Request, res: Response, next: NextFunction ) => {
    const { first_name, last_name, email, password } = req.body;
  
    try {
      const salt = await bcrypt.genSalt( 10 );
      const passwordHash = await bcrypt.hash( password, salt );
      
      const user = await User.create({ first_name, last_name, email, password: passwordHash });
  
      return res.status( 201 ).json({
        success: true,
        message: 'User registered successfully',
        user,
      });

    } catch ( error ) {
      next( new AppError( 'Error creating user.', 500, false, error ) );
    }
};
