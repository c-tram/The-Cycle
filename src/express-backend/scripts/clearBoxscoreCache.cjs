// Script to clear boxscore data from the Azure Redis cache (preserves salary data)
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
  // Get boxscore-related keys (exclude salary data)
  const playerKeys = await redisClient.keys('player:*');
  const teamKeys = await redisClient.keys('team:*');
  const matchupKeys = await redisClient.keys('player-vs-team:*');
  
  // Filter out salary keys from player keys
  const boxscoreKeys = [
    ...playerKeys.filter(key => !key.includes('salary')),
    ...teamKeys,
    ...matchupKeys
  ];
  
  if (boxscoreKeys.length === 0) {
    console.log('No boxscore data found in Redis cache.');
    redisClient.disconnect();
    return;
  }
  
  console.log(`Found ${boxscoreKeys.length} boxscore keys to delete (preserving salary data). Processing in batches...`);
  
  // Delete keys in batches to avoid call stack overflow
  const batchSize = 1000;
  let deletedCount = 0;
  
  for (let i = 0; i < boxscoreKeys.length; i += batchSize) {
    const batch = boxscoreKeys.slice(i, i + batchSize);
    await redisClient.del(batch);
    deletedCount += batch.length;
    console.log(`Deleted batch ${Math.floor(i/batchSize) + 1}: ${deletedCount}/${boxscoreKeys.length} keys`);
  }
  
  // Show preserved data count
  const salaryKeys = await redisClient.keys('salary:*');
  console.log(`✅ Successfully deleted ${deletedCount} boxscore keys from Redis cache.`);
  console.log(`🔒 Preserved ${salaryKeys.length} salary keys in Redis cache.`);
  redisClient.disconnect();
}

clearRedisCache()
  .then(() => process.exit(0))
  .catch(err => { console.error(err); process.exit(1); });
