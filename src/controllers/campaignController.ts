import { Request, Response, NextFunction } from "express";
import { whatsappSessionManager }          from '@/services/whatsappSessionManager';
import { Server }       from "socket.io";
import { AppError }     from "@/providers/ErrorProvider";
import Campaign         from '@/models/Campaign';
import { sendResponse } from '@/utils/customResponse';
import CampaignProvider from '@/providers/campaignProvider';
import jobQueue         from "@/queues/campaignQueues";
import redisClient      from '@/config/redis';

export const postCampaign = async (req: Request, res: Response, next: NextFunction) => {
  const { name, user_id } = req.body;

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
  const { uid: user_id } = req.user;

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
  const { file } = req.files;
  const user_id = req.user.uid;

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
  const { uid: userId } = req.user;
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

export const pauseCampaign = async (req: Request, res: Response): Promise<void> => {
  const { uid } = req.params;

  await Campaign.update({ status: 'paused' }, { where: { uid } });

  redisClient.hset(`campaign:${uid}`, 'status', 'paused');

  res.status(200).send('Campaign paused');
};

export const resumeCampaign = async (req: Request, res: Response): Promise<void> => {
  const { uid } = req.params;

  await Campaign.update({ status: 'active' }, { where: { uid } });

  redisClient.hset(`campaign:${uid}`, 'status', 'active');

  res.status(200).send('Campaign resumed');
};

export const cancelCampaign = async (req: Request, res: Response): Promise<void> => {
  const { uid } = req.params;

  await Campaign.update({ status: 'cancelled' }, { where: { uid } });

  redisClient.hset(`campaign:${uid}`, 'status', 'cancelled');

  res.status(200).send('Campaign cancelled');
};

export const createWhatsAppSession = async (req: Request, res: Response, next: NextFunction) => {
  const io = req.app.get("io") as Server; 
  const user_id = req.user.uid;

  try {
    const session = await whatsappSessionManager.restoreSession(user_id, io);

    if (session) {
      return res.status(200).json({
        success: true,
        message: "WhatsApp session already active. Campaign can be started."
      });
    }

    const qrCode = await whatsappSessionManager.startSession(user_id, io);

    if (qrCode) {
      
      return sendResponse(res, 200, {
        success: true,
        message: "QR code generated. Please scan to authenticate.",
      });

    } else {
      
      return sendResponse(res, 200, {
        success: true,
        message: "WhatsApp session ready. You can start sending messages."
      });
    
    }
  } catch (error) {
    next(new AppError({
      message: 'Error starting WhatsApp session.',
      statusCode: 500,
      isOperational: false,  
      data: error
    }));
  }
};
