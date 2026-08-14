# syntax=docker/dockerfile:1

# ---- base: shared setup, has build toolchain for native deps (better-sqlite3) ----
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./

# ---- full install (deps + devDeps), used by the dev image ----
FROM base AS deps-dev
RUN npm ci

# ---- prod-only install, used by the prod image ----
FROM base AS deps-prod
RUN npm ci --omit=dev

# ---- dev: live-reload via `node --watch`, source mounted in by docker-compose.dev.yml ----
FROM base AS dev
ENV NODE_ENV=development
COPY --from=deps-dev /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ---- prod: minimal runtime image, no build toolchain, non-root user ----
FROM node:22-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache tini
COPY --from=deps-prod /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY public ./public
RUN addgroup -S app && adduser -S app -G app \
    && mkdir -p /app/data && chown -R app:app /app
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
    CMD wget -qO- http://localhost:3000/api/health || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/server.js"]
