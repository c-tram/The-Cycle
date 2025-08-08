// Clear all salary data from Redis
// This script removes all salary keys to allow for re-scraping with correct character encoding
// Usage: node scripts/clearSalaryFromRedis.cjs [year]

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
 * Clear all salary data from Redis for a given year
 */
async function clearSalaryData(year = 2025) {
  console.log(`🧹 Starting salary data cleanup for ${year}...`);
  
  try {
    // Get all salary keys for the year
    const salaryPattern = `salary:*-${year}`;
    console.log(`🔍 Searching for keys matching pattern: ${salaryPattern}`);
    
    const salaryKeys = await redisClient.keys(salaryPattern);
    console.log(`📊 Found ${salaryKeys.length} salary keys to delete`);
    
    if (salaryKeys.length === 0) {
      console.log('✅ No salary data found - nothing to clear');
      return;
    }
    
    // Show some examples of what will be deleted
    console.log('\n📋 Sample keys to be deleted:');
    const sampleKeys = salaryKeys.slice(0, 5);
    for (const key of sampleKeys) {
      console.log(`   - ${key}`);
    }
    if (salaryKeys.length > 5) {
      console.log(`   ... and ${salaryKeys.length - 5} more`);
    }
    
    // Get team breakdown
    const teamCounts = {};
    for (const key of salaryKeys) {
      const keyParts = key.split(':')[1].split('-');
      if (keyParts.length >= 3) {
        const team = keyParts[0];
        teamCounts[team] = (teamCounts[team] || 0) + 1;
      }
    }
    
    console.log('\n📊 Breakdown by team:');
    for (const [team, count] of Object.entries(teamCounts).sort()) {
      console.log(`   ${team}: ${count} players`);
    }
    
    // Ask for confirmation (wait for user input)
    console.log(`\n⚠️  WARNING: This will delete ALL ${salaryKeys.length} salary records for ${year}!`);
    console.log('💡 After deletion, you should run: node scripts/collectSalaryData_v3.cjs 2025');
    console.log('\n🚀 Proceeding with deletion in 3 seconds...');
    
    // Wait 3 seconds to give user a chance to cancel
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Delete in batches to avoid overwhelming Redis
    const batchSize = 100;
    let deletedCount = 0;
    
    for (let i = 0; i < salaryKeys.length; i += batchSize) {
      const batch = salaryKeys.slice(i, i + batchSize);
      const result = await redisClient.del(...batch);
      deletedCount += result;
      
      const progress = Math.round((i + batch.length) / salaryKeys.length * 100);
      console.log(`🗑️  Deleted batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(salaryKeys.length/batchSize)} - Progress: ${progress}%`);
    }
    
    console.log(`\n✅ Successfully deleted ${deletedCount} salary records`);
    console.log(`📊 Expected: ${salaryKeys.length}, Actual: ${deletedCount}`);
    
    // Verify deletion
    const remainingKeys = await redisClient.keys(salaryPattern);
    if (remainingKeys.length === 0) {
      console.log('🎉 Verification passed - all salary data has been cleared');
    } else {
      console.log(`⚠️  Warning: ${remainingKeys.length} keys still remain:`, remainingKeys.slice(0, 5));
    }
    
    
  } catch (error) {
    console.error('❌ Error during salary data cleanup:', error);
  } finally {
    await redisClient.quit();
  }
}

/**
 * Clear salary data for specific teams only
 */
async function clearSalaryDataForTeams(teams, year = 2025) {
  console.log(`🧹 Starting salary data cleanup for teams: ${teams.join(', ')} (${year})...`);
  
  try {
    let allKeysToDelete = [];
    
    for (const team of teams) {
      const teamPattern = `salary:${team}-*-${year}`;
      const teamKeys = await redisClient.keys(teamPattern);
      allKeysToDelete = allKeysToDelete.concat(teamKeys);
      console.log(`📊 Found ${teamKeys.length} salary keys for ${team}`);
    }
    
    if (allKeysToDelete.length === 0) {
      console.log('✅ No salary data found for specified teams');
      return;
    }
    
    console.log(`\n🗑️  Deleting ${allKeysToDelete.length} salary records...`);
    
    // Delete in batches
    const batchSize = 100;
    let deletedCount = 0;
    
    for (let i = 0; i < allKeysToDelete.length; i += batchSize) {
      const batch = allKeysToDelete.slice(i, i + batchSize);
      const result = await redisClient.del(...batch);
      deletedCount += result;
    }
    
    console.log(`✅ Successfully deleted ${deletedCount} salary records for teams: ${teams.join(', ')}`);
    
  } catch (error) {
    console.error('❌ Error during team salary cleanup:', error);
  } finally {
    await redisClient.quit();
  }
}

// ============================================================================
// SCRIPT EXECUTION
// ============================================================================

if (require.main === module) {
  const year = process.argv[2] ? parseInt(process.argv[2]) : 2025;
  const teams = process.argv[3] ? process.argv[3].split(',') : null;
  
  console.log(`📋 Arguments parsed:`);
  console.log(`   Year: ${year}`);
  console.log(`   Teams: ${teams ? teams.join(', ') : 'ALL'}`);
  
  if (teams) {
    clearSalaryDataForTeams(teams, year).catch(error => {
      console.error('❌ Script execution failed:', error);
      process.exit(1);
    });
  } else {
    clearSalaryData(year).catch(error => {
      console.error('❌ Script execution failed:', error);
      process.exit(1);
    });
  }
}

module.exports = {
  clearSalaryData,
  clearSalaryDataForTeams
};
