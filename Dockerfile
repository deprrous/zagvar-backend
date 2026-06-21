# ---- Build stage -----------------------------------------------------------
FROM node:22-slim AS builder
WORKDIR /app

# OpenSSL is required by Prisma.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci

COPY . .
# prisma.config.ts resolves DATABASE_URL at load time; generation doesn't
# connect, so a dummy URL satisfies the config without a real database.
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build?schema=public" npx prisma generate \
  && npm run build

# ---- Runtime stage ---------------------------------------------------------
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Carry the fully-installed modules from the builder so the Prisma CLI (for
# `migrate deploy`) and ts-node (for `npm run db:seed`) are available at
# runtime alongside the generated client. Same base image + arch, so native
# addons (bcrypt) remain valid.
COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

EXPOSE 3010
# Apply pending migrations, then start.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
