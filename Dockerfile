# Stage 1: Dependencies
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev && \
    npm cache clean --force && \
    # Remove unnecessary files from node_modules to reduce size
    find ./node_modules -name "*.md" -delete && \
    find ./node_modules -name "*.ts" -delete && \
    find ./node_modules -name "*.map" -delete && \
    find ./node_modules -name "LICENSE*" -delete && \
    find ./node_modules -name "CHANGELOG*" -delete && \
    find ./node_modules -name "README*" -delete && \
    find ./node_modules -name ".github" -type d -exec rm -rf {} + 2>/dev/null || true && \
    find ./node_modules -name "test" -type d -exec rm -rf {} + 2>/dev/null || true && \
    find ./node_modules -name "tests" -type d -exec rm -rf {} + 2>/dev/null || true && \
    find ./node_modules -name "docs" -type d -exec rm -rf {} + 2>/dev/null || true && \
    find ./node_modules -name "example" -type d -exec rm -rf {} + 2>/dev/null || true && \
    find ./node_modules -name "examples" -type d -exec rm -rf {} + 2>/dev/null || true

# Stage 2: Production - GCP Optimized
FROM node:20-alpine

# OCI Labels for GCP
LABEL org.opencontainers.image.title="Mock-Mock Server" \
      org.opencontainers.image.description="OpenAPI-based mock server with Firebase integration" \
      org.opencontainers.image.vendor="mock-mock" \
      org.opencontainers.image.version="1.0.0" \
      org.opencontainers.image.source="https://github.com/anubhav-mittra/mock-mock"

# Set environment variables (GCP Cloud Run compatible)
ENV NODE_ENV=production \
    PORT=8080 \
    USE_FIRESTORE=false

# Install dumb-init for proper signal handling (required for graceful shutdown in GCP)
RUN apk add --no-cache dumb-init && \
    rm -rf /var/cache/apk/*

# Create non-root user for security (GCP best practice)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy cleaned node_modules from deps stage
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy only necessary application files
COPY --chown=nodejs:nodejs server/src ./server/src
COPY --chown=nodejs:nodejs server/specs ./server/specs

# Switch to non-root user
USER nodejs

# Expose port (GCP Cloud Run uses 8080 by default, but respects PORT env var)
EXPOSE 8080

# Use dumb-init to handle signals properly (graceful shutdown)
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "server/src/app.js"]
