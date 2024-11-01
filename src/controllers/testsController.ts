import { NextFunction, Request, Response } from "express";
import CampaignProvider from "@/providers/campaignProvider";
import { sendResponse } from "@/utils/customResponse";
import jobQueue from "@/queues/campaignQueues";
import { AppError } from "@/providers/ErrorProvider";

export const readCampaignFile = async (req: Request, res: Response, next: NextFunction) => {
    const { uid: campaignId } = req.params;
    const { uid: userId } = req.user as { uid: string };
    
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
        next(new AppError({
            message: 'Failed to start campaign data processing',
            statusCode: 500,
            isOperational: false,
            data: error
        }));
    }
}
