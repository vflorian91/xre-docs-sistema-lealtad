'use client';

import { Bell, Plus, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import AdminRoutedShell from '../AdminRoutedShell';
import { adminApiRequest, getErrorText } from '../lib/adminApi';
import { formatDate, formatNumber } from '../lib/format';

export type NotificationAudience = 'GLOBAL_CUSTOMERS' | 'GLOBAL_INTERNAL' | 'CUSTOMER' | 'CUSTOMER_SEGMENT' | 'INTERNAL_USER' | 'ROLE';
export type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'PROMOTION' | 'SYSTEM';
export type CustomerSegmentStatus = '' | 'ACTIVE' | 'INACTIVE';
export type CustomerSegmentLevel = '' | 'Oro' | 'Plata' | 'Bronce' | 'Básico';

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  audience: NotificationAudience;
  isActive: boolean;
  startsAt: string;
  expiresAt?: string | null;
  createdAt: string;
  metadata?: {
    source?: 'SYSTEM' | 'MANUAL';
    recipientCount?: number;
    segment?: {
      status?: CustomerSegmentStatus | null;
      level?: CustomerSegmentLevel | null;
    };
  } | null;
  customer?: { id: string; code: string; fullName: string } | null;
  internalUser?: { id: string; fullName: string; email: string } | null;
  role?: { id: string; name: string } | null;
  createdByInternalUser?: { id: string; fullName: string; email: string } | null;
};

type PaginatedNotifications = {
  data: NotificationRow[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

const pageSize = 10;

export default function NotificacionesPage() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: pageSize, total: 0, totalPages: 1 });
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const queryString = useMemo(() => {
    return new URLSearchParams({ page: String(currentPage), limit: String(pageSize) }).toString();
  }, [currentPage]);

  useEffect(() => {
    void loadNotifications();
  }, [queryString]);

  async function loadNotifications() {
    setIsLoading(true);
    setMessage(null);

    try {
      const result = await adminApiRequest<PaginatedNotifications>(`/notifications?${queryString}`);
      setNotifications(result.data);
      setMeta(result.meta);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudieron cargar las notificaciones.') });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AdminRoutedShell title="Notificaciones">
      {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}

      <section className="customer-dashboard-toolbar">
        <div>
          <h2>Registro de notificaciones</h2>
          <p>Historial de notificaciones enviadas por el sistema y por administradores.</p>
        </div>
        <div className="toolbar-actions">
          <button className="admin-secondary" disabled={isLoading} onClick={() => void loadNotifications()} type="button">
            <RefreshCw size={16} />
            Actualizar
          </button>
          <Link className="admin-primary" href="/notificaciones/nueva">
            <Plus size={16} />
            Crear nueva
          </Link>
        </div>
      </section>

      <article className="customer-table-panel notifications-table-panel">
        <div className="panel-header customer-table-header">
          <div>
            <h2><Bell size={19} /> Tabla de notificaciones enviadas</h2>
            <p className="muted-copy">Los registros son solo de consulta; no se editan ni se envian de nuevo.</p>
          </div>
          <span className="count-pill">{formatNumber(meta.total)}</span>
        </div>
        <table className="customer-records-table notifications-records-table">
          <thead>
            <tr>
              <th>Mensaje</th>
              <th>Destino</th>
              <th>Tipo</th>
              <th>Origen</th>
              <th>Vigencia</th>
              <th>Enviada</th>
            </tr>
          </thead>
          <tbody>
            {notifications.length ? notifications.map((notification) => (
              <tr key={notification.id}>
                <td>
                  <strong>{notification.title}</strong>
                  <p className="table-subtitle">{notification.body}</p>
                </td>
                <td>{notificationAudienceLabel(notification)}</td>
                <td><span className={notificationTypeClass(notification.type)}>{notificationTypeLabel(notification.type)}</span></td>
                <td>{notification.metadata?.source === 'SYSTEM' ? 'Sistema' : 'Manual'}</td>
                <td>
                  {formatDate(notification.startsAt)}
                  <p className="table-subtitle">{notification.expiresAt ? `vence ${formatDate(notification.expiresAt)}` : 'sin vencimiento'}</p>
                </td>
                <td>{formatDate(notification.createdAt)}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6}>{isLoading ? 'Cargando notificaciones...' : 'Aun no hay notificaciones enviadas.'}</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="customer-table-footer">
          <span>Mostrando página {formatNumber(meta.page)} de {formatNumber(meta.totalPages)} · {formatNumber(meta.total)} notificaciones</span>
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

function pageWindow(page: number, totalPages: number) {
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

function notificationAudienceLabel(notification: NotificationRow) {
  if (notification.audience === 'GLOBAL_CUSTOMERS') return 'Todos los clientes';
  if (notification.audience === 'GLOBAL_INTERNAL') return 'Usuarios internos';
  if (notification.audience === 'CUSTOMER_SEGMENT') return customerSegmentLabel(notification);
  if (notification.audience === 'CUSTOMER') return notification.customer ? `${notification.customer.fullName} - ${notification.customer.code}` : 'Cliente';
  if (notification.audience === 'INTERNAL_USER') return notification.internalUser ? `${notification.internalUser.fullName} - ${notification.internalUser.email}` : 'Usuario interno';
  if (notification.audience === 'ROLE') return notification.role ? `Rol ${notification.role.name}` : 'Rol';
  return notification.audience;
}

function customerSegmentLabel(notification: NotificationRow) {
  const segment = notification.metadata?.segment;
  const parts = [
    segment?.status ? statusLabel(segment.status) : null,
    segment?.level ? `Nivel ${segment.level}` : null,
  ].filter(Boolean);
  const base = parts.length ? parts.join(' · ') : 'Segmento de clientes';
  const count = notification.metadata?.recipientCount;
  return typeof count === 'number' ? `${base} (${formatNumber(count)})` : base;
}

function statusLabel(status: CustomerSegmentStatus) {
  if (status === 'ACTIVE') return 'Activos';
  if (status === 'INACTIVE') return 'Inactivos';
  return null;
}

function notificationTypeLabel(type: NotificationType) {
  const labels: Record<NotificationType, string> = {
    INFO: 'Info',
    SUCCESS: 'Exito',
    WARNING: 'Alerta',
    PROMOTION: 'Promo',
    SYSTEM: 'Sistema',
  };

  return labels[type];
}

function notificationTypeClass(type: NotificationType) {
  if (type === 'SUCCESS') return 'badge green';
  if (type === 'WARNING') return 'badge amber';
  if (type === 'PROMOTION') return 'badge violet';
  if (type === 'SYSTEM') return 'badge blue';
  return 'badge blue';
}
