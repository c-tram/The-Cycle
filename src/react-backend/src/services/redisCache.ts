import Redis from 'ioredis';
import { RedisOptions, Cluster } from 'ioredis';
import { DefaultAzureCredential } from '@azure/identity';

// Redis client configuration
const redisConfig: RedisOptions = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_AUTH_MODE === 'aad' ? undefined : process.env.REDIS_PASSWORD,
    // Enable TLS if in production or a TLS endpoint is specified
    tls: process.env.NODE_ENV === 'production' || process.env.REDIS_TLS === 'true' 
        ? { servername: process.env.REDIS_HOST } 
        : undefined,
    // Configure Azure Redis specific options if in Azure
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
            // When we get READONLY on a node, we always want to reconnect
            return true;
        }
        return false;
    }
};

// Create Redis client with special handling for cluster mode
// Using "any" type here to accommodate both Cluster and Redis interfaces
let redisClient: any;

// Function to get AAD token for Redis
async function getAadTokenForRedis(): Promise<string | undefined> {
    try {
        if (process.env.REDIS_AUTH_MODE === 'aad') {
            console.log('Getting Azure AD token for Redis');
            const credential = new DefaultAzureCredential();
            const token = await credential.getToken('https://redis.azure.com/.default');
            return token?.token;
        }
        return undefined;
    } catch (error) {
        console.error('Failed to get AAD token for Redis:', error);
        return undefined;
    }
}

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
        // Fallback to standard client
        redisClient = new Redis(redisConfig);
        console.log('Falling back to standard Redis mode');
    }
} else {
    // Create a standard client
    try {
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
            
            // Initial authentication
            refreshAuthToken();
            
            // Refresh token every 20 minutes (tokens typically last 1 hour)
            setInterval(refreshAuthToken, 20 * 60 * 1000);
        } else {
            // Standard key-based authentication
            redisClient = new Redis(redisConfig);
            console.log('Initialized Redis in standard mode with key authentication');
        }
    } catch (error) {
        console.error('Failed to initialize Redis:', error);
        // Create a dummy client for graceful failure
        redisClient = createDummyClient();
    }
}

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
        on: (event: string, handler: Function) => {},
    };
}

redisClient.on('error', (err: Error) => {
    console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
    console.log('Redis Client Connected');
});

/**
 * Store data in Redis cache
 * @param key The cache key
 * @param data The data to cache
 * @param expirationMinutes Minutes until the cache expires
 */
export async function cacheData<T>(key: string, data: T, expirationMinutes: number = 60): Promise<void> {
    const cacheItem = {
        data,
        expires: new Date(Date.now() + expirationMinutes * 60 * 1000).toISOString()
    };
    
    try {
        await redisClient.set(
            `cache:${key}`,
            JSON.stringify(cacheItem),
            'EX',
            expirationMinutes * 60
        );
    } catch (error) {
        console.error(`Error caching data for key ${key}:`, error);
        // Fallback to memory cache or file cache if needed
    }
}

/**
 * Retrieve data from Redis cache
 * @param key The cache key
 * @returns The cached data or null if expired or not found
 */
export async function getCachedData<T>(key: string): Promise<T | null> {
    try {
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

        return data as T;
    } catch (error) {
        console.error(`Error retrieving cache for key ${key}:`, error);
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
        const result = await redisClient.ping();
        return result === 'PONG';
    } catch (error) {
        console.error('Redis ping failed:', error);
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
