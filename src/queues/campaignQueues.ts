import Queue from 'bull';
import redisClient from '@/config/redis';
import { Server } from 'socket.io';
import Campaign from '@/models/Campaign';
import CampaignReport from '@/models/CampaignReport';
import { logger } from '@/config/logger';
import { whatsappSessionManager } from '@/services/whatsappSessionManager';

const jobQueue = new Queue('jobQueue', {
  redis: {
    host: '127.0.0.1',
    port: 6379,
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

export const initializeJobQueue = (ioInstance: Server) => {
  io = ioInstance;
};

jobQueue.process(async (job, done) => {
  const { dataArray, totalMessages, campaignId, userId } = job.data;
  let messagesSent = 0;
  let lastEmittedProgress = 0;

  try {
    await Campaign.update({ sent_at: new Date() }, { where: { uid: campaignId } });

    const campaignReport = await CampaignReport.create({
      uid: campaignId,
      campaign_id: campaignId,
      status: 'running',
      sent_porcent: 0,
      run_at: new Date(),
    });

    const session = whatsappSessionManager.sessions.get(userId);
    if (!session) {
      throw new Error(`No active WhatsApp session found for user ${userId}`);
    }

    for (const item of dataArray) {
      try {
        logger.info(`Nombre: ${item.Nombre}, Mensaje: ${item.Mensaje}`);

        // await whatsappSessionManager.sendMessage(userId, item.Mensaje, item.Numero, io);

        messagesSent += 1;
        const progress = (messagesSent / totalMessages) * 100;

        await redisClient.hSet(`campaign:${campaignId}`, 'progress', `${progress.toFixed(2)}%`);

        if (progress - lastEmittedProgress >= 10) {
          lastEmittedProgress = progress;

          await campaignReport.update({ sent_porcent: progress });

          if (io) {
            io.to(`user_${userId}`).emit('campaigns', {
              event: 'progress',
              campaignId,
              progress: `${progress.toFixed(2)}%`,
            });
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 5000));

      } catch (error) {
        logger.error(`Error processing item ${messagesSent}: ${error.message}`, {
          campaignId,
          jobId: job.id,
          data: error,
        });

        await campaignReport.update({
          status: 'stopped',
          sent_porcent: (messagesSent / totalMessages) * 100,
        });

        if (io) {
          io.to(`user_${userId}`).emit('campaigns', {
            event: 'failed',
            error: `Failed at item ${messagesSent}: ${error.message}`,
            campaignId,
          });
        }

        throw error;
      }
    }

    await Campaign.update({ sent_at: new Date() }, { where: { uid: campaignId } });

    await campaignReport.update({
      status: 'sent',
      sent_porcent: 100,
    });

    done();

  } catch (error) {
    logger.error(`Error processing campaign ${campaignId}: ${error.message}`, {
      jobId: job.id,
      campaignId,
      data: error,
    });

    if (io) {
      io.to(`user_${userId}`).emit('campaigns', {
        event: 'failed',
        error: `Failed processing campaign: ${error.message}`,
        campaignId,
      });
    }

    done(error);
  }
});

jobQueue.on('completed', async (job) => {
  const { campaignId, userId } = job.data;

  try {
    await Campaign.update({ sent_at: new Date() }, { where: { uid: campaignId } });
    await CampaignReport.update({ status: 'sent', sent_porcent: 100 }, { where: { campaign_id: campaignId } });

    if (io) {
      io.to(`user_${userId}`).emit('campaigns', {
        event: 'completed',
        campaignId,
      });
    }

    logger.info(`Job ${job.id} completed successfully.`);
  } catch (error) {
    logger.error(`Error marking job ${job.id} as completed: ${error.message}`, {
      jobId: job.id,
      campaignId,
      data: error,
    });
  }
});

jobQueue.on('failed', async (job, err) => {
  const { campaignId, userId } = job.data;

  try {
    const progress = await redisClient.hGet(`campaign:${campaignId}`, 'progress');

    await CampaignReport.update(
      { status: 'stopped', sent_porcent: parseFloat(progress) || 0 },
      { where: { campaign_id: campaignId } }
    );

    if (io) {
      io.to(`user_${userId}`).emit('campaigns', {
        event: 'failed',
        error: err.message,
        campaignId,
      });
    }

    logger.error(`Job ${job.id} failed with error: ${err.message}`, {
      jobId: job.id,
      campaignId,
      data: err,
    });

  } catch (error) {
    logger.error(`Error handling job failure for job ${job.id}: ${error.message}`, {
      jobId: job.id,
      campaignId,
      data: error,
    });
  }
});

export default jobQueue;
