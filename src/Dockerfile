# Use official Node.js 18 image as the base
FROM node:18

# Set working directory
WORKDIR /usr/src/app

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

# Start the backend (which will serve frontend static files)
CMD ["node", "react-backend/dist/index.js"]
