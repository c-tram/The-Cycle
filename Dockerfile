# Use official Node.js 18 image as the base
FROM node:18

# Set working directory
WORKDIR /usr/src/app

# Install curl for health checks and redis-tools for debugging
RUN apt-get update && apt-get install -y curl redis-tools && rm -rf /var/lib/apt/lists/*

# Set build arguments for application configuration (Redis config will come from Azure environment)
ARG NODE_ENV=production

# Set environment variables (Redis configuration will be provided by Azure at runtime)
ENV NODE_ENV=$NODE_ENV

# Copy root package files and install root dependencies (if any)
COPY package*.json ./
RUN npm install

# Copy backend and frontend package files and install dependencies
COPY src/react-backend/package*.json ./src/react-backend/
COPY src/react-frontend/package*.json ./src/react-frontend/

# Clean install backend dependencies
RUN rm -rf src/react-backend/node_modules && cd src/react-backend && NODE_ENV=development npm ci

# Clean install frontend dependencies
RUN rm -rf src/react-frontend/node_modules && cd src/react-frontend && NODE_ENV=development npm ci

# Copy the rest of the application
COPY . .

# Build frontend (requires TypeScript from devDependencies)
RUN cd src/react-frontend && npm run build

# Move frontend build to backend public directory
RUN mkdir -p src/react-backend/public && cp -r src/react-frontend/dist/* src/react-backend/public/

# Build backend
RUN cd src/react-backend && npm run build

# List backend build output for debugging
RUN ls -l src/react-backend/dist

# Clean up devDependencies to reduce image size (only for backend)
RUN cd src/react-backend && npm prune --production

# Expose port
EXPOSE 3000

# Add health check for both application and Redis
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Create a startup script that validates Redis configuration and starts the app
RUN echo '#!/bin/bash\n\
echo "=== The Cycle Application Startup ==="\n\
echo "Environment: $NODE_ENV"\n\
echo ""\n\
echo "=== Redis Configuration Debug ==="\n\
echo "REDIS_HOST: ${REDIS_HOST:-not set}"\n\
echo "REDIS_PORT: ${REDIS_PORT:-not set}"\n\
echo "REDIS_TLS: ${REDIS_TLS:-not set}"\n\
echo "REDIS_AUTH_MODE: ${REDIS_AUTH_MODE:-not set}"\n\
echo "REDIS_PASSWORD: ${REDIS_PASSWORD:+[REDACTED]:-not set}"\n\
echo ""\n\
echo "Validating Redis configuration..."\n\
node src/react-backend/src/scripts/validate-redis-config.js\n\
echo ""\n\
echo "Starting application..."\n\
if [ "$NODE_ENV" = "production" ]; then\n\
  echo "Running in production mode"\n\
  if [ "$REDIS_AUTH_MODE" = "aad" ]; then\n\
    echo "Using Azure AD authentication for Redis"\n\
  elif [ -n "$REDIS_HOST" ] && [ "$REDIS_HOST" != "localhost" ]; then\n\
    echo "Using key authentication for Redis"\n\
  else\n\
    echo "Redis not configured - using in-memory fallback caching"\n\
  fi\n\
  node src/react-backend/dist/index.js\n\
else\n\
  echo "Running in development mode"\n\
  node src/react-backend/dist/index.js\n\
fi' > /usr/src/app/start.sh && chmod +x /usr/src/app/start.sh

# Start the backend (which will serve frontend static files)
CMD ["/usr/src/app/start.sh"]
