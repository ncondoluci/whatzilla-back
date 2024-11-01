import Queue from 'bull';
import redisClient from '@/config/redis';
import { Server } from 'socket.io';
import Campaign from '@/models/Campaign';
import CampaignReport from '@/models/CampaignReport';
import { logger } from '@/config/logger';
import { userState } from '@/sockets/socketManager';

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
  const { dataArray, totalMessages, startFrom = 0, campaign_id, reportId = '', user_id , } = job.data;
  const {socketId, client} = userState.get(user_id);
  let messagesSent = startFrom; 
  let lastEmittedProgress = (startFrom / totalMessages) * 100;

  try {
    await Campaign.update({ sent_at: new Date() }, { where: { uid: campaign_id } });

    let campaignReport;
    if ( !reportId ) {
      campaignReport = await CampaignReport.create({
        campaign_id,
        status: 'running',
        sent_porcent: lastEmittedProgress,
        run_at: new Date(),
      });
    } else {
      campaignReport = await CampaignReport.findOne({where: { uid: reportId}})

      if (!campaignReport) {
        throw new Error(`Campaign report with uid ${reportId} not found`);
      }
    }


    await redisClient.hSet(`campaign_${campaign_id}`, 'status', 'running');

    for (let i = startFrom; i < dataArray.length; i++) {
      const item = dataArray[i];

      try {
        const campaignStatus = await redisClient.hGet(`campaign_${campaign_id}`, 'status');
        logger.info(`Estado actual de la campaña ${campaign_id}: ${campaignStatus}`);

        if (campaignStatus === 'stopped' || campaignStatus === 'cancelled') {
          logger.info(`Campaña ${campaign_id} ha sido ${campaignStatus}. Terminando el job.`);
  
          await campaignReport.update({
            status: campaignStatus, 
            sent_porcent: (messagesSent / totalMessages) * 100,
          });

          if (io) {
            io.to(socketId).emit('campaigns', {
              event: 'stop',
              campaign_id,
              progress: `${((messagesSent / totalMessages) * 100).toFixed(2)}%`,
            });
          }

          return done(new Error('Paused: The campaign was stopped intentionally.'), campaignReport);
        }
        const recipientNumber = `${item.Whatsapp}@c.us`; 
        await client.sendMessage(recipientNumber, item.Mensaje);

        messagesSent += 1;
        const progress = (messagesSent / totalMessages) * 100;

        await redisClient.hSet(`campaign_${campaign_id}`, 'progress', `${progress.toFixed(2)}%`);

        // Every 10%
        if (progress - lastEmittedProgress >= 10) {
          lastEmittedProgress = progress;

          await campaignReport.update({ sent_porcent: progress });

          if (io) {
            io.to(socketId).emit('campaigns', {
              event: 'progress',
              campaign_id,
              progress: `${progress.toFixed(2)}%`,
            });
          }
        }

        // For non-blocking pourposse
        await new Promise((resolve) => setTimeout(resolve, 5000));

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

        logger.error(`Error procesando el mensaje número ${messagesSent}: ${errorMessage}`, {
          campaign_id,
          jobId: job.id,
          data: error,
        });

        await campaignReport.update({
          status: 'stopped',
          sent_porcent: (messagesSent / totalMessages) * 100,
        });

        if (io) {
          io.to(socketId).emit('campaigns', {
            event: 'failed',
            error: `Error al procesar el mensaje número ${messagesSent}: ${errorMessage}`,
            campaign_id,
          });
        }

        throw error;
      }
    }

    await Campaign.update({ sent_at: new Date() }, { where: { uid: campaign_id } });
    await campaignReport.update({ status: 'sent', sent_porcent: 100 });

    done(null, campaignReport);

  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Error al procesar la campaña ${campaign_id}: ${error.message}`);
      done(new Error(`Error al procesar la campaña ${campaign_id}: ${error.message}`));
    } else {
      logger.error(`Error desconocido al procesar la campaña ${campaign_id}`);
      done(new Error(`Error desconocido al procesar la campaña ${campaign_id}`));
    }
  }finally {
    // Cerrar el navegador Puppeteer al finalizar
    try {
      if (client && typeof client.pupBrowser === 'function') {
        const browser = await client.pupBrowser();
        await browser.close();  // Cerrar el navegador Puppeteer
        logger.info(`Navegador Puppeteer cerrado para el usuario ${user_id}`);
      }
    } catch (error) {
      logger.error(`Error al cerrar el navegador Puppeteer para el usuario ${user_id}:`, { error });
    }
  }
});

jobQueue.on('completed', async (job) => {
  const { campaign_id, user_id } = job.data;
  const {socketId, client} = userState.get(user_id);
    


  try {
    await Campaign.update({ sent_at: new Date() }, { where: { uid: campaign_id } });

    if (io) {
      io.to(socketId).emit('campaigns', {
        event: 'completed',
        campaign_id,
      });
    }

    // Remove redis state
    await redisClient.del(`campaign_${campaign_id}`);

    // Delete session data from client Singleton instance
    const newState = userState.get(user_id);
    if (newState) {
      delete newState[client];
      userState.set(user_id, newState);
    }
    await client.logout();
    await client.destroy();

    logger.info(`Job ${job.id} completed successfully.`);
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Error marking job ${job.id} as completed: ${error.message}`, {
        jobId: job.id,
        campaignId,
        data: error,
      });
    } else {
      logger.error(`Error desconocido al marcar el trabajo ${job.id} como completado`);
    }
  }
});

jobQueue.on('failed', async (job, err) => {
  const { campaign_id, user_id, campaignReport } = job.data;
  const {socketId, client} = userState.get(user_id);

  try {
    const progress = await redisClient.hGet(`campaign_${campaign_id}`, 'progress');

    await CampaignReport.update(
      { status: 'stopped', sent_porcent: Number(progress) || 0 },
      { where: { uid: campaignReport } }
    );

    if (io) {
      io.to(socketId).emit('campaigns', {
        event: 'failed',
        error: err.message,
        campaign_id,
      });
    }

    // Remove redis state
    await redisClient.del(`campaign_${campaign_id}`);

    // Delete session data from client Singleton instance
    const newState = userState.get(user_id);
    if (newState) {
      delete newState[client];
      userState.set(user_id, newState);
    }

    await client.logout();
    await client.destroy();

    logger.error(`Job ${job.id} failed with error: ${err.message}`, {
      jobId: job.id,
      campaign_id,
      data: err,
    });

  } catch (error) {
    if(error instanceof Error) {
      logger.error(`Error handling job failure for job ${job.id}: ${error.message}`, {
        jobId: job.id,
        campaign_id,
        data: error,
      });
    } else {
      logger.error(`Error desconocido al manejar la falla del trabajo para el trabajo ${job.id}`);
    }
  }
});

export default jobQueue;
