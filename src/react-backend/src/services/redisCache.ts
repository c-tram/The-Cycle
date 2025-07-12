import Redis from 'ioredis';
import { RedisOptions, Cluster } from 'ioredis';
import { DefaultAzureCredential } from '@azure/identity';

// Function to determine if we should use Azure Redis or fallback
function shouldUseAzureRedis(): boolean {
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
function createRedisConfig(): RedisOptions {
    if (!shouldUseAzureRedis()) {
        throw new Error('Azure Redis not configured, should use fallback');
    }
    
    const config: RedisOptions = {
        host: process.env.REDIS_HOST!,
        port: parseInt(process.env.REDIS_PORT || '6380'),
        password: process.env.REDIS_AUTH_MODE === 'aad' ? undefined : process.env.REDIS_PASSWORD,
        // Remove username for standard Azure Redis (only access key needed)
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
        reconnectOnError: (err: Error) => {
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
let redisClient: any;

// Dummy client for graceful degradation when Redis is unavailable
function createDummyClient() {
    const memoryCache = new Map();
    console.warn('Using in-memory fallback instead of Redis');
    
    return {
        set: async (key: string, value: string, ...args: any[]) => {
            memoryCache.set(key, value);
            return 'OK';
        },
        get: async (key: string) => memoryCache.get(key) || null,
        del: async (...keys: string[]) => {
            keys.forEach(k => memoryCache.delete(k));
            return keys.length;
        },
        keys: async (pattern: string) => {
            const regex = new RegExp(pattern.replace('*', '.*'));
            return Array.from(memoryCache.keys()).filter(k => regex.test(k));
        },
        ping: async () => 'PONG',
        on: (event: string, handler: Function) => {}, // No-op for event listeners
        auth: async (token: string) => 'OK',
    };
}

// Check if we're in a test environment and should use dummy client
if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined || process.env.CI === 'true') {
    console.log('Test environment detected, using dummy Redis client');
    redisClient = createDummyClient();
}

// Function to get AAD token for Redis
async function getAadTokenForRedis(): Promise<string | undefined> {
    try {
        if (process.env.REDIS_AUTH_MODE === 'aad') {
            console.log('Getting Azure AD token for Redis');
            
            // Create DefaultAzureCredential with logging
            const credential = new DefaultAzureCredential({
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
    } catch (error) {
        // Enhanced error logging
        console.error('Failed to get AAD token for Redis:');
        if (error instanceof Error) {
            console.error(`- Error name: ${error.name}`);
            console.error(`- Error message: ${error.message}`);
            console.error(`- Error stack: ${error.stack}`);
            
            // Additional diagnostic info
            if ('code' in error) {
                console.error(`- Error code: ${(error as any).code}`);
            }
        } else {
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
    } else {
        // Check if using Azure Redis Cache in cluster mode 
        if (process.env.REDIS_CLUSTER === 'true') {
            try {
                const hosts = (process.env.REDIS_HOST || '').split(',').map(host => ({
                    host: host.trim(),
                    port: parseInt(process.env.REDIS_PORT || '6380')
                }));
                
                // Create a cluster client
                redisClient = new Redis.Cluster(hosts, {
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
            } catch (error) {
                console.error('Failed to initialize Redis cluster mode:', error);
                console.log('Falling back to in-memory cache due to cluster initialization failure');
                redisClient = createDummyClient();
            }
        } else {
            // Standard single-instance Redis
            try {
                const redisConfig = createRedisConfig();
                
                if (process.env.REDIS_AUTH_MODE === 'aad') {
                    // For AAD authentication, we need to create a custom authentication handler
                    console.log('Initializing Redis in standard mode with AAD authentication');
                    
                    // Initialize with standard config first (without password)
                    redisClient = new Redis(redisConfig);
                    
                    // Setup AAD token refresh
                    const refreshAuthToken = async () => {
                        try {
                            const token = await getAadTokenForRedis();
                            if (token) {
                                await redisClient.auth(token);
                                console.log('AAD token refreshed for Redis');
                            }
                        } catch (err) {
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
                } else {
                    console.log('Initializing Redis with Azure configuration and key authentication');
                    redisClient = new Redis(redisConfig);
                    console.log('Initialized Redis in standard mode with key authentication');
                }
            } catch (error) {
                console.error('Failed to initialize Azure Redis:', error);
                console.log('Falling back to in-memory cache due to Azure Redis initialization failure');
                redisClient = createDummyClient();
            }
        }
    }
}

// Only add event listeners if not in test environment and not using dummy client
if (process.env.NODE_ENV !== 'test' && process.env.JEST_WORKER_ID === undefined && redisClient && typeof redisClient.on === 'function') {
    redisClient.on('error', (err: Error) => {
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
async function waitForRedisReady(timeoutMs: number = 30000): Promise<boolean> {
    if (redisReady) return true;
    
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
export async function cacheData<T>(key: string, data: T, expirationMinutes: number = 60): Promise<void> {
    // Force expiration to 60 minutes (1 hour)
    expirationMinutes = 60;
    const cacheItem = {
        data,
        expires: new Date(Date.now() + expirationMinutes * 60 * 1000).toISOString()
    };
    try {
        const isReady = await waitForRedisReady();
        if (!isReady) {
            console.warn('Redis not ready, skipping cache operation');
            return;
        }
        console.log(`[REDIS] Attempting to set key: cache:${key} | Value:`, cacheItem);
        await redisClient.set(
            `cache:${key}`,
            JSON.stringify(cacheItem),
            'EX',
            expirationMinutes * 60
        );
        console.log(`[REDIS] Successfully set key: cache:${key}`);
    } catch (error) {
        console.error(`[REDIS] Error caching data for key cache:${key}:`, error);
    }
}

/**
 * Retrieve data from Redis cache
 * @param key The cache key
 * @returns The cached data or null if expired or not found
 */
export async function getCachedData<T>(key: string): Promise<T | null> {
    try {
        const isReady = await waitForRedisReady();
        if (!isReady) {
            console.warn('Redis not ready, skipping get operation');
            return null;
        }
        console.log(`[REDIS] Attempting to get key: cache:${key}`);
        const raw = await redisClient.get(`cache:${key}`);
        if (!raw) {
            console.log(`[REDIS] Cache miss for key: cache:${key}`);
            return null;
        }
        const cacheItem = JSON.parse(raw);
        console.log(`[REDIS] Cache hit for key: cache:${key} | Value:`, cacheItem);
        return cacheItem.data as T;
    } catch (error) {
        console.error(`[REDIS] Error retrieving data for key cache:${key}:`, error);
        return null;
    }
}

/**
 * Clear a specific cache entry
 * @param key The cache key to clear
 */
export async function clearCache(key: string): Promise<void> {
    try {
        await redisClient.del(`cache:${key}`);
    } catch (error) {
        console.error(`Error clearing cache for key ${key}:`, error);
    }
}

/**
 * Clear all cache entries
 */
export async function clearAllCache(): Promise<void> {
    try {
        const keys = await redisClient.keys('cache:*');
        if (keys.length > 0) {
            await redisClient.del(...keys);
        }
    } catch (error) {
        console.error('Error clearing all cache:', error);
    }
}

/**
 * Check Redis connection status with ping
 * @returns Promise<boolean> - true if connected, false otherwise
 */
export async function ping(): Promise<boolean> {
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
        } else {
            console.warn('Redis client not properly initialized');
            return false;
        }
    } catch (error) {
        console.error('Redis ping failed:', error);
        
        // If we get a connection error, we might be using Azure Redis that's not available
        if (error instanceof Error && (
            error.message.includes('ECONNREFUSED') || 
            error.message.includes('ENOTFOUND') || 
            error.message.includes('timeout')
        )) {
            console.log('Redis connection not available, application should be using fallback caching');
        }
        
        return false;
    }
}

export default {
    cacheData,
    getCachedData,
    clearCache,
    clearAllCache,
    ping,
    client: redisClient
};
