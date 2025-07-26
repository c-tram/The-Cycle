# Backend Dockerfile for The Cycle Express API
FROM node:18-alpine AS backend-base

# Set working directory
WORKDIR /app

# Copy package files
COPY src/express-backend/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/express-backend/ ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Change ownership of the app directory
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# Start the application
CMD ["npm", "start"]
