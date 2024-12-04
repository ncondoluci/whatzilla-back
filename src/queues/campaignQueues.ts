import Queue from 'bull';
import redisClient from '@/config/redis';
import { Server } from 'socket.io';
import Campaign from '@/models/Campaign';
import CampaignReport from '@/models/CampaignReport';
import { logger } from '@/config/logger';
import { userState } from '@/sockets/socketManager';

export const jobQueue = new Queue('jobQueue', {
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

export const initializeQueueSocket = (ioInstance: Server) => {
  io = ioInstance;
};

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
    
    // Set campaign status to "running" and asign report ID to Campaign
    await Campaign.update({ status: 'running', last_report_id: reportId }, { where: { uid: campaign_id } });

    // Set the campaign status in redis
    await redisClient.hSet(`campaign_${campaign_id}`, 'status', 'running');

    let messagesSent = startFrom; 
    let lastEmittedProgress = (startFrom / totalMessages) * 100;
    // Process the job - Send campaign
    for (let i = startFrom; i < dataArray.length; i++) {
      const item = dataArray[i];

      try {
        const campaignStatus = await redisClient.hGet(`campaign_${campaign_id}`, 'status');
        const exitJob = await redisClient.hGet('GLOBAL', 'exitJob');
        
        if (campaignStatus === 'stopped' || exitJob === 'true') {
          logger.info(`Campaign ${campaign_id} has been ${campaignStatus}. Ending job.`);
          
          // Notify frontend
          if (io) {
            io.to(socketId).emit('campaigns', {
              event: 'stop',
              campaign_id,
              progress: `${((messagesSent / totalMessages) * 100).toFixed(2)}%`,
            });
          }

          return done(new Error('Paused: The campaign was stopped intentionally.'));
        }

        // Send message
        const recipientNumber = `${item.Whatsapp}@c.us`; 
        await client.sendMessage(recipientNumber, item.Mensaje)
          .then((response) => {
            logger.info(`Message sent to ${recipientNumber}`);
            
            io.to(socketId).emit('campaign', {
              event: 'sendMessage',
              campaingId: campaign_id ,
              data: {chatId: item.Numero, message: item.Mensaje}
            });
          })
          .catch((err:any) => {
            logger.error(`Mesagge for ${item.Numero} couldn't be sent: ${err}`);
            // Registrar la falla en redis

          });

        messagesSent += 1;
        const progress = (messagesSent / totalMessages) * 100;
        
        // Save progress
        await redisClient.hSet(`campaign_${campaign_id}`, 'progress', `${progress.toFixed(2)}%`);

        // Every 10%
        if (progress - lastEmittedProgress >= 10) {
          lastEmittedProgress = progress;

          await campaignReport.update({ sent_percent: progress });
          
          // Notify frontend about sending progress
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
        const errorMessage = error instanceof Error ? error.message : 'Unknow error';

        logger.error(`An error happened processing message ${messagesSent}: ${errorMessage}`, {
          campaign_id,
          jobId: job.id,
          data: error,
        });

        // Save report in DDBB
        await campaignReport.update({
          status: 'stopped',
          sent_percent: (messagesSent / totalMessages) * 100,
        });

        if (io) {
          // Notify frontend about sending progress
          io.to(socketId).emit('campaigns', {
            event: 'failed',
            error: `Error processing message ${messagesSent}: ${errorMessage}`,
            campaign_id,
          });
        }

        throw error;
      }
    }

    await campaignReport.update({ status: 'sent', sent_percent: 100 });

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

jobQueue.on('completed', async (job) => {
  const { campaign_id, user_id, sessionId, reportId } = job.data;
  const user = userState.get(user_id);
  const client = user[`session_${sessionId}`];
  const socketId = user.socketId;

  try {
    // Save progress in Report
    await CampaignReport.update(
      { status: 'sent', sent_percent: 100 },
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
      io.to(socketId).emit('campaigns', {
        event: 'completed',
        campaign_id,
      });
    }

    logger.info(`Job ${job.id} completed successfully.`);
  } catch (error) {
    if (error instanceof Error) {
      
      logger.error(`Error marking job ${job.id} as completed: ${error.message}`, {
        jobId: job.id,
        campaign_id,
        data: error,
      });

    } else {
      logger.error(`Unknow error happened while handling failure on job ${job.id}`);
    }
  }
});

jobQueue.on('failed', async (job, err) => {
  const { campaign_id, user_id, sessionId, reportId } = job.data;
  
  const user = userState.get(user_id);
  const client = user[`session_${sessionId}`];
  const socketId = user.socketId;;

  try {
    const progress = await redisClient.hGet(`campaign_${campaign_id}`, 'progress');

    // Save progress for report
    await CampaignReport.update(
      { status: 'stopped', sent_percent: parseFloat(progress?.replace('%', '') || '0') },
      { where: { uid: reportId } }
    );
    
    // Save status for campaign
    await Campaign.update({ status: 'stopped' }, { where: { uid: campaign_id } });

    // Notify front
    if (io) {
      io.to(socketId).emit('campaigns', {
        event: 'failed',
        error: err.message,
        campaign_id,
      });
    }

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
      logger.error(`Unknow error happened while handling failure on job ${job.id}`);
    }
  }
});

export default jobQueue;
