import { logger } from "@/config/logger";
import CampaignReport from "@/models/CampaignReport";
import { AppError } from "@/providers/ErrorProvider";
import { sendResponse } from "@/utils/customResponse";
import { NextFunction, Request, Response } from "express";

export const getCampaignReport = async (req: Request, res: Response, next: NextFunction) => {
    const { uid } = req.params;

    try {
        const report = await CampaignReport.findOne({ where: { uid } });

        if (!report) {
            return sendResponse(res, 200, {
                success: false,
                message: 'Report does not found.'
            });
        }

        return sendResponse(res, 200, {
            success: true,
            message: 'Report found',
            data: report
        });
    } catch (error) {
        next(new AppError({message: "Error getting campaign report.", statusCode: 500, isOperational: false, data: error}));
    }
}

export const getCampaignReports = async (req: Request, res: Response, next: NextFunction) => {
    const { uid: campaignId} = req.params;
    logger.info(campaignId)

    try {
        const reports = await CampaignReport.findAll({ where: { campaign_id: campaignId } });

        if (!reports) {
            return sendResponse(res, 200, {
                success: false,
                message: 'Reports does not found.' 
            });
        }
        
        return sendResponse(res, 200, {
            success: true,
            message: 'Reports found',
            reports
        });
    } catch (error) {
        next(new AppError({message: "Error getting campaign report.", statusCode: 500, isOperational: false, data: error}));
    }
}
