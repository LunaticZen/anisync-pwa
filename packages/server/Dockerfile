# ═══════════════════════════════════════════════════════════════
# Server Dockerfile — Multi-stage build
# ═══════════════════════════════════════════════════════════════

FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace root
COPY package.json ./
COPY tsconfig.base.json ./

# Copy shared package
COPY packages/shared/package.json packages/shared/
COPY packages/shared/tsconfig.json packages/shared/
COPY packages/shared/src packages/shared/src

# Copy server package
COPY packages/server/package.json packages/server/
COPY packages/server/tsconfig.json packages/server/
COPY packages/server/prisma packages/server/prisma
COPY packages/server/src packages/server/src

# Install deps and build
RUN npm install --workspace=packages/shared --workspace=packages/server
RUN npm run build -w packages/shared
RUN npx prisma generate --schema=packages/server/prisma/schema.prisma
RUN npm run build -w packages/server

# ─── Production Stage ──────────────────────────────────────────

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package.json ./
COPY --from=builder /app/packages/shared/package.json packages/shared/
COPY --from=builder /app/packages/shared/dist packages/shared/dist
COPY --from=builder /app/packages/server/package.json packages/server/
COPY --from=builder /app/packages/server/dist packages/server/dist
COPY --from=builder /app/packages/server/prisma packages/server/prisma
COPY --from=builder /app/packages/server/node_modules packages/server/node_modules
COPY --from=builder /app/node_modules node_modules

EXPOSE 3000

CMD ["node", "packages/server/dist/index.js"]
