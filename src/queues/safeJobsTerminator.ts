import { logger } from "@/config/logger";
import jobQueue from "./campaignQueues";
import redisClient from "@/config/redis";
import { userState } from "@/sockets/socketManager";
import Campaign from "@/models/Campaign";
import CampaignReport from "@/models/CampaignReport";
import { Job } from "bull";

export async function safeJobTerminator(): Promise<number> {
  redisClient.hSet('GLOBAL', 'exitJob', 'true');

  while (true) {
    const activeJobs: Job<any>[] = await jobQueue.getJobs(['active', 'waiting', 'delayed']);
    if (activeJobs.length === 0) {
      break;
    }

    logger.info(`Aún hay ${activeJobs.length} trabajos activos, esperando...`);
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  logger.info('Todos los trabajos han terminado.');
  
  await redisClient.hSet('GLOBAL', 'exitJob', 'false');
  return 0;
}
