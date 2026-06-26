# ============================================================
# GitGuard AI Backend — Multi-Stage Dockerfile
# ============================================================

# ── Stage 1: Builder ─────────────────────────────────────────
FROM node:20-alpine AS builder

LABEL stage="builder"

WORKDIR /app

# Install dependencies first (layer-cached when only src changes)
COPY package*.json ./
RUN npm ci --only=production=false

# Copy source and compile TypeScript
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Prune dev dependencies for the production stage
RUN npm prune --production

# ── Stage 2: Production ──────────────────────────────────────
FROM node:20-alpine AS production

LABEL maintainer="GitGuard AI"
LABEL description="GitGuard AI Backend — Autonomous PR Review Platform"

# Install tini for proper signal handling in Docker
RUN apk add --no-cache tini

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S gitguard -u 1001 -G nodejs

WORKDIR /app

# Copy only what's needed from builder
COPY --from=builder --chown=gitguard:nodejs /app/dist ./dist
COPY --from=builder --chown=gitguard:nodejs /app/node_modules ./node_modules
COPY --chown=gitguard:nodejs package.json ./

# Switch to non-root user
USER gitguard

# Expose application port (Default to 10000 to match Render's default routing port)
EXPOSE 10000

# Health check (handles dynamic PORT environment variable)
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || '10000') + '/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"

# Use tini as init process to handle SIGTERM properly
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/src/server.js"]
