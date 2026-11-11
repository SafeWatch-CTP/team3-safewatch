# The web app's image. CI is the only place this gets built
# (docs/specs/deploy.md), so no contributor needs docker. The build context
# is the repo root, because the app depends on workspace packages:
#   docker build -f apps/web/Dockerfile .

# ---- base: what both stages share; the same base keeps Prisma's engine matching ----
FROM node:24-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/*
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# ---- build: every dependency, the Prisma client, the Next build ----
FROM base AS build
RUN npm install -g pnpm@11.17.0

# The lockfile alone decides what gets downloaded, so a code-only change
# reuses this layer instead of fetching every package again.
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm fetch

COPY . .
RUN pnpm install --frozen-lockfile --offline
RUN pnpm prisma:generate && pnpm --filter @project/web build

# ---- run: no build tools, not root ----
# The same /app path as the build: the Next build records where the Prisma
# client lives (apps/web/next.config.ts), so it has to be there at runtime too.
FROM base
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app ./
USER node
EXPOSE 3000

# Serve only. Migrations run before the deploy, in a Container Apps Job that
# starts this same image with the migrator as its command (ADR-0014):
#   /app/apps/migrate/node_modules/.bin/tsx /app/apps/migrate/src/index.ts
WORKDIR /app/apps/web
CMD ["./node_modules/.bin/next", "start"]
