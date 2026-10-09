DELETE FROM "RolePermission"
WHERE "permissionId" = (SELECT "id" FROM "Permission" WHERE "code" = 'customers.manage')
  AND "roleId" IN (SELECT "id" FROM "Role" WHERE "name" IN ('Supervisor', 'Vendedora'));
