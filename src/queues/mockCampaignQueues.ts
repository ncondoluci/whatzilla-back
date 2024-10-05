import Queue from 'bull';
import redisClient from '@/config/redis';
import { promises as fs } from 'fs';
import path from 'path';

// Create Bull queue for campaigns
const mockCampaignQueue = new Queue('campaignQueue', {
  redis: {
    host: '127.0.0.1',
    port: 6379,
  },
});

// Process queue in batches of 10 with a 5-second delay between each batch
mockCampaignQueue.process(10, async (job, done) => {
  const { campaignUid, message, recipients, isMock, mockFileId } = job.data;

  try {
    // If the job is a mock, load mock data from file
    let finalMessage = message;
    let finalRecipients = recipients;

    if (isMock && mockFileId) {
      const mockFilePath = path.join(__dirname, `../mock-data/${mockFileId}.json`);
      const fileData = await fs.readFile(mockFilePath, 'utf-8');
      const mockData = JSON.parse(fileData);

      finalMessage = mockData.message;
      finalRecipients = mockData.recipients;
    }

    // Simulate sending messages in batch (log the process)
    const promises = finalRecipients.map((recipient: string) =>
      new Promise<void>((resolve) => {
        console.log(`Mock: Sending message to ${recipient}: ${finalMessage}`);
        resolve();
      })
    );
    await Promise.all(promises);

    // Update progress in Redis (using await for Redis v4+ API)
    await redisClient.hSet(`campaign:${campaignUid}`, 'progress', '100%');

    done();
  } catch (error) {
    console.error(`Job failed with error: ${error.message}`);
    done(error);
  }
});

// Function to handle waiting if the campaign is paused
const waitUntilResumed = async (campaignUid: string): Promise<void> => {
  while (true) {
    const status = await new Promise<string>((resolve, reject) => {
      redisClient.hGet(`campaign:${campaignUid}`, 'status', (err, status) => {
        if (err) return reject(err);
        resolve(status || 'paused');
      });
    });
    if (status === 'active') return;
    console.log(`Campaign ${campaignUid} is paused. Waiting to resume...`);
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Check every second
  }
};

// Log when a job is added to the queue
mockCampaignQueue.on('waiting', (jobId) => {
  console.log(`Job ${jobId} is waiting to be processed.`);
});

// Log when a job becomes active
mockCampaignQueue.on('active', (job) => {
  console.log(`Job ${job.id} is now being processed.`);
});

// Log when a job is completed
mockCampaignQueue.on('completed', (job) => {
  console.log(`Job ${job.id} completed successfully.`);
});

// Log if a job fails
mockCampaignQueue.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed with error: ${err.message}`);
});

export default mockCampaignQueue;
