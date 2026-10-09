-- Los canjes de productos se aprueban automaticamente al ser solicitados.
-- El permiso anterior se reemplaza por uno especifico para el canje directo de puntos.
INSERT INTO "Permission" ("id", "code", "module", "action", "description", "createdAt", "updatedAt")
VALUES (
  'perm_' || substr(md5('redemption_requests.redeem_points'), 1, 20),
  'redemption_requests.redeem_points',
  'redemption_requests',
  'redeem_points',
  'Canjear directamente puntos de clientes',
  now(),
  now()
)
ON CONFLICT ("code") DO UPDATE SET
  "module" = EXCLUDED."module",
  "action" = EXCLUDED."action",
  "description" = EXCLUDED."description",
  "updatedAt" = now();

INSERT INTO "InternalUserPermission" ("userId", "permissionId")
SELECT old_assignment."userId", new_permission."id"
FROM "InternalUserPermission" old_assignment
JOIN "Permission" old_permission ON old_permission."id" = old_assignment."permissionId"
CROSS JOIN "Permission" new_permission
WHERE old_permission."code" = 'redemption_requests.approve'
  AND new_permission."code" = 'redemption_requests.redeem_points'
ON CONFLICT DO NOTHING;

DELETE FROM "InternalUserPermission"
WHERE "permissionId" IN (
  SELECT "id" FROM "Permission" WHERE "code" = 'redemption_requests.approve'
);

DELETE FROM "RolePermission"
WHERE "permissionId" IN (
  SELECT "id" FROM "Permission" WHERE "code" = 'redemption_requests.approve'
);

DELETE FROM "Permission" WHERE "code" = 'redemption_requests.approve';

UPDATE "redemption_requests"
SET
  "status" = 'APPROVED',
  "approvedAt" = COALESCE("approvedAt", "requestedAt")
WHERE "status" = 'PENDING';

ALTER TABLE "redemption_requests" ALTER COLUMN "status" DROP DEFAULT;
CREATE TYPE "RedemptionRequestStatus_new" AS ENUM (
  'APPROVED',
  'READY',
  'DELIVERED',
  'REJECTED',
  'CANCELLED',
  'EXPIRED'
);
ALTER TABLE "redemption_requests"
ALTER COLUMN "status" TYPE "RedemptionRequestStatus_new"
USING ("status"::text::"RedemptionRequestStatus_new");
DROP TYPE "RedemptionRequestStatus";
ALTER TYPE "RedemptionRequestStatus_new" RENAME TO "RedemptionRequestStatus";
ALTER TABLE "redemption_requests" ALTER COLUMN "status" SET DEFAULT 'APPROVED';
