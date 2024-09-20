import { Request, Response } from "express";
import User from "../models/User";
import JWTProvider from "../providers/JWTProvider";
import bcrypt from 'bcryptjs';

export const authController = async ( req: Request, res: Response ) => {
    const { email, password } = req.body;
  
    try {
      const user = await User.findOne({ email });
      
      if (!user) {
        return res.status(400).json({
          msg: `User with email ${email} does not exist.`,
        });
      }
      
      if (!user.status) {
        return res.status(400).json({
          msg: 'User is not active',
        });
      }
      
      const auth = bcrypt.compareSync(password, user.password);
      
      if (!auth) {
        return res.status(400).json({
          msg: 'Wrong password',
        });
      }
      
      const token = await JWTProvider(user.uid);
      
      res.status(200).json({
        user,
        token,
      });
  
    } catch (error) {
      console.error(error);
  
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
};

export const registrationController = async (req: Request, res: Response) => {
    const { first_name, last_name, email, password } = req.body;

    console.log("Entrando")
  
    try {
      // Create new user instance

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

//     user.password = await bcrypt.hash(user.password, salt);
      const user = await User.create({ first_name, last_name, email, password: passwordHash });
  
      // Return the created user as a JSON response
      return res.status(201).json({
        success: true,
        message: 'User registered successfully',
        user,
      });

    } catch (error) {
      console.error('Error in createUser service', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
};