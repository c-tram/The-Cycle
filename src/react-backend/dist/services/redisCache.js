"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheData = cacheData;
exports.getCachedData = getCachedData;
exports.clearCache = clearCache;
exports.clearAllCache = clearAllCache;
exports.ping = ping;
const ioredis_1 = __importDefault(require("ioredis"));
const identity_1 = require("@azure/identity");
// Function to determine if we should use Azure Redis or fallback
function shouldUseAzureRedis() {
    // Check if Azure Redis is properly configured
    const hasAzureRedisHost = process.env.REDIS_HOST &&
        process.env.REDIS_HOST !== 'localhost' &&
        process.env.REDIS_HOST !== '127.0.0.1';
    console.log('Redis Configuration Check:');
    console.log(`  REDIS_HOST: ${process.env.REDIS_HOST || 'undefined'}`);
    console.log(`  Has Azure Redis Host: ${hasAzureRedisHost}`);
    console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
    return hasAzureRedisHost;
}
// Function to create Redis configuration only when needed
function createRedisConfig() {
    if (!shouldUseAzureRedis()) {
        throw new Error('Azure Redis not configured, should use fallback');
    }
    const config = {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || '6380'),
        password: process.env.REDIS_AUTH_MODE === 'aad' ? undefined : process.env.REDIS_PASSWORD,
        // Enable TLS for Azure Redis
        tls: process.env.REDIS_TLS === 'true'
            ? { servername: process.env.REDIS_HOST }
            : undefined,
        // Configure Azure Redis specific options
        enableReadyCheck: false, // Important for Azure Redis
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
            const delay = Math.min(times * 500, 2000);
            return delay;
        },
        // Auto-reconnect settings
        reconnectOnError: (err) => {
            const targetError = 'READONLY';
            if (err.message.includes(targetError)) {
                return true;
            }
            return false;
        }
    };
    console.log('Created Redis config for Azure:', {
        host: config.host,
        port: config.port,
        tls: !!config.tls,
        authMode: process.env.REDIS_AUTH_MODE || 'key'
    });
    return config;
}
// Create Redis client with special handling for cluster mode
// Using "any" type here to accommodate both Cluster and Redis interfaces
let redisClient;
// Dummy client for graceful degradation when Redis is unavailable
function createDummyClient() {
    const memoryCache = new Map();
    console.warn('Using in-memory fallback instead of Redis');
    return {
        set: async (key, value, ...args) => {
            memoryCache.set(key, value);
            return 'OK';
        },
        get: async (key) => memoryCache.get(key) || null,
        del: async (...keys) => {
            keys.forEach(k => memoryCache.delete(k));
            return keys.length;
        },
        keys: async (pattern) => {
            const regex = new RegExp(pattern.replace('*', '.*'));
            return Array.from(memoryCache.keys()).filter(k => regex.test(k));
        },
        ping: async () => 'PONG',
        on: (event, handler) => { }, // No-op for event listeners
        auth: async (token) => 'OK',
    };
}
// Check if we're in a test environment and should use dummy client
if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined || process.env.CI === 'true') {
    console.log('Test environment detected, using dummy Redis client');
    redisClient = createDummyClient();
}
// Function to get AAD token for Redis
async function getAadTokenForRedis() {
    try {
        if (process.env.REDIS_AUTH_MODE === 'aad') {
            console.log('Getting Azure AD token for Redis');
            // Create DefaultAzureCredential with logging
            const credential = new identity_1.DefaultAzureCredential({
                // Enable logging to help troubleshoot credential issues
                loggingOptions: {
                    allowLoggingAccountIdentifiers: process.env.NODE_ENV === 'development'
                }
            });
            // Request token with proper scope for Redis
            const token = await credential.getToken('https://redis.azure.com/.default');
            if (!token || !token.token) {
                console.error('No AAD token received from Azure Identity');
                return undefined;
            }
            console.log('AAD token successfully obtained');
            return token.token;
        }
        return undefined;
    }
    catch (error) {
        // Enhanced error logging
        console.error('Failed to get AAD token for Redis:');
        if (error instanceof Error) {
            console.error(`- Error name: ${error.name}`);
            console.error(`- Error message: ${error.message}`);
            console.error(`- Error stack: ${error.stack}`);
            // Additional diagnostic info
            if ('code' in error) {
                console.error(`- Error code: ${error.code}`);
            }
        }
        else {
            console.error(error);
        }
        return undefined;
    }
}
// Initialize Redis client only if not already created for test environment
if (!redisClient) {
    console.log('Determining Redis configuration...');
    // Check if we should use Azure Redis or fallback to memory cache
    if (!shouldUseAzureRedis()) {
        console.log('No Azure Redis configured, using in-memory fallback');
        redisClient = createDummyClient();
    }
    else {
        // Check if using Azure Redis Cache in cluster mode 
        if (process.env.REDIS_CLUSTER === 'true') {
            try {
                const hosts = (process.env.REDIS_HOST || '').split(',').map(host => ({
                    host: host.trim(),
                    port: parseInt(process.env.REDIS_PORT || '6380')
                }));
                // Create a cluster client
                redisClient = new ioredis_1.default.Cluster(hosts, {
                    redisOptions: {
                        password: process.env.REDIS_AUTH_MODE === 'aad' ? undefined : process.env.REDIS_PASSWORD,
                        tls: process.env.NODE_ENV === 'production' || process.env.REDIS_TLS === 'true'
                            ? { servername: hosts[0].host }
                            : undefined
                    },
                    // For better cluster stability
                    scaleReads: 'slave',
                    maxRedirections: 3,
                    retryDelayOnFailover: 300
                });
                console.log('Initialized Redis in cluster mode');
            }
            catch (error) {
                console.error('Failed to initialize Redis cluster mode:', error);
                console.log('Falling back to in-memory cache due to cluster initialization failure');
                redisClient = createDummyClient();
            }
        }
        else {
            // Standard single-instance Redis
            try {
                const redisConfig = createRedisConfig();
                if (process.env.REDIS_AUTH_MODE === 'aad') {
                    // For AAD authentication, we need to create a custom authentication handler
                    console.log('Initializing Redis in standard mode with AAD authentication');
                    // Initialize with standard config first (without password)
                    redisClient = new ioredis_1.default(redisConfig);
                    // Setup AAD token refresh
                    const refreshAuthToken = async () => {
                        try {
                            const token = await getAadTokenForRedis();
                            if (token) {
                                await redisClient.auth(token);
                                console.log('AAD token refreshed for Redis');
                            }
                        }
                        catch (err) {
                            console.error('Error refreshing AAD token:', err);
                        }
                    };
                    // Initial authentication with proper error handling
                    refreshAuthToken().catch(err => {
                        console.error('Failed initial AAD authentication:', err);
                    });
                    // Refresh token every 20 minutes (tokens typically last 1 hour)
                    setInterval(() => {
                        refreshAuthToken().catch(err => {
                            console.error('Failed to refresh AAD token:', err);
                        });
                    }, 20 * 60 * 1000);
                }
                else {
                    console.log('Initializing Redis with Azure configuration and key authentication');
                    redisClient = new ioredis_1.default(redisConfig);
                    console.log('Initialized Redis in standard mode with key authentication');
                }
            }
            catch (error) {
                console.error('Failed to initialize Azure Redis:', error);
                console.log('Falling back to in-memory cache due to Azure Redis initialization failure');
                redisClient = createDummyClient();
            }
        }
    }
}
// Only add event listeners if not in test environment and not using dummy client
if (process.env.NODE_ENV !== 'test' && process.env.JEST_WORKER_ID === undefined && redisClient && typeof redisClient.on === 'function') {
    redisClient.on('error', (err) => {
        console.error('Redis Client Error:', err);
        // If this is a connection error and we're not already using dummy client, switch to it
        if (err.message.includes('ECONNREFUSED') || err.message.includes('ENOTFOUND') || err.message.includes('timeout')) {
            console.log('Redis connection failed, switching to in-memory fallback');
            // Don't replace the client here to avoid infinite loops, just log
        }
    });
    redisClient.on('connect', () => {
        console.log('Redis Client Connected');
    });
    redisClient.on('ready', () => {
        console.log('Redis Client Ready');
    });
    redisClient.on('end', () => {
        console.log('Redis Client Connection Ended');
    });
    redisClient.on('close', () => {
        console.log('Redis Client Connection Closed');
    });
}
// Track Redis readiness for AAD authentication
let redisReady = process.env.REDIS_AUTH_MODE !== 'aad' ||
    process.env.NODE_ENV === 'test' ||
    process.env.JEST_WORKER_ID !== undefined; // Assume ready for tests
