# ─── Etapa 1: build ────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN npm install -g pnpm@$(node -p "require('./package.json').packageManager.match(/^pnpm@([^+]+)/)[1]")
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# ─── Etapa 2: prod deps only ───────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN npm install -g pnpm@$(node -p "require('./package.json').packageManager.match(/^pnpm@([^+]+)/)[1]")
RUN pnpm install --prod --frozen-lockfile

# ─── Etapa 3: runtime ─────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S app -G app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3000/health/live || exit 1
CMD ["node", "dist/main.js"]
