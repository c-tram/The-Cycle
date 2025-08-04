#!/bin/bash

# Script to populate Redis with MLB season data
# This will pull the entire 2025 MLB season

cd "/Users/coletrammell/Documents/GitHub/The Cycle/src/express-backend"

echo "🏗️  Starting MLB season data population..."
echo "📊 This will take 15-30 minutes for the full season"
echo ""

# Set environment variables for Redis connection
export REDIS_HOST="thecycle.redis.cache.windows.net"
export REDIS_PORT="6380"
export REDIS_PASSWORD="$REDIS_ACCESS_KEY"  # Use environment variable instead of hardcoded secret
export REDIS_TLS="true"
export NODE_ENV="production"

# Run the data population script
node scripts/pullBoxscoresToRedis_v2.cjs 2025 2025-03-20 2025-10-31

echo ""
echo "✅ MLB season data population completed!"
echo "🔧 You can now test your APIs:"
echo "   - Teams: https://thecycle-fxfta3e4g2cyg7c6.canadacentral-01.azurewebsites.net/api/teams"
echo "   - Players: https://thecycle-fxfta3e4g2cyg7c6.canadacentral-01.azurewebsites.net/api/players"
echo "   - Standings: https://thecycle-fxfta3e4g2cyg7c6.canadacentral-01.azurewebsites.net/api/standings"
