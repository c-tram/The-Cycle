// Script to clear all split-related keys from the Azure Redis cache
// Usage: node src/express-backend/scripts/clearSplitCache.cjs

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

async function clearSplitCache() {
  console.log('🎯 Clearing all split-related keys from Redis cache...\n');

  // Get all split-related keys
  const splitKeys = await redisClient.keys('split:*');
  const splitGameKeys = await redisClient.keys('split-game:*');
  const gameSplitsIndexKeys = await redisClient.keys('game-splits-index:*');
  const playerSplitsIndexKeys = await redisClient.keys('player-splits-index:*');
  
  // Combine all split-related keys
  const allSplitKeys = [
    ...splitKeys,
    ...splitGameKeys, 
    ...gameSplitsIndexKeys,
    ...playerSplitsIndexKeys
  ];

  if (allSplitKeys.length === 0) {
    console.log('✅ No split keys found in Redis cache - already clean!');
    redisClient.disconnect();
    return;
  }
  
  console.log(`📊 Found split-related keys to delete:`);
  console.log(`   🔹 Aggregate splits: ${splitKeys.length}`);
  console.log(`   🔹 Game-specific splits: ${splitGameKeys.length}`);
  console.log(`   🔹 Game index keys: ${gameSplitsIndexKeys.length}`);
  console.log(`   🔹 Player index keys: ${playerSplitsIndexKeys.length}`);
  console.log(`   📈 Total: ${allSplitKeys.length} keys\n`);
  
  console.log('🗑️ Processing deletions in batches...');
  
  // Delete keys in batches to avoid call stack overflow
  const batchSize = 1000;
  let deletedCount = 0;
  
  for (let i = 0; i < allSplitKeys.length; i += batchSize) {
    const batch = allSplitKeys.slice(i, i + batchSize);
    await redisClient.del(batch);
    deletedCount += batch.length;
    console.log(`   ✅ Deleted batch ${Math.floor(i/batchSize) + 1}: ${deletedCount}/${allSplitKeys.length} keys`);
  }
  
  // Verify cleanup
  const remainingSplitKeys = await redisClient.keys('split*');
  
  console.log(`\n🎉 Split cache cleanup complete!`);
  console.log(`✅ Successfully deleted ${deletedCount} split-related keys`);
  console.log(`🔍 Remaining split keys: ${remainingSplitKeys.length}`);
  
  if (remainingSplitKeys.length > 0) {
    console.log('⚠️ Some split keys may remain:');
    remainingSplitKeys.slice(0, 5).forEach(key => console.log(`   - ${key}`));
    if (remainingSplitKeys.length > 5) {
      console.log(`   ... and ${remainingSplitKeys.length - 5} more`);
    }
  }
  
  // Show what's preserved
  const salaryKeys = await redisClient.keys('salary:*');
  const playerKeys = await redisClient.keys('player:*');
  const teamKeys = await redisClient.keys('team:*');
  
  console.log(`\n🔒 Preserved data:`);
  console.log(`   💰 Salary keys: ${salaryKeys.length}`);
  console.log(`   👤 Player boxscore keys: ${playerKeys.length}`);  
  console.log(`   🏟️ Team boxscore keys: ${teamKeys.length}`);
  
  redisClient.disconnect();
}

clearSplitCache()
  .then(() => {
    console.log('\n✅ Split cache clearing completed successfully!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Split cache clearing failed:', err);
    process.exit(1);
  });
