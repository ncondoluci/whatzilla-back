import Queue from 'bull';
import redisClient from '@/config/redis';
import { Server } from 'socket.io';
import Campaign from '@/models/Campaign';
import CampaignReport from '@/models/CampaignReport';
import { logger } from '@/config/logger';
import { userState } from '@/sockets/socketManager';
import { Client } from 'whatsapp-web.js';

export const jobQueue = new Queue('jobQueue', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379
  },
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: true,
  },
  settings: {
    stalledInterval: 5000,
    lockDuration: 60000,
  }
});

let io: Server;

export const initializeQueueSocket = (ioInstance: Server) => {
  io = ioInstance;
};

const registerMessageAck = (client: Client, campaignId: string) => {
    // Listen to message status
    client.on(' ', async (message: string, ack: number) => {
      const campaignKey = `campaign_${campaignId}`;

      switch (ack) {
        case 0:
          // logger.error('ACK_ERROR: Error sending the message.');
          const messagesWithErrors = await redisClient.hGet(campaignKey, 'errors');
          redisClient.hSet(campaignKey, 'errors', parseInt(messagesWithErrors || '0', 10) + 1);
          break;
    
        case 1:
          // logger.info('ACK_PENDING: Message is pending.');
          const pendingMessages = await redisClient.hGet(campaignKey, 'pending');
          redisClient.hSet(campaignKey, 'pending', parseInt(pendingMessages || '0', 10) + 1);
          break;
    
        case 2:
          // logger.info('ACK_SERVER: Message received by WhatsApp server.');
          const serverReceived = await redisClient.hGet(campaignKey, 'received_by_server');
          redisClient.hSet(campaignKey, 'received_by_server', parseInt(serverReceived || '0', 10) + 1);
          break;
    
        case 3:
          // logger.info('ACK_DEVICE: Message delivered to the recipient’s device.');
          const deliveredMessages = await redisClient.hGet(campaignKey, 'delivered');
          redisClient.hSet(campaignKey, 'delivered', parseInt(deliveredMessages || '0', 10) + 1);
          break;
    
        case 4:
          // logger.info('ACK_READ: Message read by the recipient.');
          const readMessages = await redisClient.hGet(campaignKey, 'read');
          redisClient.hSet(campaignKey, 'read', parseInt(readMessages || '0', 10) + 1);
          break;
    
        default:
          logger.info('Unknown ack status:', ack);
      }
    });
}
const redisStatsInitializer = async (campaignKey: string) => {
  await redisClient.hSet(campaignKey, {
    status: 'running',
    errors: 0,
    pending: 0,
    received_by_server: 0,
    delivered: 0,
    read: 0,
  });
}

const removeCampaignData = async ( campaignReport: any, reportId: any, campaign_id: any, totalMessages: any, user: any, client: any, sessionId: any, user_id: any, socketId: any, jobId: any) => {
  try {
    await campaignReport.update({ status: 'sent', sent_percent: 100 });

    const withError: number = Number(await redisClient.hGet(`campaign_${campaign_id}`, 'errors')) ?? 0;
    const sent_percent: number = 100 - withError;
    // Save progress in Report
    await CampaignReport.update(
      { status: 'sent', processed: totalMessages, with_error: withError, sent_percent },
      { where: { uid: reportId } }
    );

    // Save status in Campaign data
    await Campaign.update({ sent_at: new Date(), status: 'active' }, { where: { uid: campaign_id } });

    // Remove redis state
    await redisClient.del(`campaign_${campaign_id}`);

    // Delete What's App client and session 
    await client.logout();
    await client.destroy();

    // Delete session data from client Singleton instance
    if (user) {
      delete user[`session_${sessionId}`];
      userState.set(user_id, user);
    }

    // Notify the front
    if (io) {
      io.to(socketId).emit('campaign', {
        event: 'completed',
        capaignId: campaign_id,
      });
    }

    logger.info(`Job ${jobId} completed successfully.`);
  } catch (error) {
    if (error instanceof Error) {
      
      logger.error(`Error marking job ${jobId} as completed: ${error.message}`, {
        jobId,
        campaign_id,
        data: error,
      });

    } else {
      logger.error(`Unknow error happened while handling failure on job ${jobId}`);
    }
  }
}