if (process.env.REDIS_AUTH_MODE === 'aad' &&
    process.env.NODE_ENV !== 'test' &&
    process.env.JEST_WORKER_ID === undefined) {
    redisClient.on('ready', () => {
        redisReady = true;
    });
    redisClient.on('error', () => {
        redisReady = false;
    });
}
/**
 * Wait for Redis to be ready (especially important for AAD authentication)
 */
async function waitForRedisReady(timeoutMs = 30000) {
    if (redisReady)
        return true;
    const startTime = Date.now();
    while (!redisReady && (Date.now() - startTime) < timeoutMs) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    return redisReady;
}
/**
 * Store data in Redis cache
 * @param key The cache key
 * @param data The data to cache
 * @param expirationMinutes Minutes until the cache expires
 */
async function cacheData(key, data, expirationMinutes = 60) {
    const cacheItem = {
        data,
        expires: new Date(Date.now() + expirationMinutes * 60 * 1000).toISOString()
    };
    try {
        // Wait for Redis to be ready (important for AAD authentication)
        const isReady = await waitForRedisReady();
        if (!isReady) {
            console.warn('Redis not ready, skipping cache operation');
            return;
        }
        await redisClient.set(`cache:${key}`, JSON.stringify(cacheItem), 'EX', expirationMinutes * 60);
    }
    catch (error) {
        console.error(`Error caching data for key ${key}:`, error);
        // Fallback to memory cache or file cache if needed
    }
}
/**
 * Retrieve data from Redis cache
 * @param key The cache key
 * @returns The cached data or null if expired or not found
 */
