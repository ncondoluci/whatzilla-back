import { Router } from "express";
import { check, param } from "express-validator";
import { 
    JWTValidator,
    validationMiddleware 
} from "@/middlewares";
import { getUser } from "@/controllers";

const router = Router();

// Aquí defines las rutas de campaña
router.get('/:uid', [
    JWTValidator,
    param( 'uid' ).notEmpty().withMessage( 'User ID is requested.' ),
    param( 'uid' ).isString().withMessage( 'User ID must be a string.'),
    validationMiddleware
],
getUser);

export default router;