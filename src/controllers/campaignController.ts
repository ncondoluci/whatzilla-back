import { Request, Response, NextFunction } from "express";
import { whatsappSessionManager }          from '@/services/whatsappSessionManager';
import { Server }       from "socket.io";
import { AppError }     from "@/providers/ErrorProvider";
import Campaign         from '@/models/Campaign';
import CampaignReport   from "@/models/CampaignReport";
import { sendResponse } from '@/utils/customResponse';
import CampaignProvider from '@/providers/campaignProvider';
import jobQueue         from "@/queues/campaignQueues";
import redisClient      from '@/config/redis';
import { UploadedFile } from "express-fileupload";
import WhatsAppSession from "@/models/WhatsAppSession";
import { Client, NoAuth } from "whatsapp-web.js";
import { logger } from "@/config/logger";
import { userState } from'@/sockets/socketManager';

export const postCampaign = async (req: Request, res: Response, next: NextFunction) => {
  const { uid: user_id } = req.user as { uid: string };
  const { name } = req.body;

  try {
    const campaign = await Campaign.create({ name, user_id });

    return sendResponse(res, 201, {
      success: true,
      message: "Campaign created.",
      campaign
    });

  } catch (error) {
    next(new AppError({
      message: 'Error creating campaign.',
      statusCode: 500,
      isOperational: false,
      data: error
    }));
  }
};

export const getCampaign = async (req: Request, res: Response, next: NextFunction) => {
  const { uid } = req.params;

  try {
    const campaign = await Campaign.findOne({
      where: {
        uid
      }
    });

    if (!campaign) {
      return sendResponse(res, 200, {
        success: false,
        message: 'Campaign not found.',
      });
    }

    return sendResponse(res, 200, {
      success: true,
      message: 'Campaign found.',
      campaign
    });

  } catch (error) {
    next(new AppError({
      message: "Internal server error",
      statusCode: 500,
      isOperational: false,
      data: error
    }));
  }
};

export const getCampaignsList = async (req: Request, res: Response, next: NextFunction) => {
  const { uid: user_id } = req.user as { uid: string };


  try {
    const campaigns = await Campaign.findAll({
      where: {
        user_id
      }
    });

    if (!campaigns || campaigns.length === 0) {
      return sendResponse(res, 200, {
        success: false,
        message: 'Campaigns not found.',
        campaigns: []
      });
    }

    return sendResponse(res, 200, {
      success: true,
      message: 'Campaigns found.',
      campaigns
    });

  } catch (error) {
    next(new AppError({
      message: "Internal server error",
      statusCode: 500,
      isOperational: false,
      data: error
    }));
  }
};

export const patchCampaign = async (req: Request, res: Response, next: NextFunction) => {
  const { uid } = req.params;
  const { list_id, name, status } = req.body;

  const data: any = {};

  if (list_id) {
    data.list_id = list_id;
  }
  if (name) {
    data.name = name;
  }
  if (status) {
    data.status = status;
  }

  try {
    const [affectedRows] = await Campaign.update(data, {
      where: { uid }
    });

    if (affectedRows < 1) {
      return sendResponse(res, 200, {
        success: false,
        message: 'Campaigns not found.',
      });
    }

    return sendResponse(res, 200, {
      success: true,
      message: 'Campaign updated.',
    });

  } catch (error) {
    next(new AppError({
      message: 'Internal server error.',
      statusCode: 500,
      isOperational: false,
      data: error
    }));
  }
};

export const deleteCampaign = async (req: Request, res: Response, next: NextFunction) => {
  const { uid } = req.params;

  try {
    const affectedRows = await Campaign.destroy({
      where: { uid },
    });

    if (affectedRows === 0) {
      return sendResponse(res, 200, {
        success: false,
        message: 'Campaigns not found.',
      });
    }

    return sendResponse(res, 200, {
      success: true,
      message: 'Campaign deleted successfully.'
    });

  } catch (error) {
    next(new AppError({
      message: 'Internal server error.',
      statusCode: 500,
      isOperational: false,
      data: error
    }));
  }
};

