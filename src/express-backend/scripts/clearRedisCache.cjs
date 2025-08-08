// Script to clear all keys in the Azure Redis cache (DANGER: this will delete all data!)
// Usage: node src/express-backend/scripts/clearRedisCache.cjs


// Load environment variables from .env file
require('dotenv').config();
const Redis = require('ioredis');

// Use environment variables for Redis connection
const redisClient = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
});

async function clearRedisCache() {
  const keys = await redisClient.keys('*');
  if (keys.length === 0) {
    console.log('Redis cache is already empty.');
    redisClient.disconnect();
    return;
  }
  await redisClient.del(...keys);
  console.log(`Deleted ${keys.length} keys from Redis cache.`);
  redisClient.disconnect();
}

clearRedisCache()
  .then(() => process.exit(0))
  .catch(err => { console.error(err); process.exit(1); });
