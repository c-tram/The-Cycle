#!/bin/bash

# Quick test script to verify the fixes work
# This will pull just a few days of data to test

cd "/Users/coletrammell/Documents/GitHub/The Cycle/src/express-backend"

echo "🧪 Testing MLB data population with recent games..."
echo ""

# Set environment variables for Redis connection
export REDIS_HOST="thecycle.redis.cache.windows.net"
export REDIS_PORT="6380"
export REDIS_PASSWORD="$REDIS_ACCESS_KEY"  # Use environment variable instead of hardcoded secret
export REDIS_TLS="true"
export NODE_ENV="production"

# Clear existing test data
echo "🧹 Clearing existing data..."
node scripts/clearRedisCache.cjs

# Run with just recent games for testing (last week)
echo "📊 Pulling recent games for testing..."
node scripts/pullBoxscoresToRedis_v2.cjs 2025 2025-07-20 2025-07-26

echo ""
echo "✅ Test data population completed!"
echo "🔧 Test your APIs:"
echo "   curl https://thecycle-fxfta3e4g2cyg7c6.canadacentral-01.azurewebsites.net/api/teams"
echo "   curl https://thecycle-fxfta3e4g2cyg7c6.canadacentral-01.azurewebsites.net/api/players"
