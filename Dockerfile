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
RUN npx prisma generate && npm run build

# ---- Runtime stage ---------------------------------------------------------
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci --omit=dev && npx prisma generate

COPY --from=builder /app/dist ./dist

EXPOSE 3010
# Apply pending migrations, then start.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
