# Builds one Next.js app from the monorepo into a standalone server image.
# Usage (from repo root): docker build -f infra/docker/next.Dockerfile --build-arg APP=web .
FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS build
ARG APP
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/${APP}/package.json apps/${APP}/
RUN pnpm install --frozen-lockfile --filter "./apps/${APP}..."
COPY apps/${APP} apps/${APP}
RUN pnpm --filter "./apps/${APP}" build

FROM node:24-alpine AS runtime
ARG APP
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /srv
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /repo/apps/${APP}/.next/standalone ./
COPY --from=build --chown=app:app /repo/apps/${APP}/.next/static ./apps/${APP}/.next/static
COPY --from=build --chown=app:app /repo/apps/${APP}/public ./apps/${APP}/public
USER app
EXPOSE 3000
ENV APP_DIR=apps/${APP}
CMD ["sh", "-c", "node ${APP_DIR}/server.js"]
