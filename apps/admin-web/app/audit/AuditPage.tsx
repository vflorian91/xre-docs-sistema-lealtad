'use client';

import { Activity, Filter, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import AdminRoutedShell from '../AdminRoutedShell';
import { adminApiRequest, getErrorText } from '../lib/adminApi';
import { formatDate, formatNumber, formatTime } from '../lib/format';

type AuditActorType = 'INTERNAL_USER' | 'CUSTOMER';

type AuditLogRow = {
  id: string;
  actorType: AuditActorType | 'SYSTEM';
  actor: {
    id: string | null;
    label: string;
    secondary: string;
  };
  action: string;
  module: string;
  entityType?: string | null;
  entityId?: string | null;
  storeId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: unknown;
  createdAt: string;
};

type AuditData = {
  total: number;
  limit: number;
  page: number;
  totalPages: number;
  modules: Array<{ module: string; count: number }>;
  actions: Array<{ action: string; count: number }>;
  logs: AuditLogRow[];
};

type AuditFilters = {
  actorType: AuditActorType;
  customerName: string;
  module: string;
  dateFrom: string;
  dateTo: string;
};

const pageSize = 12;

const moduleOptionsByActor: Record<AuditActorType, string[]> = {
  INTERNAL_USER: [
    'auth',
    'users',
    'roles',
    'customers',
    'stores',
    'purchases',
    'points',
    'promotional_balance',
    'redeemable_products',
    'redemption_requests',
    'catalogs',
    'marketing',
    'notifications',
    'settings',
    'media',
  ],
  CUSTOMER: [
    'auth',
    'customers',
    'purchases',
    'points',
    'promotional_balance',
    'redeemable_products',
    'redemption_requests',
    'notifications',
    'media',
  ],
};

function defaultFilters(): AuditFilters {
  const dateTo = new Date();
  const dateFrom = new Date();
  dateFrom.setDate(dateTo.getDate() - 30);

  return {
    actorType: 'INTERNAL_USER',
    customerName: '',
    module: '',
    dateFrom: toDateInputValue(dateFrom),
    dateTo: toDateInputValue(dateTo),
  };
}

export default function AuditPage() {
  const [auditData, setAuditData] = useState<AuditData | null>(null);
  const [filters, setFilters] = useState<AuditFilters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<AuditFilters>(defaultFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const moduleOptions = useMemo(() => moduleOptionsByActor[filters.actorType], [filters.actorType]);

  useEffect(() => {
    void loadAudit(appliedFilters, currentPage);
  }, [appliedFilters, currentPage]);

  async function loadAudit(nextFilters: AuditFilters, page: number) {
    setIsLoading(true);
    setMessage(null);

    const query = new URLSearchParams({
      limit: String(pageSize),
      page: String(page),
      actorType: nextFilters.actorType,
    });

    if (nextFilters.module) query.set('module', nextFilters.module);
    if (nextFilters.actorType === 'CUSTOMER' && nextFilters.customerName.trim()) {
      query.set('customerName', nextFilters.customerName.trim());
    }
    if (nextFilters.dateFrom) query.set('dateFrom', nextFilters.dateFrom);
    if (nextFilters.dateTo) query.set('dateTo', nextFilters.dateTo);

    try {
      const result = await adminApiRequest<AuditData>(`/audit?${query.toString()}`);
      setAuditData(result);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo cargar la auditoria.') });
    } finally {
      setIsLoading(false);
    }
  }

  function applyFilters() {
    setCurrentPage(1);
    setAppliedFilters(filters);
  }

  function refreshCurrentSearch() {
    void loadAudit(appliedFilters, currentPage);
  }

  function updateActorType(actorType: AuditActorType) {
    setFilters((current) => ({
      ...current,
      actorType,
      customerName: '',
      module: '',
    }));
  }

  const logs = auditData?.logs ?? [];
  const meta = { page: auditData?.page ?? 1, totalPages: auditData?.totalPages ?? 1, total: auditData?.total ?? 0 };

  return (
    <AdminRoutedShell title="Auditoria">
      {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}

      <section className="customer-dashboard-toolbar">
        <div>
          <h2>Auditoria</h2>
          <p>Consulta acciones por tipo de usuario, modulo y rango de fechas.</p>
        </div>
        <button className="admin-secondary" disabled={isLoading} onClick={refreshCurrentSearch} type="button">
          <RefreshCw size={16} />
          Actualizar
        </button>
      </section>

      <article className="audit-filter-panel">
        <div className="audit-controls">
          <label>
            Tipo de usuario
            <select value={filters.actorType} onChange={(event) => updateActorType(event.target.value as AuditActorType)}>
              <option value="INTERNAL_USER">Usuario</option>
              <option value="CUSTOMER">Cliente</option>
            </select>
          </label>
          <label>
            Modulo
            <select value={filters.module} onChange={(event) => setFilters({ ...filters, module: event.target.value })}>
              <option value="">Todos los modulos</option>
              {moduleOptions.map((module) => (
                <option value={module} key={module}>{moduleLabel(module)}</option>
              ))}
            </select>
          </label>
          {filters.actorType === 'CUSTOMER' ? (
            <label>
              Nombre del cliente
              <input
                type="search"
                value={filters.customerName}
                onChange={(event) => setFilters({ ...filters, customerName: event.target.value })}
                placeholder="Buscar por nombre"
              />
            </label>
          ) : null}
          <label>
            Desde
            <input type="date" value={filters.dateFrom} onChange={(event) => setFilters({ ...filters, dateFrom: event.target.value })} />
          </label>
          <label>
            Hasta
            <input type="date" value={filters.dateTo} onChange={(event) => setFilters({ ...filters, dateTo: event.target.value })} />
          </label>
          <button className="admin-primary" disabled={isLoading} onClick={applyFilters} type="button">
            <Filter size={16} />
            Buscar
          </button>
        </div>
      </article>

      <article className="customer-table-panel audit-table-panel">
        <div className="panel-header customer-table-header">
          <div>
            <h2><Activity size={19} /> Acciones registradas</h2>
            <p className="muted-copy">
              Pagina {formatNumber(meta.page)} de {formatNumber(meta.totalPages)} · {formatNumber(meta.total)} eventos encontrados
            </p>
          </div>
          <span className="count-pill">{formatNumber(logs.length)}</span>
        </div>

        <table className="customer-records-table audit-records-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Usuario o cliente</th>
              <th>Modulo</th>
              <th>Accion</th>
              <th>Entidad</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.length ? (
              logs.map((log) => (
                <tr key={log.id}>
                  <td>
                    <strong>{formatDate(log.createdAt)}</strong>
                    <span>{formatTime(log.createdAt)}</span>
                  </td>
                  <td>
                    <div className="table-main-cell">
                      <strong>{log.actor.label}</strong>
                      <span>{actorTypeLabel(log.actorType)}{log.actor.secondary ? ` · ${log.actor.secondary}` : ''}</span>
                    </div>
                  </td>
                  <td>{moduleLabel(log.module)}</td>
                  <td>{actionLabel(log.action)}</td>
                  <td>
                    <div className="table-main-cell">
                      <strong>{log.entityType ?? 'Sin entidad'}</strong>
                      <span>{log.entityId ?? '-'}</span>
                    </div>
                  </td>
                  <td>{log.ipAddress ?? '-'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6}>{isLoading ? 'Cargando auditoria...' : 'No hay acciones registradas con estos filtros.'}</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="customer-table-footer">
          <span>Mostrando pagina {formatNumber(meta.page)} de {formatNumber(meta.totalPages)} · {formatNumber(meta.total)} eventos</span>
          <div className="customer-pagination">
            <button disabled={meta.page === 1 || isLoading} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} type="button">‹</button>
            {pageWindow(meta.page, meta.totalPages).map((p) => (
              <button className={p === meta.page ? 'active' : ''} key={p} onClick={() => setCurrentPage(p)} type="button">{p}</button>
            ))}
            <button disabled={meta.page === meta.totalPages || isLoading} onClick={() => setCurrentPage((p) => Math.min(meta.totalPages, p + 1))} type="button">›</button>
          </div>
        </div>
      </article>
    </AdminRoutedShell>
  );
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function pageWindow(page: number, totalPages: number) {
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

function moduleLabel(module: string) {
  const labels: Record<string, string> = {
    auth: 'Autenticacion',
    settings: 'Parametros',
    users: 'Usuarios',
    roles: 'Roles',
    stores: 'Tiendas',
    customers: 'Clientes',
    purchases: 'Compras',
    points: 'Puntos',
    promotional_balance: 'Saldo promocional',
    catalogs: 'Catalogos',
    redeemable_products: 'Premios',
    redemption_requests: 'Canjes',
    marketing: 'Marketing',
    notifications: 'Notificaciones',
    media: 'Archivos',
    reports: 'Reportes',
    audit: 'Auditoria',
    expirations: 'Vencimientos',
  };

  return labels[module] ?? module;
}

function actionLabel(action: string) {
  const labels: Record<string, string> = {
    'auth.login_success': 'Inicio de sesion',
    'auth.login_failed': 'Intento fallido',
    'auth.logout': 'Cierre de sesion',
    'auth.refresh': 'Renovacion de sesion',
    'auth.internal.login_success': 'Inicio de sesion',
    'auth.internal.login_failed': 'Intento fallido',
    'auth.internal.logout': 'Cierre de sesion',
    'auth.internal.refresh': 'Renovacion de sesion',
    'auth.internal.password_change': 'Contrasena actualizada',
    'auth.customer_login_success': 'Inicio de sesion',
    'auth.customer_login_failed': 'Intento fallido',
    'auth.customer_logout': 'Cierre de sesion',
    'auth.customer.login_success': 'Inicio de sesion',
    'auth.customer.login_failed': 'Intento fallido',
    'auth.customer.logout': 'Cierre de sesion',
    'internal_users.create': 'Usuario creado',
    'internal_users.update': 'Usuario actualizado',
    'stores.create': 'Tienda creada',
    'stores.update': 'Tienda actualizada',
    'stores.assign_user': 'Usuario asignado',
    'stores.active_set': 'Tienda activa cambiada',
    'stores.set_active': 'Tienda activa cambiada',
    'customers.create': 'Cliente creado',
    'customers.update': 'Cliente actualizado',
    'purchases.preview': 'Previsualizacion de compra',
    'purchases.create': 'Compra registrada',
    'purchases.reverse': 'Compra reversada',
    'purchases.duplicate_invoice_blocked': 'Factura duplicada bloqueada',
    'promotional_balance.credit': 'Saldo acreditado',
    'promotional_balance.convert_points': 'Puntos convertidos a saldo',
    'promotional_balance.use': 'Saldo usado en tienda',
    'settings.update': 'Parametro actualizado',
    'points.rules.create': 'Regla de puntos creada',
    'points.rules.activate': 'Regla de puntos activada',
    'points.promotions.create': 'Promocion creada',
    'points.promotions.activate': 'Promocion activada',
    'points.adjustment.create': 'Ajuste de puntos creado',
    'points.adjustments.create': 'Ajuste de puntos creado',
    'catalogs.create': 'Catalogo creado',
    'catalogs.update': 'Catalogo actualizado',
    'catalogs.items.create': 'Valor creado',
    'catalogs.items.update': 'Valor actualizado',
    'rewards.create': 'Premio creado',
    'rewards.update': 'Premio actualizado',
    'marketing_banners.create': 'Banner creado',
    'marketing_banners.update': 'Banner actualizado',
    'notifications.create': 'Notificacion enviada',
    'notifications.update': 'Notificacion actualizada',
    'redemptions.request': 'Canje solicitado',
    'redemptions.validate': 'Canje validado',
    'redemptions.customer_cancel': 'Canje cancelado por cliente',
    'redemptions.cancel': 'Canje cancelado',
    'redemptions.expire': 'Canje vencido',
    'media.upload': 'Archivo subido',
    'media.reward_image_attached': 'Imagen de premio asociada',
    'media.customer_profile_photo_upload': 'Foto de cliente subida',
    'media.customer_profile_photo_upload_admin': 'Foto de cliente subida',
    'media.internal_profile_photo_upload': 'Foto de perfil subida',
    'seed.super_admin_upserted': 'Seed Super Admin',
    'roles.create': 'Rol creado',
    'roles.update': 'Rol actualizado',
  };

  return labels[action] ?? action;
}

function actorTypeLabel(actorType: string) {
  const labels: Record<string, string> = {
    INTERNAL_USER: 'Usuario',
    CUSTOMER: 'Cliente',
    SYSTEM: 'Sistema',
  };

  return labels[actorType] ?? actorType;
}
