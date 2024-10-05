import { Request, Response } from 'express';
import mockCampaignQueue from '@/queues/mockCampaignQueues';
import { promises as fs } from 'fs';
import path from 'path';

export const startMockCampaignFromFile = async (req: Request, res: Response): Promise<void> => {
  const { fileId } = req.body;

  if (!fileId) {
    res.status(400).send('Invalid request. Missing fileId.');
    return;
  }

  try {
    // Add the mock campaign to the Bull queue for processing
    mockCampaignQueue.add({
      campaignUid: `mock-campaign-${fileId}`,
      userUid: 'mock-user',
      isMock: true,
      mockFileId: fileId, // Pass the mock file ID to be processed
    });

    res.status(200).send('Mock campaign started successfully from file');
  } catch (error) {
    res.status(500).send('Failed to start mock campaign from file');
  }
};


