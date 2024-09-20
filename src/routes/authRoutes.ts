import { Router, Request, Response } from "express";
import { check } from "express-validator";
import { validationResult } from "express-validator";

const router = Router();

router.get( '/', ( req: Request, res: Response) => {
    res.send('Auth system.')
});

export default router;