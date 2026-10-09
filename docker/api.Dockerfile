FROM node:20-bookworm-slim AS base

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/admin-web/package.json apps/admin-web/package.json
COPY apps/client-pwa/package.json apps/client-pwa/package.json
COPY apps/driver-pwa/package.json apps/driver-pwa/package.json
COPY packages/database/package.json packages/database/package.json

RUN npm ci

COPY apps/api apps/api
COPY packages packages

RUN npm run db:generate \
  && npm run build:packages \
  && npm run build -w @lealtad/api \
  && npm prune --omit=dev

ENV NODE_ENV=production

EXPOSE 4000

CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy --schema=/app/packages/database/prisma/schema.prisma && exec npm run start -w @lealtad/api"]
