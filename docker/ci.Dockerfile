FROM node:22-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/admin-web/package.json apps/admin-web/package.json
COPY apps/client-pwa/package.json apps/client-pwa/package.json
COPY apps/driver-pwa/package.json apps/driver-pwa/package.json
COPY packages/database/package.json packages/database/package.json
RUN npm ci
COPY apps/api apps/api
COPY packages packages
COPY scripts/ci scripts/ci
COPY tests tests
RUN npm run db:generate && npm run build:packages && npm run build -w @lealtad/api
CMD ["sh","-c","./node_modules/.bin/prisma migrate deploy --schema=packages/database/prisma/schema.prisma && node packages/database/prisma/seed.mjs && exec npm run start -w @lealtad/api"]
