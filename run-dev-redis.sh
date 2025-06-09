#!/bin/bash
# Start Redis and backend services in development mode

# Function to handle errors
function error_handler() {
  echo "Error occurred. Shutting down containers..."
  docker-compose down
  exit 1
}

# Set error handler
trap error_handler ERR

# Move to the repository root
cd "$(dirname "$0")"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "Docker is not running. Please start Docker first."
  exit 1
fi

# Set up environment variables for Redis
export REDIS_HOST=localhost
export REDIS_PORT=6379
export REDIS_TLS=false
export REDIS_AUTH_MODE=key

# Start Redis container in the background
echo "Starting Redis container..."
docker-compose up -d redis

# Wait for Redis to be available
echo "Waiting for Redis to start..."
for i in {1..30}; do
  if docker-compose exec redis redis-cli ping | grep -q PONG; then
    echo "Redis is ready!"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "Redis failed to start within 30 seconds."
    error_handler
  fi
  echo -n "."
  sleep 1
done

# Set NODE_ENV to development to use both Redis and file cache mechanisms
export NODE_ENV=development

# Start the backend with Redis configuration
echo "Starting backend with Redis..."
cd src/react-backend
npm run dev

# Keep the script running
echo "Press Ctrl+C to stop all services"
wait
