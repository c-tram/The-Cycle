# Multi-stage Dockerfile for The Cycle MLB Analytics Platform
# This Dockerfile can build both backend and frontend services

ARG SERVICE=backend

# ================================
# Backend Build Stage
# ================================
FROM node:18-alpine AS backend-builder

WORKDIR /app

# Copy backend package files
COPY src/express-backend/package*.json ./
RUN npm ci --only=production

# Copy backend source
COPY src/express-backend/ ./

# ================================
# React Frontend Dependencies Stage
# ================================
FROM node:18-alpine AS frontend-deps

RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy React frontend package files
COPY src/web-frontend/package*.json ./
RUN npm ci

# ================================
# React Frontend Build Stage
# ================================
FROM node:18-alpine AS frontend-builder

WORKDIR /app
COPY --from=frontend-deps /app/node_modules ./node_modules
COPY src/web-frontend/ ./

ENV NODE_ENV=production
ENV GENERATE_SOURCEMAP=false

RUN npm run build

# ================================
# Backend Production Stage
# ================================
FROM node:18-alpine AS backend

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S backend -u 1001

# Copy built backend
COPY --from=backend-builder --chown=backend:nodejs /app ./

USER backend

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

CMD ["npm", "start"]

# ================================
# React Frontend Production Stage
# ================================
FROM nginx:alpine AS frontend

# Install wget for health checks
RUN apk add --no-cache wget

# Copy built React app to nginx
COPY --from=frontend-builder /app/build /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.frontend.conf /etc/nginx/conf.d/default.conf

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/ || exit 1

CMD ["nginx", "-g", "daemon off;"]

# ================================
# Service Selection
# ================================
FROM ${SERVICE} AS final
