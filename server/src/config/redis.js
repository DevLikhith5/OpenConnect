import Redis from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';

/**
 * Optional Redis for Socket.IO horizontal scaling (pub/sub adapter).
 * If REDIS_URL is unset, returns null and the app runs single-instance.
 */
export function createRedisClients() {
  const url = process.env.REDIS_URL;
  if (!url) return null;

  const pubClient = new Redis(url, { maxRetriesPerRequest: null });
  const subClient = pubClient.duplicate();

  pubClient.on('error', (err) => console.error('Redis pub error:', err.message));
  subClient.on('error', (err) => console.error('Redis sub error:', err.message));

  return { pubClient, subClient, adapter: createAdapter(pubClient, subClient) };
}
