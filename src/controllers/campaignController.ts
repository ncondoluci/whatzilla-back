import { Request, Response, NextFunction } from "express";
import { Server }       from "socket.io";
import { AppError }     from "@/providers/ErrorProvider";
import Campaign         from '@/models/Campaign';
import CampaignReport   from "@/models/CampaignReport";
import { sendResponse } from '@/utils/customResponse';
import CampaignProvider from '@/providers/campaignProvider';
import jobQueue         from "@/queues/campaignQueues";
import redisClient      from '@/config/redis';
import { UploadedFile } from "express-fileupload";
import { Client, NoAuth } from "whatsapp-web.js";
import { logger } from "@/config/logger";
import { userState } from'@/sockets/socketManager';
import { stopAndRemoveJob } from "@/queues/campaignJobHandler";
import { v4 as uuid } from "uuid";

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
  const io = req.app.get("io") as Server;
  const { uid: user_id } = req.user as { uid: string };
  const { uid: campaign_id } = req.params;
  
  try {
    // Checks  if campaign is already running
    const campaign = await Campaign.findOne({ where: { uid: campaign_id } });
    if (!campaign || campaign.status === 'running') {
      sendResponse(res, 200, {
        success: false,
        message: `Campaign ${campaign_id} is already running or does not exist`
      });
    }

    // Global users state
    const {socketId} = userState.get(user_id);
    if (!socketId) {
      return sendResponse(res, 200, {
        success: false,
        message: 'Socket ID not found.'
      });
    }

    let isAuthenticated: Boolean = false;
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
        authTimeoutMs: 120000,
        qrMaxRetries: 1,
        puppeteer: {
          headless: true, 
          executablePath: '/usr/bin/google-chrome',
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        }
      });

      if (!client) {
        return sendResponse(res, 200, {
          success: false,
          message: 'Error creating WhatsApp client.'
        });
      }

      client.on('qr', (qr: string) => {
        setTimeout(async ()=> {
          if(!isAuthenticated) {
            logger.info('QR code was not scanned at time | What´s App authentication error.');

            await client.logout();
            await client.destroy();

            io.to(socketId).emit('whatsApp', {
              event: 'disconnect',
              campaign_id
            });
          }
        }, 60000);

        return sendResponse(res, 200, {
          success: true,
          message: "QR code generated. Please scan to authenticate.",
          qr
        });
      });

      client.on('ready', async () => {
        logger.info('Job running.');

        isAuthenticated = true;
        
        const sessionId = uuid();
        userState.set(user_id, {
          ...userState.get(user_id),
          [`session_${sessionId}`]: client
        });
        
        await jobQueue.add({ dataArray: campaignData, totalMessages, campaign_id, user_id, sessionId });

        // Notify frontend
        io.to(socketId).emit('whatsApp', {
          event: 'ready',
          campaign_id
        });

      });

      // Listen to message status
      client.on('message_ack', async (message: string, ack: number) => {
        const campaignKey = `campaign_${campaign_id}`;
      
        switch (ack) {
          case 0:
            logger.error('ACK_ERROR: Error sending the message.');
            const messagesWithErrors = await redisClient.hGet(campaignKey, 'errors');
            redisClient.hSet(campaignKey, 'errors', parseInt(messagesWithErrors || '0', 10) + 1);
            break;
      
          case 1:
            // logger.info('ACK_PENDING: Message is pending.');
            const pendingMessages = await redisClient.hGet(campaignKey, 'pending');
            redisClient.hSet(campaignKey, 'pending', parseInt(pendingMessages || '0', 10) + 1);
            break;
      
          case 2:
            logger.info('ACK_SERVER: Message received by WhatsApp server.');
            const serverReceived = await redisClient.hGet(campaignKey, 'received_by_server');
            redisClient.hSet(campaignKey, 'received_by_server', parseInt(serverReceived || '0', 10) + 1);
            break;
      
          case 3:
            // logger.info('ACK_DEVICE: Message delivered to the recipient’s device.');
            const deliveredMessages = await redisClient.hGet(campaignKey, 'delivered');
            redisClient.hSet(campaignKey, 'delivered', parseInt(deliveredMessages || '0', 10) + 1);
            break;
      
          case 4:
            logger.info('ACK_READ: Message read by the recipient.');
            const readMessages = await redisClient.hGet(campaignKey, 'read');
            redisClient.hSet(campaignKey, 'read', parseInt(readMessages || '0', 10) + 1);
            break;
      
          case 5:
            logger.info('ACK_PLAYED: Audio message played by the recipient.');
            const playedMessages = await redisClient.hGet(campaignKey, 'played');
            redisClient.hSet(campaignKey, 'played', parseInt(playedMessages || '0', 10) + 1);
            break;
      
          default:
            logger.info('Unknown ack status:', ack);
        }
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

export const stopCampaign = async (req: Request, res: Response, next: NextFunction) => {
  const { uid: campaign_id } = req.params;

  try {
    const isRunning = await Campaign.findOne({where: {uid: campaign_id, status: 'running'}});
    if(!isRunning) {
      return sendResponse(res, 200, {
        success: false,
        message: `Campaign with id ${campaign_id} not running`
      });
    }

    const { success,  message } = await stopAndRemoveJob(campaign_id);

    if(success) {
      return sendResponse(res, 200, {
        success,
        message
      });
    }

  } catch (error) {
    next(new AppError({message: 'Error happened pausing campaign', statusCode: 500, isOperational: false, data: error}))
  }
};

export const resumeCampaign = async (req: Request, res: Response, next: NextFunction) => {
  const io = req.app.get("io") as Server;
  const { uid: userId } = req.user as { uid: string };
  const { uid: campaignId } = req.params;

  try {

    // Global users state
    const { socketId } = userState.get(userId);
    if (!socketId) {
      return sendResponse(res, 200, {
        success: false,
        message: 'Socket ID not found.'
      });
    }

    // Load the partial sent campaign consulting last report
    const campaign = await Campaign.findOne({ where: { uid: campaignId}});
    if(!campaign) {
      return sendResponse(res, 200, {
        success: false,
        message: `Campaign with id ${campaignId} not found`
      });
    }

    const lastReportId = campaign.last_report_id;
    const campaignReport = await CampaignReport.findOne({ where: { uid: lastReportId } });
    if(!campaignReport) {
      return sendResponse(res, 200, {
        success: false,
        message: `There is no campaign stopped with the uid ${lastReportId} to resume (1).`
      });
    }
    if (campaignReport.status != 'stopped') {
      return sendResponse(res, 200, {
        success: false,
        message: `There is no campaign stopped with the uid ${lastReportId} to resume(2).`
      });
    }

    // Load full data of the campaign
    const campaignProvider = new CampaignProvider(userId); 
    const campaignData = await campaignProvider.getCampaignData(campaignId);

    const totalMessages = campaignData.length;
    if (totalMessages === 0) {
      return sendResponse(res, 200, {
        success: false,
        message: 'No data found for this campaign.',
      });
    }
    
    // Calculate the amount of data pending send
    const progress = campaignReport.sent_percent;
    const startFrom = Math.floor((progress / 100) * totalMessages);
    const messagesToSend = campaignData.slice(startFrom);

    // Create what's app client
    let isAuthenticated: Boolean = false;
    const client = new Client({
      authStrategy: new NoAuth(),
      authTimeoutMs: 60000,
      qrMaxRetries: 1,
      puppeteer: {
        headless: true, 
        executablePath: '/usr/bin/google-chrome',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      }
    });

    if (!client) {
      return sendResponse(res, 200, {
        success: false,
        message: 'Error creating WhatsApp client.'
      });
    }

    client.on('qr', (qr: String) => {
      setTimeout(async ()=> {
        if(!isAuthenticated) {
          logger.info('QR code was not scanned at time | What´s App authentication error.');

          await client.logout();
          await client.destroy();

          io.to(socketId).emit('whatsApp', {
            event: 'disconnect',
            campaignId
          });
        }
      }, 60000);

      return sendResponse(res, 200, {
        success: true,
        message: "QR code generated. Please scan to authenticate.",
        qr
      });
    });

    client.on('ready', async () => {
      logger.info('Job resumed.');

      isAuthenticated = true;

      const sessionId = uuid();
      userState.set(userId, {
        ...userState.get(userId),
        [`session_${sessionId}`]: client
      });

      // Enqueue job
      await jobQueue.add({
        campaign_id: campaignReport.campaign_id,
        reportId: lastReportId,
        user_id: userId,
        sessionId,
        dataArray: messagesToSend,
        totalMessages,
        startFrom,
      });

      // Update campaignReport status 
      await CampaignReport.update(
        { status: 'running' },
        { where: { uid: lastReportId } }
      );

      // Notify frontend
      io.to(socketId).emit('whatsApp', {
        event: 'ready',
        campaignId
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
    next(new AppError({
      message: `Error resuming campaign`,
      statusCode: 500,
      isOperational: false,
      data: error,
    }));
  }
};

export const resetCampaign = async (req: Request, res: Response, next: NextFunction) => {
  const { uid: campaignId } = req.params;

  try {
    const campaign = await Campaign.update(
      { status: 'active'},
      { 
        where: { uid: campaignId }, 
        returning: true
      }
    );

    if(!campaign) {
      return sendResponse(res, 200, {
        success: false,
        message: "Campaign not found",
      });
    };

    return sendResponse(res, 200, {
      success: true, 
      message: `Campaign ${campaignId} reseted`,
      campaign
    });

  } catch (error) {
    next(new AppError({
      message: `Error cancelling campaign`,
      statusCode: 500,
      isOperational: false,
      data: error
    }));
  };
};

