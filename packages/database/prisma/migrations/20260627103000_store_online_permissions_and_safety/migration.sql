-- Keep Prisma schema and database defaults aligned for the restored approval workflow.
ALTER TABLE "redemption_requests" ALTER COLUMN "status" SET DEFAULT 'PENDING_APPROVAL';

-- Ensure the tienda online module works in deploy-only environments, not only after seed.
WITH permission_values ("code", "module", "action", "description") AS (
  VALUES
    ('store_brands.read', 'store_brands', 'read', 'Ver marcas de tienda online'),
    ('store_brands.create', 'store_brands', 'create', 'Crear marcas de tienda online'),
    ('store_brands.edit', 'store_brands', 'edit', 'Editar marcas de tienda online'),
    ('store_brands.status', 'store_brands', 'status', 'Activar o inactivar marcas de tienda online'),
    ('store_products.read', 'store_products', 'read', 'Ver productos de tienda online'),
    ('store_products.create', 'store_products', 'create', 'Crear productos de tienda online'),
    ('store_products.edit', 'store_products', 'edit', 'Editar productos de tienda online'),
    ('store_products.status', 'store_products', 'status', 'Activar o inactivar productos de tienda online'),
    ('store_products.stock', 'store_products', 'stock', 'Ajustar stock de productos de tienda online'),
    ('store_products.visibility', 'store_products', 'visibility', 'Controlar visibilidad de productos en tienda online'),
    ('store_products.images', 'store_products', 'images', 'Gestionar imagenes de productos de tienda online'),
    ('store_orders.read', 'store_orders', 'read', 'Ver pedidos de tienda online'),
    ('store_orders.review', 'store_orders', 'review', 'Marcar pedidos en revision'),
    ('store_orders.confirm', 'store_orders', 'confirm', 'Confirmar pedidos de tienda online'),
    ('store_orders.reschedule', 'store_orders', 'reschedule', 'Reprogramar pedidos de tienda online'),
    ('store_orders.cancel', 'store_orders', 'cancel', 'Cancelar pedidos de tienda online'),
    ('store_orders.payments', 'store_orders', 'payments', 'Gestionar pagos de pedidos de tienda online'),
    ('store_orders.visa_link', 'store_orders', 'visa_link', 'Registrar enlaces Visa Link en pedidos'),
    ('store_delivery_schedule.read', 'store_delivery_schedule', 'read', 'Ver agenda de entregas de tienda online'),
    ('store_delivery_schedule.program', 'store_delivery_schedule', 'program', 'Programar entregas de tienda online'),
    ('store_delivery_schedule.reschedule', 'store_delivery_schedule', 'reschedule', 'Reprogramar entregas de tienda online'),
    ('store_delivery_schedule.assign', 'store_delivery_schedule', 'assign', 'Asignar mensajeros a entregas de tienda online'),
    ('store_delivery_schedule.cancel', 'store_delivery_schedule', 'cancel', 'Cancelar programacion logistica de entregas'),
    ('store_drivers.read', 'store_drivers', 'read', 'Ver mensajeros de tienda online'),
    ('store_drivers.create', 'store_drivers', 'create', 'Crear mensajeros de tienda online'),
    ('store_drivers.edit', 'store_drivers', 'edit', 'Editar mensajeros de tienda online'),
    ('store_drivers.status', 'store_drivers', 'status', 'Activar o inactivar mensajeros de tienda online')
)
INSERT INTO "Permission" ("id", "code", "module", "action", "description", "createdAt", "updatedAt")
SELECT
  'perm_' || substr(md5(permission_values."code"), 1, 20),
  permission_values."code",
  permission_values."module",
  permission_values."action",
  permission_values."description",
  now(),
  now()
FROM permission_values
ON CONFLICT ("code") DO UPDATE SET
  "module" = EXCLUDED."module",
  "action" = EXCLUDED."action",
  "description" = EXCLUDED."description",
  "updatedAt" = now();

-- Existing super/admin users with broad operational access keep access to the new module.
INSERT INTO "InternalUserPermission" ("userId", "permissionId")
SELECT DISTINCT existing."userId", store_permission."id"
FROM "InternalUserPermission" existing
JOIN "Permission" existing_permission ON existing_permission."id" = existing."permissionId"
CROSS JOIN "Permission" store_permission
WHERE existing_permission."code" IN ('users.manage', 'permissions.read', 'customers.view_all')
  AND store_permission."code" LIKE 'store\_%' ESCAPE '\'
ON CONFLICT DO NOTHING;

-- Collapse duplicate active carts before enforcing one active cart per customer.
WITH ranked_active_carts AS (
  SELECT
    "id",
    row_number() OVER (
      PARTITION BY "customerId"
      ORDER BY "updatedAt" DESC, "createdAt" DESC, "id" DESC
    ) AS row_number
  FROM "store_carts"
  WHERE "status" = 'ACTIVE'
)
UPDATE "store_carts"
SET "status" = 'ABANDONED', "updatedAt" = now()
WHERE "id" IN (
  SELECT "id"
  FROM ranked_active_carts
  WHERE row_number > 1
);

CREATE UNIQUE INDEX "store_carts_one_active_per_customer_idx"
ON "store_carts"("customerId")
WHERE "status" = 'ACTIVE';

CREATE UNIQUE INDEX "store_product_stock_movements_product_reference_key"
ON "store_product_stock_movements"("productId", "referenceType", "referenceId", "movementType");
