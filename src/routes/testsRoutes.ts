import { sendMail, throwUncaughtException } from "@/controllers";
import { JWTValidator, validationMiddleware } from "@/middlewares";
import { Router } from "express";

const router = Router();

router.post('/sendmail', [
    JWTValidator,
    validationMiddleware
], sendMail);

router.post('/throwError', [
    JWTValidator,
    validationMiddleware
], throwUncaughtException);

export default router;