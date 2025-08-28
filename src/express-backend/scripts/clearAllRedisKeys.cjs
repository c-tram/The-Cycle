// Clear ALL keys from Redis
// This script removes EVERY key in the Redis database
// Usage: node scripts/clearAllRedisKeys.cjs [--confirm]

// Load environment variables from .env file
require('dotenv').config();

const Redis = require('ioredis');

// Simple Redis connection
const redisClient = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
});

/**
 * Clear ALL keys from Redis database
 */
async function clearAllKeys(skipConfirmation = false) {
  console.log('🧹 Starting complete Redis database cleanup...');
  
  try {
    // Get ALL keys in the database
    console.log('🔍 Searching for ALL keys in Redis...');
    const allKeys = await redisClient.keys('*');
    console.log(`📊 Found ${allKeys.length} total keys in Redis`);
    
    if (allKeys.length === 0) {
      console.log('✅ Redis database is already empty - nothing to clear');
      return;
    }
    
    // Analyze key patterns
    const keyPatterns = {};
    const keyPrefixes = {};
    
    for (const key of allKeys) {
      const prefix = key.split(':')[0];
      keyPrefixes[prefix] = (keyPrefixes[prefix] || 0) + 1;
      
      // Extract pattern (more detailed analysis)
      if (key.includes(':')) {
        const pattern = key.split(':').slice(0, 2).join(':');
        keyPatterns[pattern] = (keyPatterns[pattern] || 0) + 1;
      }
    }
    
    console.log('\n📋 Key distribution by prefix:');
    for (const [prefix, count] of Object.entries(keyPrefixes).sort()) {
      console.log(`   ${prefix}: ${count} keys`);
    }
    
    console.log('\n📋 Sample keys to be deleted:');
    const sampleKeys = allKeys.slice(0, 10);
    for (const key of sampleKeys) {
      console.log(`   - ${key}`);
    }
    if (allKeys.length > 10) {
      console.log(`   ... and ${allKeys.length - 10} more`);
    }
    
    if (!skipConfirmation) {
      // Ask for confirmation
      console.log(`\n⚠️  🚨 CRITICAL WARNING 🚨 ⚠️`);
      console.log(`This will DELETE ALL ${allKeys.length} keys from Redis!`);
      console.log('This includes:');
      console.log('  • All player statistics');
      console.log('  • All team data');
      console.log('  • All cached results');
      console.log('  • All splits data');
      console.log('  • ALL other data in Redis');
      console.log('');
      console.log('💡 After deletion, you will need to re-run ALL data collection scripts!');
      console.log('');
      console.log('🚀 To proceed, re-run with --confirm flag:');
      console.log('   node scripts/clearAllRedisKeys.cjs --confirm');
      console.log('');
      console.log('⏸️  Operation cancelled for safety');
      return;
    }
    
    console.log(`\n🚀 Proceeding with COMPLETE Redis cleanup in 5 seconds...`);
    console.log('⏹️  Press Ctrl+C to cancel!');
    
    // Wait 5 seconds to give user final chance to cancel
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('\n🗑️  Starting deletion process...');
    
    // Use FLUSHDB for maximum efficiency (clears entire database)
    console.log('🔥 Using FLUSHDB command for complete database clear...');
    await redisClient.flushdb();
    
    console.log('✅ Database cleared with FLUSHDB');
    
    // Verify deletion
    const remainingKeys = await redisClient.keys('*');
    if (remainingKeys.length === 0) {
      console.log('🎉 Verification passed - Redis database is completely empty');
    } else {
      console.log(`⚠️  Warning: ${remainingKeys.length} keys still remain:`, remainingKeys.slice(0, 10));
    }
    
    console.log('\n📝 Next steps:');
    console.log('  1. Run data collection scripts to rebuild the database:');
    console.log('     node scripts/pullBoxscoresToRedis_v2.cjs');
    console.log('     node scripts/pullPlayByPlaySplits.cjs');
    console.log('  2. Verify data with: node scripts/queryRedisStats.cjs');
    
  } catch (error) {
    console.error('❌ Error during complete Redis cleanup:', error);
  } finally {
    await redisClient.quit();
  }
}

/**
 * Alternative method: Delete keys in batches (safer but slower)
 */
async function clearAllKeysBatched(skipConfirmation = false) {
  console.log('🧹 Starting batched Redis cleanup (safer method)...');
  
  try {
    const allKeys = await redisClient.keys('*');
    console.log(`📊 Found ${allKeys.length} total keys in Redis`);
    
    if (allKeys.length === 0) {
      console.log('✅ Redis database is already empty');
      return;
    }
    
    if (!skipConfirmation) {
      console.log(`\n⚠️  WARNING: This will delete ALL ${allKeys.length} keys!`);
      console.log('🚀 To proceed, re-run with --confirm flag');
      return;
    }
    
    // Delete in batches to be safer
    const batchSize = 100;
    let deletedCount = 0;
    
    console.log('\n🗑️  Deleting keys in batches...');
    for (let i = 0; i < allKeys.length; i += batchSize) {
      const batch = allKeys.slice(i, i + batchSize);
      const result = await redisClient.del(...batch);
      deletedCount += result;
      
      const progress = Math.round((i + batch.length) / allKeys.length * 100);
      console.log(`🗑️  Deleted batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(allKeys.length/batchSize)} - Progress: ${progress}%`);
    }
    
    console.log(`✅ Successfully deleted ${deletedCount} keys using batched method`);
    
  } catch (error) {
    console.error('❌ Error during batched cleanup:', error);
  } finally {
    await redisClient.quit();
  }
}

// ============================================================================
// SCRIPT EXECUTION
// ============================================================================

if (require.main === module) {
  const args = process.argv.slice(2);
  const skipConfirmation = args.includes('--confirm');
  const useBatched = args.includes('--batched');
  
  console.log(`📋 Redis Clear All Keys Script`);
  console.log(`   Mode: ${useBatched ? 'Batched (safer)' : 'FLUSHDB (faster)'}`);
  console.log(`   Confirmation: ${skipConfirmation ? 'SKIPPED' : 'Required'}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  
  if (useBatched) {
    clearAllKeysBatched(skipConfirmation).catch(error => {
      console.error('❌ Script execution failed:', error);
      process.exit(1);
    });
  } else {
    clearAllKeys(skipConfirmation).catch(error => {
      console.error('❌ Script execution failed:', error);
      process.exit(1);
    });
  }
}

module.exports = {
  clearAllKeys,
  clearAllKeysBatched
};
