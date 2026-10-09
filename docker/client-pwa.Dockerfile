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

COPY apps/client-pwa apps/client-pwa
COPY packages packages

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

RUN npm run db:generate \
  && npm run build:packages \
  && npm run build -w @lealtad/client-pwa \
  && npm prune --omit=dev

ENV NODE_ENV=production

EXPOSE 3002

CMD ["npm", "run", "start", "-w", "@lealtad/client-pwa"]
