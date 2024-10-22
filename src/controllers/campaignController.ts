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
    progress = parseFloat(progress);
    if (isNaN(progress) || progress === null) {
      progress = 0; 
    }

    await CampaignReport.update(
      { status: 'stopped', sent_porcent: progress }, 
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

export const resumeCampaign = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const io = req.app.get("io") as Server;
  const { uid: campaignId } = req.params;
  const { uid: userId } = req.user;

  try {
    // Verificar que la campaña está en estado 'stopped'
    const campaignReport = await CampaignReport.findOne({ where: { campaign_id: campaignId, status: 'stopped' } });

    if (!campaignReport) {
      return sendResponse(res, 200, {
        success: false,
        message: `There is no campaign stopped with the uid ${campaignId} to resume.`
      });
    }

    // Recuperar el progreso y los datos de la campaña
    const progress = parseFloat(campaignReport.sent_porcent);

    // Recuperar los datos originales de la campaña
    const campaignProvider = new CampaignProvider(userId);  // Asegúrate de tener una instancia válida
    const campaignData = await campaignProvider.getCampaignData(campaignId);
    const totalMessages = campaignData.length;

    if (totalMessages === 0) {
      return sendResponse(res, 200, {
        success: false,
        message: 'No data found for this campaign.',
      });
    }

    // Cálculo de los mensajes restantes por enviar
    const startFrom = Math.floor((progress / 100) * totalMessages);
    const messagesToSend = campaignData.slice(startFrom); // Obtener los mensajes restantes

    // Crear un nuevo trabajo en Bull con los datos correctos
    await jobQueue.add({
      campaignId,
      userId,
      dataArray: messagesToSend, // Solo los mensajes que faltan por enviar
      totalMessages, // Número total de mensajes
      startFrom, // Desde dónde comenzar el envío
    });

    // Actualizar el estado de la campaña en la base de datos
    await CampaignReport.update(
      { status: 'running' },
      { where: { campaign_id: campaignId } }
    );

    // Actualizar el estado de la campaña en Redis a 'running'
    await redisClient.hSet(`campaign:${campaignId}`, 'status', 'running');

    // Notificar al usuario que la campaña ha sido reanudada
    io.to(`user_${userId}`).emit('campaigns', { event: 'resume', campaignId, userId });

    return sendResponse(200, res, {
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
      progress: `${progress.toFixed(2)}%`,
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
  const user_id = req.user.uid;

  try {
    const session = await whatsappSessionManager.restoreSession(user_id, io);

    if (session) {
      return res.status(200).json({
        success: true,
        message: "WhatsApp session already active. Campaign can be started."
      });
    }

    const qrCode = await whatsappSessionManager.startSession(user_id, io );

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
