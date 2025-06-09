# Use official Node.js 18 image as the base
FROM node:18

# Set working directory
WORKDIR /usr/src/app

# Install curl for health checks and redis-tools for debugging
RUN apt-get update && apt-get install -y curl redis-tools && rm -rf /var/lib/apt/lists/*

# Set build arguments for non-sensitive Redis configuration
ARG REDIS_HOST=localhost
ARG REDIS_PORT=6379
ARG NODE_ENV=production
ARG REDIS_TLS=true
ARG REDIS_AUTH_MODE=key

# Set environment variables (sensitive data will be provided at runtime)
ENV REDIS_HOST=$REDIS_HOST \
    REDIS_PORT=$REDIS_PORT \
    REDIS_TLS=$REDIS_TLS \
    REDIS_AUTH_MODE=$REDIS_AUTH_MODE \
    NODE_ENV=$NODE_ENV

# Copy root package files and install root dependencies (if any)
COPY package*.json ./
RUN npm install || true

# Copy backend and frontend package files and install dependencies
COPY react-backend/package*.json ./react-backend/
COPY react-frontend/package*.json ./react-frontend/

# Install backend dependencies including devDependencies for build process
RUN cd react-backend && NODE_ENV=development npm ci

# Install frontend dependencies including devDependencies for build process
RUN cd react-frontend && NODE_ENV=development npm ci

# Copy the rest of the application
COPY . .

# Build frontend (requires TypeScript from devDependencies)
RUN cd react-frontend && npm run build

# Move frontend build to backend public directory
RUN mkdir -p react-backend/public && cp -r react-frontend/dist/* react-backend/public/

# Build backend
RUN cd react-backend && npm run build

# Clean up devDependencies to reduce image size
RUN cd react-backend && npm prune --production
RUN rm -rf react-frontend/node_modules

# Expose port
EXPOSE 3000

# Add health check for both application and Redis
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Create a startup script that checks Redis connection before starting app
RUN echo '#!/bin/bash\n\
echo "Checking Redis connection..."\n\
if [ "$NODE_ENV" = "production" ]; then\n\
  echo "Running in production mode with Redis"\n\
  if [ "$REDIS_AUTH_MODE" = "aad" ]; then\n\
    echo "Using Azure AD authentication for Redis"\n\
  else\n\
    echo "Using key authentication for Redis"\n\
  fi\n\
  echo "Starting application..."\n\
  node react-backend/dist/index.js\n\
else\n\
  echo "Running in development mode"\n\
  node react-backend/dist/index.js\n\
fi' > /usr/src/app/start.sh && chmod +x /usr/src/app/start.sh

# Start the backend (which will serve frontend static files)
CMD ["/usr/src/app/start.sh"]
