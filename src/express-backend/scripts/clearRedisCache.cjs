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
  
  console.log(`Found ${keys.length} keys to delete. Processing in batches...`);
  
  // Delete keys in batches to avoid call stack overflow
  const batchSize = 1000;
  let deletedCount = 0;
  
  for (let i = 0; i < keys.length; i += batchSize) {
    const batch = keys.slice(i, i + batchSize);
    await redisClient.del(batch);
    deletedCount += batch.length;
    console.log(`Deleted batch ${Math.floor(i/batchSize) + 1}: ${deletedCount}/${keys.length} keys`);
  }
  
  console.log(`✅ Successfully deleted ${deletedCount} keys from Redis cache.`);
  redisClient.disconnect();
}

clearRedisCache()
  .then(() => process.exit(0))
  .catch(err => { console.error(err); process.exit(1); });
