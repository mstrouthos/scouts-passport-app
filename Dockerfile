FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-bookworm-slim
# curl is here for one reason: the platform runs its health check *inside* this
# container, and the slim image ships neither curl nor wget — without it every
# probe answers "command not found" and the rolling update never goes through.
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.output ./.output
EXPOSE 3000
# Docker's own probe, for anything that reads it. /api/health answers only once
# the database is reachable too, so a container that cannot serve is never
# handed traffic.
HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=6 \
  CMD curl -fsS http://127.0.0.1:3000/api/health || exit 1
CMD ["node", ".output/server/index.mjs"]
