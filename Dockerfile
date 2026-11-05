# syntax=docker/dockerfile:1.7
# Portable production image (Vercel doesn't use this; CI builds and smoke-tests it so the app
# can move to any container host). Targets:
#   runner  (default) – the Next.js server:        docker build -t crackit .
#   migrate           – applies Prisma migrations:  docker build --target migrate -t crackit-migrate .

ARG NODE_VERSION=24-alpine

FROM node:${NODE_VERSION} AS base
ENV NEXT_TELEMETRY_DISABLED=1 COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /app

# ── Dependencies (postinstall runs `prisma generate`, so the schema is needed) ──
FROM base AS deps
COPY package.json pnpm-lock.yaml prisma.config.ts ./
COPY prisma ./prisma
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ── Build ──
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/src/generated ./src/generated
COPY . .
# public/ is optional and git doesn't keep empty folders, but the runtime stage copies it.
RUN mkdir -p public
# Build-time placeholders so env validation passes; real values are injected at runtime.
ENV NEXT_OUTPUT=standalone \
    DATABASE_URL=postgresql://build:build@localhost:5432/build \
    AUTH_SECRET=build-time-placeholder-not-a-real-secret-000
RUN pnpm build

# ── Migrations ──
FROM base AS migrate
COPY --from=deps /app/node_modules ./node_modules
COPY package.json prisma.config.ts ./
COPY prisma ./prisma
USER node
CMD ["node_modules/.bin/prisma", "migrate", "deploy"]

# ── Runtime ──
FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "server.js"]
