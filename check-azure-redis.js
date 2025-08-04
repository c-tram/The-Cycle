// Quick script to check what keys exist in Azure Redis
const Redis = require('./src/express-backend/node_modules/ioredis');

async function checkAzureRedis() {
  const client = new Redis({
    host: 'thecycle-redis.redis.cache.windows.net',
    port: 6380,
    password: process.env.REDIS_PASSWORD,
    tls: {
      servername: 'thecycle-redis.redis.cache.windows.net',
    },
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    maxRetriesPerRequest: 3,
  });
  try {
    console.log('✅ Connected to Azure Redis');
    
    // Check for team keys
    const teamKeys = await client.keys('team:*:season');
    console.log(`\n📊 Team season keys found: ${teamKeys.length}`);
    teamKeys.slice(0, 5).forEach(key => console.log(`  - ${key}`));
    
    // Check for team game keys  
    const teamGameKeys = await client.keys('team:*:2025:????-??-??');
    console.log(`\n🎮 Team game keys found: ${teamGameKeys.length}`);
    teamGameKeys.slice(0, 5).forEach(key => console.log(`  - ${key}`));
    
    // Check for player season keys
    const playerSeasonKeys = await client.keys('player:*:season');
    console.log(`\n👤 Player season keys found: ${playerSeasonKeys.length}`);
    playerSeasonKeys.slice(0, 3).forEach(key => console.log(`  - ${key}`));
    
    await client.quit();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAzureRedis();
