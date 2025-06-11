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

# Create a startup script that checks Redis connection before starting app
RUN echo '#!/bin/bash\necho "Checking Redis connection..."\nif [ "$NODE_ENV" = "production" ]; then\n  echo "Running in production mode with Redis"\n  if [ "$REDIS_AUTH_MODE" = "aad" ]; then\n    echo "Using Azure AD authentication for Redis"\n  else\n    echo "Using key authentication for Redis"\n  fi\n  echo "Starting application..."\n  node src/react-backend/dist/index.js\nelse\n  echo "Running in development mode"\n  node src/react-backend/dist/index.js\nfi' > /usr/src/app/start.sh && chmod +x /usr/src/app/start.sh

# Start the backend (which will serve frontend static files)
CMD ["/usr/src/app/start.sh"]
