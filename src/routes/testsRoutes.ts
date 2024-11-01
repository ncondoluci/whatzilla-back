import { readCampaignFile } from "@/controllers";
import { JWTValidator, validationMiddleware } from "@/middlewares";
import jobQueue from "@/queues/campaignQueues";
import { sendResponse } from "@/utils/customResponse";
import { Router } from "express";

const router = Router();

router.post('/:uid', [
    JWTValidator,
    validationMiddleware
], readCampaignFile);

export default router;