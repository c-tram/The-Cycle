/**
 * Configuration for cache systems (Redis & File cache)
 * 
 * This centralizes all cache-related configuration for better management
 * and easy adjustments for different environments.
 */

import path from 'path';

// Base directory for file caching
export const DATA_DIR = path.join(__dirname, '../../data');

// Redis connection configuration
export const REDIS_CONFIG = {
  // Connection settings
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  useTLS: process.env.NODE_ENV === 'production' || process.env.REDIS_TLS === 'true',
  clusterMode: process.env.REDIS_CLUSTER === 'true',
  
  // Cache time-to-live (TTL) settings
  defaultTTL: 60, // Default TTL in minutes
  ttlSettings: {
    games: 120,               // 2 hours
    recentGames: 240,         // 4 hours (historical data)
    upcomingGames: 60,        // 1 hour (more volatile)
    standings: 120,           // 2 hours
    playerRegistry: 1440,     // 24 hours
    teamRegistry: 1440,       // 24 hours
    playerStats: 60,          // 1 hour
    trends: 120               // 2 hours
  }
};

// Cache mechanism selection
export const USE_REDIS = process.env.NODE_ENV === 'production' || process.env.USE_REDIS === 'true';

// Redis prefix for each cache type
export const CACHE_PREFIXES = {
  gameData: 'game:',
  playerData: 'player:',
  teamData: 'team:',
  trendData: 'trend:',
  standingsData: 'standings:',
  registryData: 'registry:'
};
