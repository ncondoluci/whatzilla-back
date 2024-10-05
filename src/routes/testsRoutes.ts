import { readCampaignFile } from "@/controllers";
import { JWTValidator, validationMiddleware } from "@/middlewares";
import { Router } from "express";

const router = Router();

router.post('/:uid', [
    JWTValidator,
    validationMiddleware
], readCampaignFile);

export default router;