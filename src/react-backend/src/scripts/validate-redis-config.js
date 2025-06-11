#!/usr/bin/env node

/**
 * Redis Configuration Validation Script
 * This script validates Redis environment variables and provides helpful debug information
 */

console.log('=== Redis Configuration Validation ===');
console.log('');

// Environment variables to check
const envVars = {
  REDIS_HOST: process.env.REDIS_HOST,
  REDIS_PORT: process.env.REDIS_PORT,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD ? '[REDACTED]' : undefined,
  REDIS_TLS: process.env.REDIS_TLS,
  REDIS_AUTH_MODE: process.env.REDIS_AUTH_MODE,
  NODE_ENV: process.env.NODE_ENV
};

console.log('Environment Variables:');
Object.entries(envVars).forEach(([key, value]) => {
  console.log(`  ${key}: ${value || 'undefined'}`);
});

console.log('');

// Determine caching strategy
let cachingStrategy = 'unknown';
let redisConfigured = false;

if (!process.env.REDIS_HOST || process.env.REDIS_HOST === 'localhost' || process.env.REDIS_HOST === '127.0.0.1') {
  cachingStrategy = 'in-memory/file fallback';
  console.log('✅ Redis not configured or set to localhost - will use in-memory/file fallback');
  console.log('   This is expected behavior for local development or when Azure Redis is not available');
} else {
  redisConfigured = true;
  if (process.env.REDIS_AUTH_MODE === 'aad') {
    cachingStrategy = 'Azure Redis with AAD authentication';
    console.log('🔐 Azure Redis with AAD authentication configured');
  } else {
    cachingStrategy = 'Azure Redis with key authentication';
    console.log('🔑 Azure Redis with key authentication configured');
  }
  
  // Additional Azure Redis checks
  if (process.env.REDIS_TLS !== 'true') {
    console.log('⚠️  Warning: REDIS_TLS is not set to true for Azure Redis');
  }
  
  if (process.env.REDIS_PORT !== '6380') {
    console.log('⚠️  Warning: REDIS_PORT is not 6380 (standard for Azure Redis SSL)');
  }
}

console.log('');
console.log(`Caching Strategy: ${cachingStrategy}`);
console.log('');

// Test basic Redis configuration (without actually connecting)
if (redisConfigured) {
  console.log('Redis Configuration Test:');
  
  const config = {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379'),
    tls: process.env.REDIS_TLS === 'true',
    authMode: process.env.REDIS_AUTH_MODE || 'key'
  };
  
  console.log('  Configuration Object:');
  console.log(`    Host: ${config.host}`);
  console.log(`    Port: ${config.port}`);
  console.log(`    TLS: ${config.tls}`);
  console.log(`    Auth Mode: ${config.authMode}`);
  
  if (config.tls && config.host) {
    console.log(`    TLS Server Name: ${config.host}`);
  }
}

console.log('');
console.log('=== Validation Complete ===');

// Exit with appropriate code
process.exit(0);
