import { createClient } from 'redis';

let redisHost: any = Number(3366);
if(process.env.NODE_ENV === 'production') {
  redisHost = process.env.REDIS_HOST || 'redis';
}

const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379
  }
});

redisClient.on('error', (err) => {
  console.error('Redis error:', err);
});

redisClient.connect().catch((error) => {
  console.error('Could not connect to Redis:', error);
});

export default redisClient;
