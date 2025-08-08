// Script to query Redis for team and player stats
// Usage: node scripts/queryRedisStats.cjs

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

async function queryStats() {
  console.log('🔍 Exploring Redis data structure...\n');
  
  try {
    // First, let's see what keys exist in Redis
    console.log('📋 Scanning for all keys...');
    const allKeys = await redisClient.keys('*');
    console.log(`Found ${allKeys.length} total keys in Redis\n`);
    
    if (allKeys.length === 0) {
      console.log('❌ No keys found in Redis. Database might be empty.');
      return;
    }
    
    // Group keys by type
    const playerKeys = allKeys.filter(key => key.startsWith('player:'));
    const teamKeys = allKeys.filter(key => key.startsWith('team:'));
    
    console.log(`📊 Found ${teamKeys.length} team keys and ${playerKeys.length} player keys\n`);
    
    // Show sample keys
    console.log('🔍 Sample keys structure:');
    console.log('Team keys (first 5):');
    teamKeys.slice(0, 5).forEach(key => console.log(`  - ${key}`));
    
    console.log('\nPlayer keys (first 10):');
    playerKeys.slice(0, 10).forEach(key => console.log(`  - ${key}`));
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // Try to find Houston Astros data
    console.log('🔍 Looking for Houston Astros data...');
    const houKeys = allKeys.filter(key => key.includes('HOU'));
    console.log(`Found ${houKeys.length} keys containing 'HOU':`);
    houKeys.slice(0, 10).forEach(key => console.log(`  - ${key}`));
    
    if (houKeys.length > 0) {
      console.log('\n📊 Sample HOU data:');
      const sampleKey = houKeys[0];
      const sampleData = await redisClient.get(sampleKey);
      console.log(`Key: ${sampleKey}`);
      console.log('Data:', JSON.stringify(JSON.parse(sampleData), null, 2));
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // Look for Jose Altuve specifically
    console.log('⚾ Looking for Jose Altuve data...');
    const altuveKeys = allKeys.filter(key => key.includes('Altuve') || key.includes('ALTUVE'));
    console.log(`Found ${altuveKeys.length} keys containing 'Altuve':`);
    altuveKeys.forEach(key => console.log(`  - ${key}`));
    
    if (altuveKeys.length > 0) {
      console.log('\n⚾ Sample Altuve data:');
      const altuveKey = altuveKeys[0];
      const altuveData = await redisClient.get(altuveKey);
      console.log(`Key: ${altuveKey}`);
      console.log('Data:', JSON.stringify(JSON.parse(altuveData), null, 2));
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // Look for any season summary data
    console.log('📈 Looking for season summary data...');
    const seasonKeys = allKeys.filter(key => key.includes('season') || key.includes('2025'));
    console.log(`Found ${seasonKeys.length} keys with season/2025 data:`);
    seasonKeys.slice(0, 10).forEach(key => console.log(`  - ${key}`));
    
    if (seasonKeys.length > 0) {
      console.log('\n📈 Sample season data:');
      const seasonKey = seasonKeys[0];
      const seasonData = await redisClient.get(seasonKey);
      console.log(`Key: ${seasonKey}`);
      console.log('Data:', JSON.stringify(JSON.parse(seasonData), null, 2));
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // Test the API endpoint pattern that the frontend uses
    console.log('🔍 Testing API-style queries...');
    
    // Look for keys that match the API pattern
    const apiPlayerKeys = allKeys.filter(key => key.match(/^player:.*-\d{4}:season$/));
    console.log(`Found ${apiPlayerKeys.length} keys matching API player pattern:`);
    apiPlayerKeys.slice(0, 5).forEach(key => console.log(`  - ${key}`));
    
    const apiTeamKeys = allKeys.filter(key => key.match(/^team:.*-\d{4}:season$/));
    console.log(`Found ${apiTeamKeys.length} keys matching API team pattern:`);
    apiTeamKeys.slice(0, 5).forEach(key => console.log(`  - ${key}`));
    
    // Get some actual data to verify the API can read it
    if (apiPlayerKeys.length > 0) {
      console.log('\n⚾ Sample API-style player data:');
      const playerKey = apiPlayerKeys[0];
      const playerData = await redisClient.get(playerKey);
      console.log(`Key: ${playerKey}`);
      if (playerData) {
        const parsedData = JSON.parse(playerData);
        console.log('Data preview:');
        console.log(`  Game Count: ${parsedData.gameCount}`);
        console.log(`  Position: ${parsedData.position}`);
        console.log(`  Batting Average: ${parsedData.avg}`);
        console.log(`  Home Runs: ${parsedData.homeRuns}`);
        console.log(`  RBI: ${parsedData.rbi}`);
      }
    }
    
    // Test a specific API call like the frontend would make
    console.log('\n' + '='.repeat(60) + '\n');
    console.log('🧪 Testing frontend-style API patterns...');
    
    // Simulate what the frontend API calls look for
    const testPatterns = [
      'player:*-2025:season',
      'team:*-2025:season', 
      'player:HOU-*-2025:season',
      'player:*Jose*-2025:season'
    ];
    
    for (const pattern of testPatterns) {
      console.log(`\nTesting pattern: ${pattern}`);
      const matchingKeys = allKeys.filter(key => {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        return regex.test(key);
      });
      console.log(`Found ${matchingKeys.length} matches:`);
      matchingKeys.slice(0, 3).forEach(key => console.log(`  - ${key}`));
    }
    
  } catch (error) {
    console.error('❌ Error querying Redis:', error);
  }
  
  console.log('\n✅ Redis exploration complete.');
  redisClient.disconnect();
}

queryStats().catch(err => { 
  console.error('❌ Script error:', err); 
  redisClient.disconnect();
  process.exit(1); 
});
