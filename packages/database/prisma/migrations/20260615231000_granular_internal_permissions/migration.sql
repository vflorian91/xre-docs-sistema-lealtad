WITH permission_seed(code, module, action, description) AS (
  VALUES
    ('users.read', 'users', 'read', 'Ver listado de usuarios'),
    ('users.view_profile', 'users', 'view_profile', 'Ver perfil de usuario'),
    ('users.create', 'users', 'create', 'Crear usuarios'),
    ('users.edit', 'users', 'edit', 'Editar usuarios'),
    ('users.status', 'users', 'status', 'Inactivar o reactivar usuarios'),
    ('users.assign_roles', 'users', 'assign_roles', 'Asignar roles a usuarios'),
    ('users.assign_stores', 'users', 'assign_stores', 'Asignar tiendas a usuarios'),
    ('users.manage_permissions', 'users', 'manage_permissions', 'Gestionar permisos directos de usuarios'),
    ('users.export', 'users', 'export', 'Exportar usuarios'),
    ('stores.read', 'stores', 'read', 'Ver listado de tiendas'),
    ('stores.view_profile', 'stores', 'view_profile', 'Ver detalle de tienda'),
    ('stores.create', 'stores', 'create', 'Crear tiendas'),
    ('stores.edit', 'stores', 'edit', 'Editar tiendas'),
    ('stores.status', 'stores', 'status', 'Inactivar o reactivar tiendas'),
    ('stores.assign_users', 'stores', 'assign_users', 'Asignar usuarios a tiendas'),
    ('stores.export', 'stores', 'export', 'Exportar tiendas'),
    ('stores.catalog_manage', 'stores', 'catalog_manage', 'Gestionar catalogo de tiendas'),
    ('customers.read', 'customers', 'read', 'Ver listado de clientes'),
    ('customers.view_all', 'customers', 'view_all', 'Ver clientes de todas las tiendas'),
    ('customers.view_profile', 'customers', 'view_profile', 'Ver perfil de cliente'),
    ('customers.edit', 'customers', 'edit', 'Editar clientes'),
    ('customers.status', 'customers', 'status', 'Inactivar o reactivar clientes'),
    ('customers.export', 'customers', 'export', 'Exportar clientes')
)
INSERT INTO "Permission" ("id", "code", "module", "action", "description", "createdAt", "updatedAt")
SELECT
  'perm_' || substr(md5(code), 1, 20),
  code,
  module,
  action,
  description,
  now(),
  now()
FROM permission_seed
ON CONFLICT ("code") DO UPDATE SET
  "module" = EXCLUDED."module",
  "action" = EXCLUDED."action",
  "description" = EXCLUDED."description",
  "updatedAt" = now();

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE r."name" = 'Super Admin'
  AND p."code" IN (
    'users.view_profile',
    'users.create',
    'users.edit',
    'users.status',
    'users.assign_roles',
    'users.assign_stores',
    'users.manage_permissions',
    'users.export',
    'stores.view_profile',
    'stores.create',
    'stores.edit',
    'stores.status',
    'stores.assign_users',
    'stores.export',
    'stores.catalog_manage',
    'customers.view_all',
    'customers.view_profile',
    'customers.edit',
    'customers.status',
    'customers.export'
  )
ON CONFLICT DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE r."name" = 'Admin'
  AND p."code" IN (
    'users.view_profile',
    'users.create',
    'users.edit',
    'users.status',
    'users.assign_roles',
    'users.assign_stores',
    'users.manage_permissions',
    'users.export',
    'stores.view_profile',
    'stores.create',
    'stores.edit',
    'stores.status',
    'stores.assign_users',
    'stores.export',
    'stores.catalog_manage',
    'customers.view_all',
    'customers.view_profile',
    'customers.edit',
    'customers.status',
    'customers.export'
  )
ON CONFLICT DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE r."name" = 'Supervisor'
  AND p."code" IN (
    'stores.view_profile',
    'customers.view_all',
    'customers.view_profile',
    'customers.edit',
    'customers.export'
  )
ON CONFLICT DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE r."name" = 'Auditor'
  AND p."code" IN (
    'stores.view_profile',
    'customers.view_all',
    'customers.view_profile'
  )
ON CONFLICT DO NOTHING;
