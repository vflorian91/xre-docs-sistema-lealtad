'use client';

import {
  ArrowLeft,
  Bell,
  CalendarDays,
  Check,
  Clock3,
  Database,
  Gift,
  Grid2X2,
  KeyRound,
  Lock,
  Mail,
  Megaphone,
  Pencil,
  Repeat2,
  Save,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Star,
  Store,
  User,
  Users,
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { ComponentType, SVGProps, useEffect, useMemo, useState } from 'react';
import AdminRoutedShell from '../../AdminRoutedShell';
import { adminApiRequest, getErrorText, getStoredAdminUser, StoredAdminUser } from '../../lib/adminApi';
import { formatDate } from '../../lib/format';

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

type StoreRow = {
  id: string;
  code: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
};

type RoleRow = {
  id: string;
  name: string;
  description?: string | null;
};

type PermissionRow = {
  id: string;
  code: string;
  module: string;
  action: string;
  description?: string | null;
};

type AdminUserDetail = {
  id: string;
  fullName: string;
  email: string;
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
  mustChangePassword: boolean;
  createdAt?: string;
  updatedAt?: string;
  roleAssignments: Array<{ role: RoleRow }>;
  directPermissions: Array<{ permission: PermissionRow }>;
  storeAssignments: Array<{ store: StoreRow }>;
  sessions?: Array<{ createdAt: string; updatedAt: string }>;
};

const moduleMeta: Record<string, { label: string; icon: IconType }> = {
  audit: { label: 'Auditoria', icon: ShieldCheck },
  catalogs: { label: 'Catalogos', icon: Database },
  customers: { label: 'Clientes', icon: Users },
  marketing: { label: 'Campanas', icon: Megaphone },
  notifications: { label: 'Notificaciones', icon: Bell },
  permissions: { label: 'Permisos', icon: Lock },
  points: { label: 'Puntos', icon: Star },
  purchases: { label: 'Transacciones', icon: Repeat2 },
  redeemable_products: { label: 'Productos canjeables', icon: Gift },
  redemption_requests: { label: 'Solicitudes de canje', icon: Gift },
  reports: { label: 'Reportes', icon: Grid2X2 },
  roles: { label: 'Roles', icon: ShieldCheck },
  settings: { label: 'Configuracion', icon: Settings },
  stores: { label: 'Tiendas', icon: Store },
  users: { label: 'Usuarios', icon: User },
};

const hiddenLegacyPermissionCodes = new Set([
  'customers.manage',
  'redemptions.manage',
  'redemptions.read',
  'redemptions.validate',
  'stores.manage',
  'users.manage',
]);

const STORE_ONLINE_TAB_KEY = 'tienda_online';

const STORE_ONLINE_MODULE_LABELS: Record<string, string> = {
  store_brands: 'Marcas',
  store_products: 'Productos',
  store_orders: 'Pedidos',
  store_delivery_schedule: 'Agenda de Entregas',
  store_drivers: 'Mensajeros',
  store_payment_settlements: 'Liquidación de Cobros',
  store_reports: 'Reportes',
};

const STORE_ONLINE_MODULES = Object.keys(STORE_ONLINE_MODULE_LABELS);

export default function UsuarioPerfilPage() {
  const params = useParams<{ id: string }>();
  const userId = params.id;
  const [currentAdmin, setCurrentAdmin] = useState<StoredAdminUser | null>(null);
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [selectedPermissionCodes, setSelectedPermissionCodes] = useState<string[]>([]);
  const [activeModule, setActiveModule] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setCurrentAdmin(getStoredAdminUser());
    void loadWorkspace();
  }, [userId]);

  async function loadWorkspace() {
    setIsLoading(true);
    setMessage(null);

    try {
      const [userResult, permissionsResult] = await Promise.all([
        adminApiRequest<AdminUserDetail>(`/internal-users/${userId}`),
        adminApiRequest<PermissionRow[]>('/internal-users/permissions'),
      ]);
      const visiblePermissions = permissionsResult.filter((permission) => !hiddenLegacyPermissionCodes.has(permission.code));
      const visibleCodes = new Set(visiblePermissions.map((permission) => permission.code));
      const permissionCodes = userResult.directPermissions
        .map((assignment) => assignment.permission.code)
        .filter((code) => visibleCodes.has(code))
        .sort();
      const modules = buildModules(visiblePermissions);
      setUser(userResult);
      setPermissions(visiblePermissions);
      setSelectedPermissionCodes(permissionCodes);
      setActiveModule((current) => current || modules[0]?.module || '');
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo cargar el usuario.') });
    } finally {
      setIsLoading(false);
    }
  }

  async function savePermissions() {
    setIsSavingPermissions(true);
    setMessage(null);

    try {
      const updated = await adminApiRequest<AdminUserDetail>(`/internal-users/${userId}/permissions`, {
        method: 'PATCH',
        body: JSON.stringify({ permissionCodes: selectedPermissionCodes }),
      });
      setUser(updated);
      setSelectedPermissionCodes(updated.directPermissions.map((assignment) => assignment.permission.code).sort());
      setMessage({ type: 'success', text: 'Permisos actualizados correctamente.' });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudieron guardar los permisos.') });
    } finally {
      setIsSavingPermissions(false);
    }
  }

  function togglePermission(code: string) {
    setSelectedPermissionCodes((current) => {
      const next = new Set(current);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return [...next].sort();
    });
  }

  const selectedSet = useMemo(() => new Set(selectedPermissionCodes), [selectedPermissionCodes]);
  const modules = useMemo(() => buildModules(permissions), [permissions]);
  const isStoreOnlineTab = activeModule === STORE_ONLINE_TAB_KEY;
  const activePermissions = isStoreOnlineTab ? [] : permissions.filter((permission) => permission.module === activeModule);
  const storeOnlineGroups = useMemo(
    () =>
      STORE_ONLINE_MODULES.map((module) => ({
        module,
        label: STORE_ONLINE_MODULE_LABELS[module],
        items: permissions.filter((permission) => permission.module === module),
      })).filter((group) => group.items.length > 0),
    [permissions],
  );
  const primaryRole = user?.roleAssignments[0]?.role.name ?? 'Sin rol';
  const assignedStore = user?.storeAssignments[0]?.store.name ?? 'Sin tienda asignada';
  const lastSession = user?.sessions?.[0]?.updatedAt ?? user?.sessions?.[0]?.createdAt;
  const userInitials = initials(user?.fullName || 'Usuario');
  const canEditUser = Boolean(currentAdmin?.permissions.includes('users.edit') || currentAdmin?.permissions.includes('users.manage'));
  const canManageUserPermissions = Boolean(currentAdmin?.permissions.includes('users.manage_permissions') || currentAdmin?.permissions.includes('users.manage'));

  return (
    <AdminRoutedShell title="Usuarios">
      <section className="customer-profile-page">
        <div className="customer-profile-page-header">
          <div>
            <a aria-label="Volver a usuarios" className="customer-back-button" href="/usuarios">
              <ArrowLeft size={22} />
            </a>
            <div>
              <h2>Perfil del usuario</h2>
              <p>Consulta la informacion del usuario y administra sus permisos por modulo.</p>
            </div>
          </div>

          {user ? (
            <div className="customer-profile-actions">
              {canEditUser ? <a className="admin-secondary" href={`/usuarios/${user.id}/editar`}>
                <Pencil size={16} />
                Editar usuario
              </a> : null}
              {canManageUserPermissions ? <button className="admin-primary" disabled={isSavingPermissions || isLoading} onClick={() => void savePermissions()} type="button">
                <Lock size={16} />
                {isSavingPermissions ? 'Guardando...' : 'Guardar permisos'}
              </button> : null}
            </div>
          ) : null}
        </div>

        {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}
        {isLoading ? <div className="form-success">Cargando usuario...</div> : null}

        {user ? (
          <>
            <section className="user-profile-info-card">
              <div className="user-profile-avatar-block">
                <div className="user-profile-avatar">{userInitials}</div>
                <span className="user-profile-soft-chip"><User size={14} /> Usuario interno</span>
              </div>

              <div className="user-profile-main-info">
                <h2>{user.fullName}</h2>
                <span className="user-profile-mail"><Mail size={17} /> {user.email}</span>
                <div className="user-profile-status-row">
                  <span>Estado</span>
                  <StatusChip status={user.status} />
                </div>
                <div className="user-profile-status-row">
                  <span>Cambio obligatorio de contrasena</span>
                  {user.mustChangePassword ? (
                    <span className="badge amber"><KeyRound size={14} /> Debe cambiar contrasena</span>
                  ) : (
                    <span className="badge green"><Check size={14} /> Contrasena actualizada</span>
                  )}
                </div>
              </div>

              <div className="user-profile-detail-grid">
                <InfoItem icon={ShieldCheck} label="Rol principal" value={primaryRole} chipTone="violet" />
                <InfoItem icon={Store} label="Tienda asignada" value={assignedStore} chipTone="blue" />
                <InfoItem icon={CalendarDays} label="Fecha de creacion" value={formatDate(user.createdAt)} />
                <InfoItem icon={Clock3} label="Ultimo acceso" value={formatDateTime(lastSession)} />
              </div>
            </section>

            <section className="user-profile-permissions-card">
              <div className="user-profile-permissions-head">
                <span><ShieldCheck size={22} /></span>
                <div>
                  <h2>Permisos por modulo</h2>
                  <p>Selecciona los accesos directos para este modulo.</p>
                </div>
              </div>

              <div className="user-profile-tabs" role="tablist" aria-label="Modulos de permisos">
                {modules.map(({ module, label, icon: Icon }) => (
                  <button
                    aria-selected={activeModule === module}
                    className={activeModule === module ? 'active' : undefined}
                    key={module}
                    onClick={() => setActiveModule(module)}
                    role="tab"
                    type="button"
                  >
                    <Icon width={17} height={17} />
                    {label}
                  </button>
                ))}
              </div>

              {isStoreOnlineTab ? (
                <div className="user-profile-permission-subgroups">
                  {storeOnlineGroups.map((group) => (
                    <div className="user-profile-permission-subgroup" key={group.module}>
                      <h3 className="user-profile-permission-subgroup-title">{group.label}</h3>
                      <div className="user-profile-permission-grid">
                        {group.items.map((permission) => (
                          <label className="user-profile-permission-option" key={permission.code}>
                            <input checked={selectedSet.has(permission.code)} onChange={() => togglePermission(permission.code)} type="checkbox" />
                            <span>
                              <strong>{permissionLabel(permission)}</strong>
                              <small>{permission.description ?? permission.code}</small>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                  {storeOnlineGroups.length === 0 ? <p className="user-profile-empty">No hay permisos configurados para Tienda Online.</p> : null}
                </div>
              ) : (
                <div className="user-profile-permission-grid">
                  {activePermissions.map((permission) => (
                    <label className="user-profile-permission-option" key={permission.code}>
                      <input checked={selectedSet.has(permission.code)} onChange={() => togglePermission(permission.code)} type="checkbox" />
                      <span>
                        <strong>{permissionLabel(permission)}</strong>
                        <small>{permission.description ?? permission.code}</small>
                      </span>
                    </label>
                  ))}
                  {activePermissions.length === 0 ? <p className="user-profile-empty">No hay permisos configurados para este modulo.</p> : null}
                </div>
              )}
            </section>
          </>
        ) : null}
      </section>
    </AdminRoutedShell>
  );
}

function InfoItem({ icon: Icon, label, value, chipTone }: { icon: IconType; label: string; value: string; chipTone?: 'blue' | 'violet' }) {
  return (
    <div className="user-profile-info-item">
      <Icon width={24} height={24} />
      <div>
        <span>{label}</span>
        {chipTone ? <strong className={`user-profile-chip ${chipTone}`}>{value}</strong> : <strong>{value}</strong>}
      </div>
    </div>
  );
}

function StatusChip({ status }: { status: AdminUserDetail['status'] }) {
  if (status === 'ACTIVE') return <span className="badge green">Activo</span>;
  if (status === 'BLOCKED') return <span className="badge amber">Bloqueado</span>;
  return <span className="badge red">Inactivo</span>;
}

function buildModules(permissions: PermissionRow[]) {
  const distinctModules = Array.from(new Set(permissions.map((permission) => permission.module)));
  const hasStoreOnlinePermissions = distinctModules.some((module) => STORE_ONLINE_MODULES.includes(module));
  const otherModules = distinctModules.filter((module) => !STORE_ONLINE_MODULES.includes(module));

  const entries = otherModules.map((module) => ({
    module,
    label: moduleLabel(module),
    icon: moduleMeta[module]?.icon ?? Settings,
  }));

  if (hasStoreOnlinePermissions) {
    entries.push({ module: STORE_ONLINE_TAB_KEY, label: 'Tienda Online', icon: ShoppingBag });
  }

  return entries.sort((left, right) => left.label.localeCompare(right.label, 'es'));
}

function moduleLabel(moduleName: string) {
  return moduleMeta[moduleName]?.label ?? moduleName;
}

function permissionLabel(permission: PermissionRow) {
  const labels: Record<string, string> = {
    'store_brands.read': 'Ver marcas',
    'store_brands.create': 'Crear marcas',
    'store_brands.edit': 'Editar marcas',
    'store_brands.status': 'Activar/Inactivar marcas',
    'store_products.read': 'Ver productos',
    'store_products.create': 'Crear productos',
    'store_products.edit': 'Editar productos',
    'store_products.status': 'Activar/Inactivar productos',
    'store_products.stock': 'Ajustar stock',
    'store_products.visibility': 'Controlar visibilidad',
    'store_products.images': 'Gestionar imagenes',
    'store_orders.read': 'Ver pedidos',
    'store_orders.review': 'Marcar en revision',
    'store_orders.confirm': 'Confirmar pedidos',
    'store_orders.reschedule': 'Reprogramar pedidos',
    'store_orders.cancel': 'Cancelar pedidos',
    'store_orders.payments': 'Gestionar pagos',
    'store_orders.visa_link': 'Registrar Visa Link',
    'store_delivery_schedule.read': 'Ver agenda de entregas',
    'store_delivery_schedule.program': 'Programar entregas',
    'store_delivery_schedule.reschedule': 'Reprogramar entregas',
    'store_delivery_schedule.assign': 'Asignar mensajero',
    'store_delivery_schedule.cancel': 'Cancelar programacion',
    'store_drivers.read': 'Ver mensajeros',
    'store_drivers.create': 'Crear mensajeros',
    'store_drivers.edit': 'Editar mensajeros',
    'store_drivers.status': 'Activar/Inactivar mensajeros',
    'store_drivers.access': 'Gestionar acceso de mensajero',
    'store_payment_settlements.read': 'Ver liquidaciones de cobros',
    'store_payment_settlements.create': 'Crear liquidaciones de cobros',
    'store_payment_settlements.annul': 'Anular liquidaciones de cobros',
    'store_payment_settlements.incidents': 'Gestionar incidencias de cobros',
    'store_payment_settlements.export': 'Exportar liquidaciones de cobros',
    'store_reports.read': 'Ver reportes de tienda online',
    'store_reports.export': 'Exportar reportes de tienda online',
    'store_reports.sales': 'Ver reporte de ventas y pedidos',
    'store_reports.payments': 'Ver reporte de pagos',
    'store_reports.settlements': 'Ver reporte de liquidaciones',
    'store_reports.deliveries': 'Ver reporte de entregas',
    'store_reports.products': 'Ver reporte de productos',
    'store_reports.customers': 'Ver reporte de clientes compradores',
  };

  return labels[permission.code] ?? permissionActionLabel(permission.action);
}

function permissionActionLabel(action: string) {
  const labels: Record<string, string> = {
    assign_roles: 'Asignar roles',
    assign_stores: 'Asignar tiendas',
    assign_users: 'Asignar usuarios',
    cancel: 'Cancelar',
    catalog_manage: 'Gestionar catalogo',
    confirm: 'Confirmar',
    create: 'Crear',
    edit: 'Editar',
    export: 'Exportar',
    images: 'Gestionar imagenes',
    manage_permissions: 'Gestionar permisos',
    mark_delivered: 'Marcar entregado',
    mark_ready: 'Marcar listo',
    payments: 'Gestionar pagos',
    program: 'Programar',
    read: 'Consultar',
    redeem_points: 'Canjear puntos',
    reject: 'Rechazar',
    reschedule: 'Reprogramar',
    review: 'Revisar',
    reverse: 'Reversar',
    status: 'Activar o inactivar',
    stock: 'Ajustar stock',
    view_all: 'Ver todos',
    view_profile: 'Ver perfil',
    visa_link: 'Registrar Visa Link',
    visibility: 'Controlar visibilidad',
  };

  return labels[action] ?? action;
}

function initials(value: string) {
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  return parts.map((part) => part[0]?.toUpperCase()).join('') || 'SA';
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  const today = new Date();
  const sameDay = today.toDateString() === date.toDateString();
  const time = new Intl.DateTimeFormat('es-GT', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);

  return sameDay ? `Hoy, ${time}` : `${formatDate(value)}, ${time}`;
}
