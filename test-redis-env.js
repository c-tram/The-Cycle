#!/usr/bin/env node

/**
 * Test script to verify Redis environment configuration
 * Run this before deployment to verify environment variables
 */

console.log('=== Redis Environment Configuration Test ===');
console.log('');

// Check all Redis-related environment variables
const envVars = {
  REDIS_HOST: process.env.REDIS_HOST,
  REDIS_PORT: process.env.REDIS_PORT,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD ? '[CONFIGURED]' : '[NOT SET]',
  REDIS_TLS: process.env.REDIS_TLS,
  REDIS_AUTH_MODE: process.env.REDIS_AUTH_MODE,
  NODE_ENV: process.env.NODE_ENV
};

console.log('Current Environment Variables:');
console.log('================================');
Object.entries(envVars).forEach(([key, value]) => {
  const status = value ? '✅' : '❌';
  console.log(`${status} ${key}: ${value || '[NOT SET]'}`);
});

console.log('\n=== Configuration Analysis ===');

// Determine if this looks like a proper Azure Redis configuration
const hasAzureRedis = process.env.REDIS_HOST && 
                     process.env.REDIS_HOST !== 'localhost' && 
                     process.env.REDIS_HOST !== '127.0.0.1';

if (hasAzureRedis) {
  console.log('✅ Azure Redis appears to be configured');
  
  // Check for common Azure Redis patterns
  if (process.env.REDIS_HOST.includes('.redis.cache.windows.net')) {
    console.log('✅ Redis host matches Azure Redis Cache pattern');
  } else {
    console.log('⚠️  Redis host does not match typical Azure Redis Cache pattern');
  }
  
  if (process.env.REDIS_PORT === '6380') {
    console.log('✅ Redis port is 6380 (Azure Redis SSL port)');
  } else {
    console.log(`⚠️  Redis port is ${process.env.REDIS_PORT}, expected 6380 for Azure Redis SSL`);
  }
  
  if (process.env.REDIS_TLS === 'true') {
    console.log('✅ TLS is enabled');
  } else {
    console.log('⚠️  TLS is not enabled - Azure Redis typically requires TLS');
  }
  
  if (process.env.REDIS_PASSWORD || process.env.REDIS_AUTH_MODE === 'aad') {
    console.log('✅ Authentication is configured');
  } else {
    console.log('❌ No authentication configured - Redis will likely fail to connect');
  }
} else {
  console.log('ℹ️  No Azure Redis configured - application will use in-memory caching');
  console.log('   This is normal for local development or when Redis is not available');
}

console.log('\n=== Expected Behavior ===');
if (hasAzureRedis) {
  console.log('🔄 Application will attempt to connect to Azure Redis');
  console.log('📊 Caching will use Redis for persistence');
  console.log('🚨 If Redis connection fails, app will gracefully fall back to in-memory caching');
} else {
  console.log('💾 Application will use in-memory caching');
  console.log('⚡ Cache will not persist between application restarts');
  console.log('📈 Performance may be slower for repeated data requests');
}

console.log('\n=== Next Steps ===');
if (hasAzureRedis) {
  console.log('1. Deploy the application to Azure');
  console.log('2. Check application logs for Redis connection status');
  console.log('3. Test /api/health endpoint to verify Redis status');
  console.log('4. Monitor application performance and Redis metrics');
} else {
  console.log('1. Configure Azure Redis environment variables in Azure Web Service');
  console.log('2. Redeploy the application');
  console.log('3. Or proceed with in-memory caching if Redis is not needed');
}

console.log('\n=== Test Complete ===');
