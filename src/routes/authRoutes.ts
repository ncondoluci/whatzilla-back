import { Router, Request, Response } from "express";
import { check } from "express-validator";
import { validationResult } from "express-validator";

import { authController, registrationController } from "@/controllers";

const router = Router();

router.post( '/signin', registrationController );
router.post( '/login', authController );

export default router;