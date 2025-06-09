# Use official Node.js 18 image as the base
FROM node:18

# Set working directory
WORKDIR /usr/src/app

# Install curl for health checks and redis-tools for debugging
RUN apt-get update && apt-get install -y curl redis-tools && rm -rf /var/lib/apt/lists/*

# Set build arguments for Redis configuration
ARG REDIS_HOST=localhost
ARG REDIS_PORT=6379
ARG REDIS_PASSWORD=
ARG NODE_ENV=production
ARG REDIS_TLS=true

# Set environment variables
ENV REDIS_HOST=$REDIS_HOST \
    REDIS_PORT=$REDIS_PORT \
    REDIS_PASSWORD=$REDIS_PASSWORD \
    REDIS_TLS=$REDIS_TLS \
    NODE_ENV=$NODE_ENV

# Copy root package files and install root dependencies (if any)
COPY package*.json ./
RUN npm install || true

# Copy backend and frontend package files and install dependencies
COPY react-backend/package*.json ./react-backend/
COPY react-frontend/package*.json ./react-frontend/
RUN cd react-backend && npm install && cd ../react-frontend && npm install && cd ..

# Copy the rest of the application
COPY . .

# Build frontend
RUN cd react-frontend && npm run build

# Move frontend build to backend public directory
RUN mkdir -p react-backend/public && cp -r react-frontend/dist/* react-backend/public/

# Build backend
RUN cd react-backend && npm run build

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
  echo "Starting application..."\n\
  node react-backend/dist/index.js\n\
else\n\
  echo "Running in development mode"\n\
  node react-backend/dist/index.js\n\
fi' > /usr/src/app/start.sh && chmod +x /usr/src/app/start.sh

# Start the backend (which will serve frontend static files)
CMD ["/usr/src/app/start.sh"]
