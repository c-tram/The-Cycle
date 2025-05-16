# Use official Node.js 18 image as the base
FROM node:18

# Install Chromium and Chromedriver
RUN apt-get update && \
    apt-get install -y chromium chromium-driver && \
    rm -rf /var/lib/apt/lists/*

# Switch to root user
USER root

# Set working directory
WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Install dependencies for backend and frontend
COPY react-backend/package*.json ./react-backend/
COPY react-frontend/package*.json ./react-frontend/
RUN cd react-backend && npm install && cd ../react-frontend && npm install && cd ..

# Copy the rest of the application
COPY . .

# Build frontend
RUN cd react-frontend && npm run build && cd ..

# Move frontend build to backend public directory (handle missing public dir)
RUN mkdir -p react-backend/public && cp -r react-frontend/dist/* react-backend/public/ || cp -r react-frontend/build/* react-backend/public/

# Build backend
RUN cd react-backend && npm run build && cd ..

# Expose port
EXPOSE 3000

# Start the backend (which will serve frontend static files)
CMD ["node", "react-backend/dist/index.js"]