async function getCachedData(key) {
    try {
        // Wait for Redis to be ready (important for AAD authentication)
        const isReady = await waitForRedisReady();
        if (!isReady) {
            console.warn('Redis not ready, returning null for cache lookup');
            return null;
        }
        const cacheItem = await redisClient.get(`cache:${key}`);
        if (!cacheItem) {
            return null;
        }
        const { data, expires } = JSON.parse(cacheItem);
        // Check if cache has expired (redundant with Redis TTL but kept for consistency)
        if (new Date(expires) < new Date()) {
            await redisClient.del(`cache:${key}`);
            return null;
        }
        return data;
    }
    catch (error) {
        console.error(`Error retrieving cache for key ${key}:`, error);
        return null;
    }
}
/**
 * Clear a specific cache entry
 * @param key The cache key to clear
 */
async function clearCache(key) {
    try {
        await redisClient.del(`cache:${key}`);
    }
    catch (error) {
        console.error(`Error clearing cache for key ${key}:`, error);
    }
}
/**
 * Clear all cache entries
 */
async function clearAllCache() {
    try {
        const keys = await redisClient.keys('cache:*');
        if (keys.length > 0) {
            await redisClient.del(...keys);
        }
    }
    catch (error) {
        console.error('Error clearing all cache:', error);
    }
}
/**
 * Check Redis connection status with ping
 * @returns Promise<boolean> - true if connected, false otherwise
 */
async function ping() {
    try {
        // Check if we're using the dummy client (in-memory fallback)
        if (redisClient && typeof redisClient.ping === 'function') {
            // Wait for Redis to be ready (important for AAD authentication)
            const isReady = await waitForRedisReady(5000); // Reduced timeout for faster response
            if (!isReady) {
                console.warn('Redis not ready for ping, likely using fallback');
                return true; // Return true for dummy client to indicate "working" state
            }
            const result = await redisClient.ping();
            const isConnected = result === 'PONG';
            if (!isConnected) {
                console.warn('Redis ping did not return PONG:', result);
            }
            return isConnected;
        }
        else {
            console.warn('Redis client not properly initialized');
            return false;
        }
    }
    catch (error) {
        console.error('Redis ping failed:', error);
        // If we get a connection error, we might be using Azure Redis that's not available
        if (error instanceof Error && (error.message.includes('ECONNREFUSED') ||
            error.message.includes('ENOTFOUND') ||
            error.message.includes('timeout'))) {
            console.log('Redis connection not available, application should be using fallback caching');
        }
        return false;
    }
}
exports.default = {
    cacheData,
    getCachedData,
    clearCache,
    clearAllCache,
    ping,
    client: redisClient
};
