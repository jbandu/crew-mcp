# Multi-stage Dockerfile for Crew Qualifications MCP Server
# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy built files from builder
COPY --from=builder /app/build ./build

# Copy database schema and migrations
COPY database ./database

# Create a non-root user
RUN addgroup -g 1001 -S mcp && \
    adduser -S mcp -u 1001 && \
    chown -R mcp:mcp /app

USER mcp

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('pg').Pool().query('SELECT 1').then(() => process.exit(0)).catch(() => process.exit(1))"

# Environment variables
ENV NODE_ENV=production
ENV LOG_LEVEL=info

# Expose port (though MCP uses stdio, useful for health checks)
EXPOSE 3000

# Start the MCP server
CMD ["node", "build/index.js"]
