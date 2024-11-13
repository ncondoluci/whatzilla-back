import { logger } from "@/config/logger";
import redisClient from "@/config/redis";

export const stopAndRemoveJob = async (campaign_id: string) => {
    const jobStatus = await redisClient.hGet(`campaign_${campaign_id}`, 'status');

        if (jobStatus === 'running') {
            logger.info(`Stoping and removing job for campaign ${campaign_id}`);

            await redisClient.hSet(`campaign_${campaign_id}`, 'status', 'stopped');
            
            return {success: true, message: `Campaign ${campaign_id} stopped.`};
        }

    return {success: false, message: `Campaign ${campaign_id} not running.`};
}