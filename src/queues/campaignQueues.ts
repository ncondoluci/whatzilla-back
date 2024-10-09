import Queue from 'bull';
import redisClient from '@/config/redis';
import { Server } from 'socket.io';

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

  for (const item of dataArray) {
    console.log(`Nombre: ${item.Nombre}, Mensaje: ${item.Mensaje}`);

    messagesSent += 1;

    const progress = (messagesSent / totalMessages) * 100;
    await redisClient.hSet(`campaign:${campaignId}`, 'progress', `${progress.toFixed(2)}%`);

    // Emitir el progreso al usuario
    if (io && progress - lastEmittedProgress >= 10) {
      lastEmittedProgress = progress;
      io.to(`user_${userId}`).emit('campaignProgress', {
        campaignId,
        progress: `${progress.toFixed(2)}%`,
      });
    }

    // Retrasar el procesamiento del siguiente mensaje por 5 segundos
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  done();
});

jobQueue.on('completed', (job) => {
  const { campaignId, userId } = job.data;

  if (io) {
    io.to(`user_${userId}`).emit('campaignCompleted', { campaignId });
  }
  
  console.log(`Job ${job.id} completed successfully.`);
});

jobQueue.on('failed', (job, err) => {
  const { campaignId, userId } = job.data;
  
  if (io) {
    io.to(`user_${userId}`).emit('campaignFailed', {
      campaignId,
      error: err.message,
    });
  }
  
  console.error(`Job ${job.id} failed with error: ${err.message}`);
});

export default jobQueue;
