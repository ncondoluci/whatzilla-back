import { NextFunction, Request, Response } from "express";
import CampaignProvider from "@/providers/campaignProvider";
import { sendResponse } from "@/utils/customResponse";
import jobQueue from "@/queues/campaignQueues";
import { AppError } from "@/providers/ErrorProvider";
import EmailService from "@/services/EmailService";
import { createSmtpTransport } from "@/config/nodeMailer";
import { errorTemplate } from "@/templates/errorTemplate";

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

export const sendMail = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const transporter = createSmtpTransport();
        const mailer = new EmailService(transporter);

        const template: string = errorTemplate("Mensaje de error de prueba", "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.");
        const emailData = {
            to: 'nicolas@cantalupe.com.ar',
            from: process.env.NODE_MAILER_USER,
            subject: 'Test email',
            html: template
        }
        await mailer.sendMail(emailData);
        
        sendResponse(res, 200, {
            success: true,
            message: "Done."
        });

    } catch (error) {
        next(new AppError({message: 'Error happened sending an email', statusCode: 500, isOperational: false, data: error}));
    }
}

export const throwUncaughtException = async (req: Request, res: Response, next:NextFunction) => {
    sendResponse(res, 200, {
        success: true,
        message: 'Done!'
    });
    throw new Error("Este es un error lanzado intencionalmente.");
} 