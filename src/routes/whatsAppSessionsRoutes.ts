import { Router } from "express";
import { body, param } from "express-validator";
import { JWTValidator, validationMiddleware } from "@/middlewares";
import { patchSession } from "@/controllers";

const router = Router();

router.patch('/:uid', [
    JWTValidator,
    param('uid').not().isEmpty().withMessage('Session UID must be specify in the param')
    .isString().withMessage('UID must be a string.'),
    validationMiddleware
], patchSession); 

export default router;