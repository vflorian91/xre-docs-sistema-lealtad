'use client';

import { ArrowLeft, Bell, CheckCheck, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AdminRoutedShell from '../../AdminRoutedShell';
import { adminApiRequest, getErrorText } from '../../lib/adminApi';
import { formatDate, formatTime } from '../../lib/format';
import { resolveNotificationTarget } from '../../lib/notificationLinks';

type InboxNotification = {
  id: string;
  title: string;
  body: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'PROMOTION' | 'SYSTEM';
  isRead: boolean;
  createdAt: string;
  metadata?: { redemptionRequestId?: string; bannerId?: string; productId?: string } | null;
};

export default function NotificacionesRecibidasPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<InboxNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    void loadNotifications();
  }, []);

  async function loadNotifications() {
    setIsLoading(true);
    setMessage(null);
    try {
      const result = await adminApiRequest<InboxNotification[]>('/notifications/internal');
      setNotifications(result);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudieron cargar las notificaciones.') });
    } finally {
      setIsLoading(false);
    }
  }

  async function openNotification(notification: InboxNotification) {
    if (!notification.isRead) {
      try {
        await adminApiRequest(`/notifications/${notification.id}/internal/read`, { method: 'POST' });
        setNotifications((prev) => prev.map((item) => (item.id === notification.id ? { ...item, isRead: true } : item)));
      } catch {
        // Si falla marcar como leida, igual navegamos al detalle si existe.
      }
    }
    const target = resolveNotificationTarget(notification.metadata);
    if (target) router.push(target);
  }

  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  return (
    <AdminRoutedShell title="Notificaciones">
      <div className="brand-form-page">
        <header className="brand-form-heading">
          <div>
            <h1>Notificaciones recibidas</h1>
            <p>Avisos del sistema sobre solicitudes de canje, banners y otras novedades que te corresponden.</p>
          </div>
          <Link className="brand-back-button" href="/notificaciones"><ArrowLeft size={17} />Ir a notificaciones enviadas</Link>
        </header>

        {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}

        <article className="customer-table-panel notifications-table-panel">
          <div className="panel-header customer-table-header">
            <div>
              <h2><Bell size={19} /> Mis notificaciones</h2>
              <p className="muted-copy">{unreadCount > 0 ? `${unreadCount} sin leer` : 'No tienes notificaciones pendientes.'}</p>
            </div>
            <button className="admin-secondary" disabled={isLoading} onClick={() => void loadNotifications()} type="button">
              <RefreshCw size={16} />
              Actualizar
            </button>
          </div>

          {isLoading ? (
            <p className="notification-menu-empty">Cargando notificaciones...</p>
          ) : notifications.length === 0 ? (
            <p className="notification-menu-empty">Aun no tienes notificaciones.</p>
          ) : (
            <ul className="received-notifications-list">
              {notifications.map((notification) => {
                const hasTarget = Boolean(resolveNotificationTarget(notification.metadata));
                return (
                  <li key={notification.id}>
                    <button
                      className={notification.isRead ? 'read' : 'unread'}
                      onClick={() => void openNotification(notification)}
                      type="button"
                    >
                      <span className="received-notification-status">
                        {notification.isRead ? <CheckCheck size={16} /> : <Bell size={16} />}
                      </span>
                      <span className="received-notification-body">
                        <strong>{notification.title}</strong>
                        <small>{notification.body}</small>
                        <small className="received-notification-date">{formatDate(notification.createdAt)} · {formatTime(notification.createdAt)}</small>
                      </span>
                      {hasTarget ? <span className="received-notification-cta">Ver detalle</span> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </article>
      </div>
    </AdminRoutedShell>
  );
}
