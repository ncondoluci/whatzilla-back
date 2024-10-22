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

router.get('/active-jobs', async (req, res) => {
try {
    const activeJobs = await jobQueue.getJobCounts().then(res => console.log('Job Count:\n',res));
    return sendResponse(res, 200, {
        success: true,
        message: "Getting active jobs",
        activeJobs
    });
} catch (error) {
    return res.status(500).send(`Error retrieving active jobs: ${error.message}`);
}
});

export default router;