const Redis = require('ioredis');

// Redis client singleton
let redisClient = null;

function createRedisClient() {
  if (!redisClient) {
    redisClient = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT) || 6380,
      password: process.env.REDIS_PASSWORD,
      tls: true,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis connected');
    });

    redisClient.on('error', (err) => {
      console.error('❌ Redis connection error:', err);
    });
  }
  return redisClient;
}

function getRedisClient() {
  return createRedisClient();
}

// Helper function to safely parse JSON from Redis
function parseRedisData(data) {
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch (err) {
    console.error('Error parsing Redis data:', err);
    return null;
  }
}

// Helper function to get all keys matching a pattern
async function getKeysByPattern(pattern) {
  const client = getRedisClient();
  try {
    return await client.keys(pattern);
  } catch (err) {
    console.error('Error getting keys:', err);
    return [];
  }
}

// Helper function to get multiple keys at once
async function getMultipleKeys(keys) {
  const client = getRedisClient();
  if (!keys || keys.length === 0) return [];
  
  try {
    const pipeline = client.pipeline();
    keys.forEach(key => pipeline.get(key));
    const results = await pipeline.exec();
    
    return results.map((result, index) => ({
      key: keys[index],
      data: parseRedisData(result[1])
    })).filter(item => item.data !== null);
  } catch (err) {
    console.error('Error getting multiple keys:', err);
    return [];
  }
}

module.exports = {
  getRedisClient,
  parseRedisData,
  getKeysByPattern,
  getMultipleKeys
};
