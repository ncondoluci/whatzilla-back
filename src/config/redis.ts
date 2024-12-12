import { createClient } from 'redis';

const redisClient = createClient({
  socket: {
    host: '127.0.0.1',
    port: 'redis',
  }
});

redisClient.on('error', (err) => {
  console.error('Redis error:', err);
});

redisClient.connect().catch((error) => {
  console.error('Could not connect to Redis:', error);
});

export default redisClient;
