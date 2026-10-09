INSERT INTO "Permission" ("id", "code", "module", "action", "description", "createdAt", "updatedAt")
VALUES ('perm_customers_create', 'customers.create', 'customers', 'create', 'Registrar clientes', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO UPDATE SET
  "module" = EXCLUDED."module",
  "action" = EXCLUDED."action",
  "description" = EXCLUDED."description",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE p."code" = 'customers.create'
  AND r."name" IN ('Super Admin', 'Admin', 'Supervisor', 'Vendedora')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

DELETE FROM "RolePermission"
WHERE "permissionId" = (SELECT "id" FROM "Permission" WHERE "code" = 'customers.manage')
  AND "roleId" IN (SELECT "id" FROM "Role" WHERE "name" = 'Vendedora');
