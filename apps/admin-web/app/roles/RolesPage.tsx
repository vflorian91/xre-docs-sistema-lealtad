'use client';

import { Database, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import AdminRoutedShell from '../AdminRoutedShell';
import { adminApiRequest, clearAdminSession, getErrorText } from '../lib/adminApi';
import { formatNumber } from '../lib/format';

type StoreRow = {
  id: string;
  code: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
};

type PermissionRow = {
  id: string;
  code: string;
  module: string;
  action: string;
  description?: string | null;
};

type RoleRow = {
  id: string;
  name: string;
  description?: string | null;
  permissions?: Array<{ permission: PermissionRow }>;
};

type AdminUserRow = {
  id: string;
  fullName: string;
  email: string;
  status: string;
  roleAssignments: Array<{ role: RoleRow }>;
  storeAssignments: Array<{ store: StoreRow }>;
};

export default function RolesPage() {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    void loadRoles();
  }, []);

  async function loadRoles() {
    setIsLoading(true);
    setMessage(null);

    try {
      const [rolesResult, usersResult] = await Promise.all([
        adminApiRequest<RoleRow[]>('/internal-users/roles'),
        adminApiRequest<AdminUserRow[]>('/internal-users'),
      ]);
      setRoles(rolesResult);
      setUsers(usersResult);
    } catch (error) {
      const text = getErrorText(error, 'No se pudieron cargar los roles.');
      setMessage({ type: 'error', text });
      if (/sesion|token|unauthorized|expirada/i.test(text)) {
        clearAdminSession();
      }
    } finally {
      setIsLoading(false);
    }
  }

  const permissionModules = Array.from(
    new Set(roles.flatMap((role) => role.permissions?.map((assignment) => assignment.permission.module) ?? [])),
  ).sort();
  return (
    <AdminRoutedShell title="Roles y permisos">
      {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}

      <section className="reports-stack">
        <section className="roles-grid">
          {roles.map((role) => {
            const rolePermissions = role.permissions?.map((assignment) => assignment.permission) ?? [];
            const usersWithRole = users.filter((user) => user.roleAssignments.some((assignment) => assignment.role.id === role.id));
            const modules = Array.from(new Set(rolePermissions.map((permission) => permission.module))).sort();

            return (
              <article className="panel role-card" key={role.id}>
                <div className="panel-header">
                  <div>
                    <h2>{role.name}</h2>
                    <p className="muted-copy">{role.description ?? 'Sin descripcion'}</p>
                  </div>
                  <span className="count-pill">{formatNumber(rolePermissions.length)} permisos</span>
                </div>

                <div className="role-meta">
                  <span><Users size={16} /> {formatNumber(usersWithRole.length)} usuarios</span>
                  <span><Database size={16} /> {formatNumber(modules.length)} modulos</span>
                </div>

                <div className="permission-groups">
                  {modules.map((moduleName) => (
                    <div className="permission-group" key={moduleName}>
                      <strong>{moduleLabel(moduleName)}</strong>
                      <div>
                        {rolePermissions
                          .filter((permission) => permission.module === moduleName)
                          .sort((a, b) => a.code.localeCompare(b.code))
                          .map((permission) => (
                            <span className="permission-chip" key={permission.code} title={permission.description ?? permission.code}>
                              {permissionActionLabel(permission.action)}
                            </span>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </section>

        <article className="panel table-panel wide-panel">
          <div className="panel-header">
            <h2>Matriz de permisos por rol</h2>
            <span className="count-pill">{permissionModules.length} modulos</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Rol</th>
                {permissionModules.map((moduleName) => <th key={moduleName}>{moduleLabel(moduleName)}</th>)}
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => {
                const codesByModule = new Map<string, string[]>();

                for (const assignment of role.permissions ?? []) {
                  const current = codesByModule.get(assignment.permission.module) ?? [];
                  current.push(permissionActionLabel(assignment.permission.action));
                  codesByModule.set(assignment.permission.module, current);
                }

                return (
                  <tr key={role.id}>
                    <td>{role.name}</td>
                    {permissionModules.map((moduleName) => (
                      <td key={moduleName}>
                        {(codesByModule.get(moduleName) ?? []).length ? (
                          <span className="matrix-permissions">{(codesByModule.get(moduleName) ?? []).join(', ')}</span>
                        ) : '-'}
                      </td>
                    ))}
                  </tr>
                );
              })}
              {!isLoading && roles.length === 0 ? <tr><td colSpan={Math.max(1, permissionModules.length + 1)}>No hay roles registrados.</td></tr> : null}
              {isLoading ? <tr><td colSpan={Math.max(1, permissionModules.length + 1)}>Cargando roles...</td></tr> : null}
            </tbody>
          </table>
        </article>
      </section>
    </AdminRoutedShell>
  );
}

function moduleLabel(module: string) {
  const labels: Record<string, string> = {
    auth: 'Autenticacion',
    settings: 'Parametros',
    users: 'Usuarios',
    stores: 'Tiendas',
    customers: 'Clientes',
    purchases: 'Compras',
    points: 'Puntos',
    catalogs: 'Catalogos',
    rewards: 'Premios',
    redemptions: 'Canjes',
    redeemable_products: 'Productos canjeables',
    redemption_requests: 'Solicitudes de canje',
    marketing: 'Marketing',
    notifications: 'Notificaciones',
    media: 'Media',
    permissions: 'Permisos',
    roles: 'Roles',
    reports: 'Reportes',
    audit: 'Auditoria',
  };

  return labels[module] ?? module;
}

function permissionActionLabel(action: string) {
  const labels: Record<string, string> = {
    read: 'leer',
    manage: 'gestionar',
    create: 'crear',
    edit: 'editar',
    status: 'estado',
    view_all: 'ver todos',
    view_profile: 'ver perfil',
    assign_roles: 'asignar roles',
    assign_stores: 'asignar tiendas',
    assign_users: 'asignar usuarios',
    manage_permissions: 'permisos',
    catalog_manage: 'catalogo',
    approve: 'aprobar',
    reject: 'rechazar',
    mark_ready: 'listo',
    mark_delivered: 'entregar',
    cancel: 'cancelar',
    review: 'revisar',
    reverse: 'reversar',
    export: 'exportar',
  };

  return labels[action] ?? action;
}
