const Redis = require('ioredis');

// Load environment variables
require('dotenv').config();

// Redis client singleton
let redisClient = null;

function createRedisClient() {
  if (!redisClient) {
    // Debug environment variables
    console.log('🔍 Environment variables debug:', {
      REDIS_HOST: process.env.REDIS_HOST,
      REDIS_PORT: process.env.REDIS_PORT,
      REDIS_PASSWORD: process.env.REDIS_PASSWORD ? '[SET]' : '[NOT SET]',
      REDIS_TLS: process.env.REDIS_TLS,
      REDIS_AUTH_MODE: process.env.REDIS_AUTH_MODE,
      NODE_ENV: process.env.NODE_ENV
    });

    const redisConfig = {
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT) || 6380,
      password: process.env.REDIS_PASSWORD,
      tls: process.env.REDIS_TLS === 'true' ? {
        servername: process.env.REDIS_HOST,
        checkServerIdentity: () => undefined // Bypass certificate hostname validation for Azure
      } : undefined,
      db: 0,
      maxRetriesPerRequest: 5,
      retryDelayOnFailover: 1000,
      enableReadyCheck: true,
      connectTimeout: 30000,
      lazyConnect: true,
      keepAlive: true,
      family: 4 // Force IPv4
    };

    console.log('🔧 Redis configuration:', {
      host: redisConfig.host,
      port: redisConfig.port,
      tls: redisConfig.tls,
      hasPassword: !!redisConfig.password,
      authMode: process.env.REDIS_AUTH_MODE || 'key'
    });

    redisClient = new Redis(redisConfig);

    // Add comprehensive error handling for Redis connection
    redisClient.on('error', (error) => {
      console.error('🔴 Redis connection error:', error.message);
      if (error.code === 'ECONNRESET' || error.code === 'EPIPE') {
        console.log('🔄 Connection reset detected, Redis will auto-reconnect...');
      }
    });

    redisClient.on('connect', () => {
      console.log('🟢 Redis connected successfully');
    });

    redisClient.on('reconnecting', (ms) => {
      console.log(`🟡 Redis reconnecting in ${ms}ms...`);
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
