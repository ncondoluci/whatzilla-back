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
let pausedCampaigns = {};

export const initializeJobQueue = (ioInstance: Server) => {
  io = ioInstance;
};

jobQueue.process(async (job, done) => {
  const { dataArray, totalMessages, startFrom = 0, campaignId, userId } = job.data;
  let messagesSent = startFrom; 
  let lastEmittedProgress = (startFrom / totalMessages) * 100;

  try {
    await Campaign.update({ sent_at: new Date() }, { where: { uid: campaignId } });

    const campaignReport = await CampaignReport.create({
      campaign_id: campaignId,
      status: 'running',
      sent_porcent: lastEmittedProgress,
      run_at: new Date(),
    });

    redisClient.hSet(`campaign:${campaignId}`, 'status', 'running');

    for (let i = startFrom; i < dataArray.length; i++) {
      const item = dataArray[i];

      try {
        const campaignStatus = await redisClient.hGet(`campaign:${campaignId}`, 'status');
        logger.info(`Estado actual de la campaña ${campaignId}: ${campaignStatus}`);

        if (campaignStatus === 'stopped' || campaignStatus === 'cancelled') {
          logger.info(`Campaña ${campaignId} ha sido ${campaignStatus}. Terminando el job.`);
  
          await campaignReport.update({
            status: campaignStatus, 
            sent_porcent: (messagesSent / totalMessages) * 100,
          });

          if (io) {
            io.to(`user_${userId}`).emit('campaigns', {
              event: 'stop',
              campaignId,
              progress: `${((messagesSent / totalMessages) * 100).toFixed(2)}%`,
            });
          }

          return done(new Error('Paused: The campaign was stopped intentionally.'));
        }

        logger.info(`Enviando mensaje a: ${item.Nombre}, WhatsApp: ${item.Whatsapp}, Mensaje: ${item.Mensaje}`);
        await whatsappSessionManager.sendMessage(userId, item.Mensaje, item.Whatsapp, io);

        messagesSent += 1;
        const progress = (messagesSent / totalMessages) * 100;

        // Actualizar el progreso en Redis
        await redisClient.hSet(`campaign:${campaignId}`, 'progress', `${progress.toFixed(2)}%`);

        // Emitir el progreso cada 10%
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

        // Evitar bloquear el proceso
        await new Promise((resolve) => setTimeout(resolve, 5000));

      } catch (error) {
        logger.error(`Error procesando el mensaje número ${messagesSent}: ${error.message}`, {
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
            error: `Error al procesar el mensaje número ${messagesSent}: ${error.message}`,
            campaignId,
          });
        }

        throw error;
      }
    }

    // Actualizar la campaña como enviada
    await Campaign.update({ sent_at: new Date() }, { where: { uid: campaignId } });
    await campaignReport.update({ status: 'sent', sent_porcent: 100 });

    // Finalizar el trabajo
    done(null, campaignReport.uid);

  } catch (error) {
    logger.error(`Error al procesar la campaña ${campaignId}: ${error.message}`);
    done(new Error(`Error al procesar la campaña ${campaignId}`));
  }
});

jobQueue.on('completed', async (job) => {
  const { campaignId, userId } = job.data;

  try {
    await Campaign.update({ sent_at: new Date() }, { where: { uid: campaignId } });

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
