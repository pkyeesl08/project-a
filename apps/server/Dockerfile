FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy root package files for workspace resolution
COPY package.json package-lock.json ./
COPY apps/server/package.json ./apps/server/
COPY packages/shared/package.json ./packages/shared/

RUN npm ci --workspace=server --workspace=@donggamerank/shared --include-workspace-root

# Build the shared package and server
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules 2>/dev/null || true

COPY packages/shared ./packages/shared
COPY apps/server ./apps/server
COPY package.json turbo.json ./

WORKDIR /app/apps/server
RUN npx nest build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

COPY --from=builder --chown=nestjs:nodejs /app/apps/server/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/server/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/node_modules/.package-lock.json ./node_modules/.package-lock.json
COPY --from=builder --chown=nestjs:nodejs /app/packages/shared/src ./node_modules/@donggamerank/shared/src

USER nestjs

EXPOSE 3000

CMD ["node", "dist/main.js"]