jobQueue.process(10, async (job, done) => {
  const { dataArray, totalMessages, startFrom = 0, campaign_id, user_id, sessionId } = job.data;
  let { reportId = ''} = job.data;
  
  const user = userState.get(user_id);
  const client = user[`session_${sessionId}`];
  const socketId = user.socketId;

  try {
    // Generate campaign report in DDBB
    let campaignReport;
    if ( !reportId ) {
      campaignReport = await CampaignReport.create({
        campaign_id,
        status: 'running',
        run_at: new Date(),
      });
      
      reportId = campaignReport.uid;

      job.data.reportId = reportId;
      await job.update(job.data);

    } else {
      campaignReport = await CampaignReport.findOne({where: { uid: reportId}});
      
      if (!campaignReport) {
        throw new Error(`Campaign report with uid ${reportId} not found`);
      }
    };
    
    // DDBB
    await Campaign.update({ status: 'running', last_report_id: reportId }, { where: { uid: campaign_id } });

    // Set the campaign status in redis
    redisStatsInitializer(`campaign_${campaign_id}`);

    // Register messages status
    registerMessageAck(client, campaign_id);

    // In case of resuming or starting from scratch
    let messagesProcessed   = startFrom; 
    let lastEmittedProgress = (startFrom / totalMessages) * 100;
    let messagessWithError  = 0;

    // Process the job - Send campaign
    for (let i = startFrom; i < dataArray.length; i++) {
      const item = dataArray[i];

      try {
        const campaignStatus = await redisClient.hGet(`campaign_${campaign_id}`, 'status');
        const exitJob = await redisClient.hGet('GLOBAL', 'exitJob');
        
        if (campaignStatus === 'stopped' || exitJob === 'true') {
          logger.info(`Campaign ${campaign_id} has been ${campaignStatus}. Ending job.`);
          await removeCampaignData(campaignReport, reportId,campaign_id, totalMessages, user, client, sessionId, user_id, socketId, job.id);
          return done(new Error('Paused: The campaign was stopped intentionally.'), messagesProcessed);
        }

        // Send message
        const recipientNumber = `${'549' + item.NUMERO_COMPLETO}@c.us`; 
        await client.sendMessage(recipientNumber, item.MENSAJE)
          .then(() => {
            logger.info(`Message sent to ${recipientNumber}`);
            
            io.to(socketId).emit('campaign', {
              event: 'sendMessage',
              campaignId: campaign_id ,
              data: {chatId: item.Numero, message: item.MENSAJE}
            });
          })
          .catch((err:any) => {
            logger.error(`Mesagge for ${item.Numero} couldn't be sent: ${err}`);
            messagessWithError += 1;
          });

        messagesProcessed += 1;
        const progress = (messagesProcessed / totalMessages) * 100;
        
        // Save progress
        await redisClient.hSet(`campaign_${campaign_id}`, {
          progress: `${progress.toFixed(2)}%`,
          errors: `${messagessWithError}`
        });
        
        // Every 10%
        if (progress - lastEmittedProgress >= 10) {
          lastEmittedProgress = progress;

          await campaignReport.update({ processed: messagesProcessed, with_error: messagessWithError});
          
          // Notify frontend about sending progress
          if (io) {
            io.to(socketId).emit('campaign', {
              event: 'progress',
              campaignId: campaign_id,
              progress: `${progress.toFixed(2)}%`,
            });
          }
        }

        // For non-blocking pourposse
        await new Promise((resolve) => setTimeout(resolve, 5000));

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknow error';

        logger.error(`An error happened processing message ${messagesProcessed}: ${errorMessage}`, {
          campaign_id,
          jobId: job.id,
          data: error,
        });

        // Save report in DDBB
        await campaignReport.update({
          status: 'stopped',
          processed: messagesProcessed,
          sent_percent: (messagesProcessed - messagessWithError / totalMessages) * 100,
        });

        if (io) {
          // Notify frontend about sending progress
          io.to(socketId).emit('campaign', {
            event: 'failed',
            error: `Error processing message ${messagesProcessed}: ${errorMessage}`,
            campaignId: campaign_id,
          });
        }

        throw error;
      }
    }

    await removeCampaignData(campaignReport, reportId,campaign_id, totalMessages, user, client, sessionId, user_id, socketId, job.id);
    
    done(null);
  } catch (error) {
  
    if (error instanceof Error) {
      logger.error(`Error al procesar la campaña ${campaign_id}: ${error.message}`);
      done(new Error(`Error al procesar la campaña ${campaign_id}: ${error.message}`));
    } 
    
    else {
      logger.error(`Error desconocido al procesar la campaña ${campaign_id}`);
      done(new Error(`Error desconocido al procesar la campaña ${campaign_id}`));
    }
  
  }
});

export default jobQueue;