export const uploadCampaign = async (req: Request, res: Response, next: NextFunction) => {
  const { file } = req.files as { file: UploadedFile };
  const { uid: user_id } = req.user as { uid: string };


  try {
    const campaignProvider = new CampaignProvider(user_id);
    await campaignProvider.uploadCampaignFile(file);

    return sendResponse(res, 200, {
      success: true,
      message: 'Campaign file uploaded and saved successfully.'
    });

  } catch (error) {
    next(new AppError({
      message: 'Failed to upload campaign',
      statusCode: 500,
      isOperational: false,
      data: error
    }));
  }
};

export const startCampaign = async (req: Request, res: Response, next: NextFunction) => {
  const { uid: userId } = req.user as { uid: string };
  const { uid: campaignId } = req.params;

  try {
    const campaignProvider = new CampaignProvider(userId);
    const campaignData = await campaignProvider.getCampaignData(campaignId);
    const totalMessages = campaignData.length;

    if (totalMessages === 0) {
      return sendResponse(res, 200, {
        success: false,
        message: 'No data found for this campaign.',
      });
    }

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
};

export const stopCampaign = async (req: Request, res: Response, next: NextFunction) => {
  const io = req.app.get("io") as Server; 
  const { uid: campaignId } = req.params;
  
  try {
    const campaignExists = await redisClient.exists(`campaign:${campaignId}`);
    if (!campaignExists) {
      return sendResponse(res, 200, {
        success: false,
        message: `Campaign ${campaignId} does not exist.`
      });
    }

    let progress = await redisClient.hGet(`campaign:${campaignId}`, 'progress');
    if (progress === null || progress === undefined) {
      progress = '0';
    }
    let numericProgress = parseFloat(progress); 
    
    if (isNaN(numericProgress)) {
      numericProgress = 0;
    } 

    await CampaignReport.update(
      { status: 'stopped', sent_porcent: numericProgress }, 
      { where: { campaign_id: campaignId } }
    );

    await redisClient.hSet(`campaign:${campaignId}`, 'status', 'stopped');

    // To the user
    io.to(`campaign_${campaignId}`).emit('campaigns', { campaignId, status: 'stopped' });

    return sendResponse(res, 200, {
      success: true, 
      message: `Campaign ${campaignId} paused`
    });

  } catch (error) {
    next(new AppError({
      message: `Error pausing campaign`, 
      statusCode: 500, 
      isOperational: false, 
      data: error
    }));
  }
};

export const resumeCampaign = async (req: Request, res: Response, next: NextFunction) => {
  const io = req.app.get("io") as Server;
  const { uid: userId } = req.user as { uid: string };
  const { uid: campaignId } = req.params;

  try {
    const campaignReport = await CampaignReport.findOne({ where: { campaign_id: campaignId, status: 'stopped' } });

    if (!campaignReport) {
      return sendResponse(res, 200, {
        success: false,
        message: `There is no campaign stopped with the uid ${campaignId} to resume.`
      });
    }
    const {uid: reportId} = campaignReport;
    console.log('ReportID: ', reportId);

    const progress = campaignReport.sent_porcent;

    const campaignProvider = new CampaignProvider(userId); 
    const campaignData = await campaignProvider.getCampaignData(campaignId);
    const totalMessages = campaignData.length;

    if (totalMessages === 0) {
      return sendResponse(res, 200, {
        success: false,
        message: 'No data found for this campaign.',
      });
    }

    const startFrom = Math.floor((progress / 100) * totalMessages);
    const messagesToSend = campaignData.slice(startFrom); // Obtener los mensajes restantes

    await jobQueue.add({
      campaignId,
      reportId,
      userId,
      dataArray: messagesToSend,
      totalMessages,
      startFrom,
    });

    await CampaignReport.update(
      { status: 'running' },
      { where: { campaign_id: campaignId } }
    );

    await redisClient.hSet(`campaign:${campaignId}`, 'status', 'running');

    io.to(`user_${userId}`).emit('campaigns', { event: 'resume', campaignId, userId });

    return sendResponse(res, 200, {
      success: true,
      message: `Campaign ${campaignId} resumed from ${progress}%`,
    });

  } catch (error) {
    next(new AppError({
      message: `Error resuming campaign`,
      statusCode: 500,
      isOperational: false,
      data: error,
    }));
  }
};

export const cancelCampaign = async (req: Request, res: Response, next: NextFunction) => {
  const io = req.app.get("io") as Server; 
  const { uid: campaignId } = req.params;
  const userId = req.body.userId;

  try {
    const campaignExists = await redisClient.exists(`campaign:${campaignId}`);
    if (!campaignExists) {
      return sendResponse(res, 200, {
        success: false,
        message: `Campaign ${campaignId} does not exist.`
      });
    }

    const campaign = await Campaign.findOne({ where: { uid: campaignId } });
    const progress = await redisClient.hGet(`campaign:${campaignId}`, 'progress');

    await CampaignReport.update(
      { status: 'cancelled', sent_porcent: progress }, 
      { where: { campaign_id: campaignId } }
    );

    io.to(`user_${userId}`).emit('campaigns', {
      event: 'cancell',
      campaignId,
      progress: `${parseFloat(`${progress}`).toFixed(2)}%`,
    });

    const job = await jobQueue.getJob(campaignId);
    if (job) {
      await job.remove();
    }

    return sendResponse(res, 200, {
      success: true, 
      message: `Campaign ${campaignId} cancelled`
    });

  } catch (error) {
    next(new AppError({
      message: `Error cancelling campaign`,
      statusCode: 500,
      isOperational: false,
      data: error
    }));
  }
};

export const createWhatsAppSession = async (req: Request, res: Response, next: NextFunction) => {
  const io = req.app.get("io") as Server; 
  const { uid: user_id } = req.user as { uid: string };

  try {

    const existSession = await WhatsAppSession.findOne({ where: { user_id } });

    if (existSession) {
      return sendResponse(res, 200, {
        success: true,
        message: "WhatsApp session already active. Campaign can be started."
      });
    }

    await whatsappSessionManager.startSession(user_id, io );
      
    return sendResponse(res, 200, {
      success: false,
      message: "QR code generated. Please scan to authenticate.",
    });
          
  } catch (error) {
    next(new AppError({
      message: 'Error starting WhatsApp session.',
      statusCode: 500,
      isOperational: false,  
      data: error
    }));
  }
};

export const initializeCampaign = async (req: Request, res: Response, next: NextFunction) => {
  const io = req.app.get("io") as Server;
  const { uid: user_id } = req.user as { uid: string };
  const { uid: campaign_id } = req.params;

  const socketId = userState.get(user_id);
  
  try {
    if (!socketId) {
      return sendResponse(res, 200, {
        success: false,
        message: 'Socket ID not found.'
      });
    }
    // Procession the data form a campaign file (xlsx)
    const campaignProvider = new CampaignProvider(user_id);
    const campaignData = await campaignProvider.getCampaignData(campaign_id);
    const totalMessages = campaignData.length;

    if(!campaignData || !totalMessages) {
      return sendResponse(res, 200, {
        success: false,
        message: 'Error loading campaign data || Campaign data not found.'
      });
    }
  
    const client = new Client({
      authStrategy: new NoAuth(),
      puppeteer: {
        headless: false, 
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      }
    });
    
    if (!client) {
      return sendResponse(res, 200, {
        success: false,
        message: 'Error creating WhatsApp client.'
      });
    }

    client.on('ready', async () => {
      logger.info('Job running.');

      userState.set(user_id, {
        ...userState.get(user_id),
        [`client`]: client
      });
      
      await jobQueue.add({ dataArray: campaignData, totalMessages, campaign_id, user_id });
    });

    client.on('qr', (qr: string) => {
      return sendResponse(res, 200, {
        success: true,
        message: "QR code generated. Please scan to authenticate.",
        qr
      });
    });

    client.on('auth_failure', (error) => {
      return sendResponse(res, 200, {
        success: false,
        message: "What's App authentication failed.",
      });
    });

    await client.initialize();

  } catch (error) {
    next(new AppError({ message: "An error occurred while initializing campaign.", statusCode: 500, isOperational: false, data: error }));
  }
};

