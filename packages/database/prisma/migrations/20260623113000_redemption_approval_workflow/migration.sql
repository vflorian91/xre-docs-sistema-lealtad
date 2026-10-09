-- Restaura un paso real de aprobacion para canjes que requieren aprobacion,
-- y agrega una etapa explicita de "enviado a tienda" antes de "listo para recoger".
ALTER TABLE "redemption_requests" ALTER COLUMN "status" DROP DEFAULT;
CREATE TYPE "RedemptionRequestStatus_new" AS ENUM (
  'PENDING_APPROVAL',
  'APPROVED',
  'SENT_TO_STORE',
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
ALTER TABLE "redemption_requests" ALTER COLUMN "status" SET DEFAULT 'PENDING_APPROVAL';

INSERT INTO "Permission" ("id", "code", "module", "action", "description", "createdAt", "updatedAt")
VALUES (
  'perm_' || substr(md5('redemption_requests.approve'), 1, 20),
  'redemption_requests.approve',
  'redemption_requests',
  'approve',
  'Aprobar solicitudes de canje pendientes',
  now(),
  now()
)
ON CONFLICT ("code") DO UPDATE SET
  "module" = EXCLUDED."module",
  "action" = EXCLUDED."action",
  "description" = EXCLUDED."description",
  "updatedAt" = now();

INSERT INTO "Permission" ("id", "code", "module", "action", "description", "createdAt", "updatedAt")
VALUES (
  'perm_' || substr(md5('redemption_requests.mark_sent_to_store'), 1, 20),
  'redemption_requests.mark_sent_to_store',
  'redemption_requests',
  'mark_sent_to_store',
  'Marcar solicitudes de canje como enviadas a tienda',
  now(),
  now()
)
ON CONFLICT ("code") DO UPDATE SET
  "module" = EXCLUDED."module",
  "action" = EXCLUDED."action",
  "description" = EXCLUDED."description",
  "updatedAt" = now();

-- Otorga los nuevos permisos a quienes ya gestionan canjes (tienen mark_ready, mark_delivered o reject).
INSERT INTO "InternalUserPermission" ("userId", "permissionId")
SELECT DISTINCT existing."userId", new_permission."id"
FROM "InternalUserPermission" existing
JOIN "Permission" existing_permission ON existing_permission."id" = existing."permissionId"
CROSS JOIN "Permission" new_permission
WHERE existing_permission."code" IN ('redemption_requests.mark_ready', 'redemption_requests.mark_delivered', 'redemption_requests.reject')
  AND new_permission."code" IN ('redemption_requests.approve', 'redemption_requests.mark_sent_to_store')
ON CONFLICT DO NOTHING;

-- Separa la consulta de compras global de la consulta limitada a tiendas asignadas.
INSERT INTO "Permission" ("id", "code", "module", "action", "description", "createdAt", "updatedAt")
VALUES (
  'perm_' || substr(md5('purchases.read_all'), 1, 20),
  'purchases.read_all',
  'purchases',
  'read_all',
  'Consultar compras de todas las tiendas y marcas',
  now(),
  now()
)
ON CONFLICT ("code") DO UPDATE SET
  "module" = EXCLUDED."module",
  "action" = EXCLUDED."action",
  "description" = EXCLUDED."description",
  "updatedAt" = now();

UPDATE "Permission"
SET "description" = 'Consultar compras de las tiendas y marcas asignadas', "updatedAt" = now()
WHERE "code" = 'purchases.read';

-- Conserva el acceso global de administradores que ya tenian permiso para ver todos los clientes.
INSERT INTO "InternalUserPermission" ("userId", "permissionId")
SELECT DISTINCT existing."userId", global_purchase_permission."id"
FROM "InternalUserPermission" existing
JOIN "Permission" existing_permission ON existing_permission."id" = existing."permissionId"
CROSS JOIN "Permission" global_purchase_permission
WHERE existing_permission."code" = 'customers.view_all'
  AND global_purchase_permission."code" = 'purchases.read_all'
ON CONFLICT DO NOTHING;
