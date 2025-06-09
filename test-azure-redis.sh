#!/bin/bash
# Script to test Azure Redis connectivity

# Set color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if environment variables are set
if [[ -z "$REDIS_HOST" || -z "$REDIS_PORT" ]]; then
  echo -e "${RED}Error: Required environment variables not set${NC}"
  echo "Please set the following environment variables:"
  echo "  - REDIS_HOST: Redis server hostname"
  echo "  - REDIS_PORT: Redis server port"
  echo "  - REDIS_AUTH_MODE: Authentication mode (key or aad)"
  echo "  - REDIS_PASSWORD: Redis password (if auth mode is key)"
  exit 1
fi

echo -e "${GREEN}=== Redis Connection Test ===${NC}"
echo -e "${YELLOW}Host:${NC} $REDIS_HOST"
echo -e "${YELLOW}Port:${NC} $REDIS_PORT"
echo -e "${YELLOW}Auth Mode:${NC} ${REDIS_AUTH_MODE:-key}"
echo -e "${YELLOW}TLS Enabled:${NC} ${REDIS_TLS:-true}"

# Ensure we're in the react-backend directory
cd "$(dirname "$0")"/src/react-backend || exit 1

# Compile TypeScript if needed
if [[ ! -d "./dist" || ! -f "./dist/services/redisCache.js" ]]; then
  echo -e "${YELLOW}Compiling TypeScript...${NC}"
  npm run build
fi

# Run the Redis test
echo -e "\n${GREEN}Running Redis connectivity test...${NC}"
node test-redis.js

exit_code=$?
if [[ $exit_code -eq 0 ]]; then
  echo -e "\n${GREEN}✅ Redis connection test successful!${NC}"
else
  echo -e "\n${RED}❌ Redis connection test failed!${NC}"
fi

exit $exit_code
