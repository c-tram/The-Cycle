# Use official Node.js 18 image as the base
FROM node:18

# Set working directory
WORKDIR /usr/src/app

# Install curl for health checks (optional)
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

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

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/standings || exit 1

# Start the backend (which will serve frontend static files)
CMD ["node", "react-backend/dist/index.js"]
