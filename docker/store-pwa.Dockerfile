FROM node:20-bookworm-slim AS base

WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/admin-web/package.json apps/admin-web/package.json
COPY apps/store-pwa/package.json apps/store-pwa/package.json
COPY apps/client-pwa/package.json apps/client-pwa/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/validators/package.json packages/validators/package.json
COPY packages/database/package.json packages/database/package.json

RUN npm ci

COPY apps/store-pwa apps/store-pwa
COPY packages packages

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run db:generate \
  && npm run build:packages \
  && npm run build -w @lealtad/store-pwa \
  && npm prune --omit=dev

ENV NODE_ENV=production

EXPOSE 3001

CMD ["npm", "run", "start", "-w", "@lealtad/store-pwa"]
