import { Request, Response } from "express";
import User from "../models/User";
import JWTProvider from "../providers/JWTProvider";

const adminLogin = async ( req: Request, res: Response ) => {
    const { email, password } = req.body;
  
    try {
      // Verificar si el email existe
      const user = await User.findOne({ email });
      
      if (!user) {
        return res.status(400).json({
          msg: `User with email ${email} does not exist.`,
        });
      }
      
      // Verificar si el usuario está activo
      if (!user.status) {
        return res.status(400).json({
          msg: 'User is not active',
        });
      }
      
      const auth = bcrypt.compareSync(password, user.password);
      
      if (!auth) {
        return res.status(400).json({
          msg: 'La contraseña no es correcta',
        });
      }
      const token = await JWTProvider(user.uid);
      
      res.status(200).json({
        user,
        token,
      });
  
    } catch (error) {
      console.log(error);
  
      res.status(500).json({
        msg: 'Algo salió mal.',
      });
    }
  };