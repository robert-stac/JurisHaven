import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

let redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
// Automatically remap Docker hostnames to localhost if running on native Windows instead of inside Docker
if (process.platform === 'win32' && redisUrl.includes('redis://redis')) {
  redisUrl = redisUrl.replace('redis://redis', 'redis://localhost');
}

export const redisConnection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
});

redisConnection.on('connect', () => console.log('✅ Redis connected'));
redisConnection.on('error', (err) => console.error('❌ Redis error:', err));

export default redisConnection;
