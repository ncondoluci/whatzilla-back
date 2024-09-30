import { Router, Request, Response } from "express";
import { check } from "express-validator";
import { validationResult } from "express-validator";

import { authController, registrationController } from "@/controllers";

const router = Router();

router.get( '/', ( req: Request, res: Response) => {
    res.send('Auth system.')
});

router.post( '/sign-in', registrationController );
router.post( '/log-in', authController );

export default router;