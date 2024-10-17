import { Request, Response } from "express";
import CampaignProvider from "@/providers/campaignProvider";
import { sendResponse } from "@/utils/customResponse";
import jobQueue from "@/queues/campaignQueues";

export const readCampaignFile = async (req: Request, res: Response) => {
    const { uid: campaignId } = req.params;
    const { uid: userId } = req.user;

    
    try {
        const Campaign = new CampaignProvider(userId);
        const campaignData = await Campaign.getCampaignData(campaignId);
        const totalMessages = campaignData.length;

        await jobQueue.add({ dataArray: campaignData, totalMessages, campaignId, userId });

        return sendResponse(res, 200, {
            success: true,
            message: 'Campaign data processing started',
        });
    } catch (error) {
        console.error(error);
        return sendResponse(res, 200, {
            success: false,
            message: 'Failed to start campaign data processing',
            error: error.message
        });
    }
}
