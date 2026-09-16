# ─── Etapa 1: build ────────────────────────────────
FROM node:26-alpine AS builder
WORKDIR /app
RUN npm install -g npm@12
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ─── Etapa 2: prod deps only ───────────────────────
FROM node:26-alpine AS deps
WORKDIR /app
RUN npm install -g npm@12
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ─── Etapa 3: runtime ─────────────────────────────
FROM node:26-alpine AS runtime
WORKDIR /app
RUN npm install -g npm@12

ENV NODE_ENV=prod

RUN addgroup -S app && adduser -S app -G app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package*.json ./

USER app
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/main.js"]