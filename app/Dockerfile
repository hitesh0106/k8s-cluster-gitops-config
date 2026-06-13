# ============================================================================
# Multi-stage Dockerfile — Production Optimized
# Stage 1: Install dependencies
# Stage 2: Distroless production image (minimal attack surface)
# ============================================================================

# ─── Stage 1: Builder ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files first (leverage Docker layer caching)
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# ─── Stage 2: Production ──────────────────────────────────────────────────────
FROM gcr.io/distroless/nodejs20-debian12

# Labels for container metadata (OCI standard)
LABEL org.opencontainers.image.title="k8s-cicd-api" \
      org.opencontainers.image.description="Production-grade Node.js REST API" \
      org.opencontainers.image.version="1.0.0" \
      org.opencontainers.image.source="https://github.com/hitesh0106/k8s-cicd-project" \
      org.opencontainers.image.authors="hitesh0106"

# Set working directory
WORKDIR /app

# Copy production dependencies from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application source code
COPY src/ ./src/

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000

# Expose application port
EXPOSE 3000

# Run as non-root user (UID 1000) for security
USER 1000

# Start the application
CMD ["src/index.js"]
# Trigger CI pipeline for video showcase
