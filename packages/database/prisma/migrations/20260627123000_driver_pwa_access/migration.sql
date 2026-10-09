-- Add separate PWA access credentials and sessions for tienda online mensajeros.
ALTER TABLE "store_drivers"
  ADD COLUMN "passwordHash" TEXT,
  ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "accessStatus" TEXT NOT NULL DEFAULT 'PENDIENTE_PRIMER_INGRESO',
  ADD COLUMN "lastLoginAt" TIMESTAMP(3);

UPDATE "store_drivers"
SET "accessStatus" = 'INACTIVO'
WHERE "isActive" = false;

-- Existing driver email was informational. Keep only one row per email before enforcing uniqueness.
WITH ranked_emails AS (
  SELECT
    "id",
    row_number() OVER (PARTITION BY lower("email") ORDER BY "updatedAt" DESC, "createdAt" DESC, "id" DESC) AS row_number
  FROM "store_drivers"
  WHERE "email" IS NOT NULL
)
UPDATE "store_drivers"
SET "email" = NULL
WHERE "id" IN (
  SELECT "id"
  FROM ranked_emails
  WHERE row_number > 1
);

CREATE UNIQUE INDEX "store_drivers_email_key" ON "store_drivers"("email");
CREATE INDEX "store_drivers_accessStatus_idx" ON "store_drivers"("accessStatus");

CREATE TABLE "store_driver_sessions" (
  "id" TEXT NOT NULL,
  "driverId" TEXT NOT NULL,
  "refreshTokenHash" TEXT NOT NULL,
  "userAgent" TEXT,
  "ipAddress" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "store_driver_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "store_driver_sessions_driverId_idx" ON "store_driver_sessions"("driverId");
CREATE INDEX "store_driver_sessions_expiresAt_idx" ON "store_driver_sessions"("expiresAt");

ALTER TABLE "store_driver_sessions"
  ADD CONSTRAINT "store_driver_sessions_driverId_fkey"
  FOREIGN KEY ("driverId") REFERENCES "store_drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "Permission" ("id", "code", "module", "action", "description", "createdAt", "updatedAt")
VALUES (
  'perm_' || substr(md5('store_drivers.access'), 1, 20),
  'store_drivers.access',
  'store_drivers',
  'access',
  'Gestionar acceso de mensajeros a la PWA',
  now(),
  now()
)
ON CONFLICT ("code") DO UPDATE SET
  "module" = EXCLUDED."module",
  "action" = EXCLUDED."action",
  "description" = EXCLUDED."description",
  "updatedAt" = now();

INSERT INTO "InternalUserPermission" ("userId", "permissionId")
SELECT DISTINCT existing."userId", access_permission."id"
FROM "InternalUserPermission" existing
JOIN "Permission" existing_permission ON existing_permission."id" = existing."permissionId"
CROSS JOIN "Permission" access_permission
WHERE existing_permission."code" IN ('store_drivers.edit', 'users.manage', 'permissions.read')
  AND access_permission."code" = 'store_drivers.access'
ON CONFLICT DO NOTHING;
