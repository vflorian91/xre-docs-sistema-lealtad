'use client';

import { ArrowLeft, Bell, CheckCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DriverShell } from '../components';
import {
  DriverNotification,
  formatDate,
  getDriverNotifications,
  markAllDriverNotificationsRead,
  markDriverNotificationRead,
} from '../lib/driverApi';

export default function NotificacionesPage() {
  const router = useRouter();
  const [items, setItems] = useState<DriverNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const result = await getDriverNotifications();
      setItems(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las notificaciones.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const unread = items.filter((n) => !n.isRead);
  const read = items.filter((n) => n.isRead);
  // Pendientes primero; si no hay pendientes, últimas leídas (3) + "ver más".
  const visibleRead = showAll ? read : read.slice(0, unread.length > 0 ? read.length : 3);
  const hasMore = !showAll && unread.length === 0 && read.length > 3;

  async function readOne(id: string) {
    setBusy(true);
    try { await markDriverNotificationRead(id); await load(); } finally { setBusy(false); }
  }

  async function readAll() {
    setBusy(true);
    try { await markAllDriverNotificationsRead(); await load(); } finally { setBusy(false); }
  }

  return (
    <DriverShell title="Notificaciones" hideHeader>
      <section className="dp-page">
        <header className="dp-header">
          <button aria-label="Volver" className="dp-back" onClick={() => router.push('/perfil')} type="button"><ArrowLeft size={20} /></button>
          <h1>Notificaciones</h1>
          {unread.length > 0 ? (
            <button className="nt-readall" disabled={busy} onClick={readAll} type="button"><CheckCheck size={16} /> Marcar todas</button>
          ) : null}
        </header>

        {error ? <div className="form-error">{error}</div> : null}
        {isLoading ? <section className="profile-card dp-loading">Cargando...</section> : null}

        {!isLoading && items.length === 0 ? (
          <section className="profile-card mv-empty">
            <span className="mv-empty-icon"><Bell size={32} /></span>
            <strong>Sin notificaciones</strong>
            <p>Cuando recibas avisos del equipo aparecerán aquí.</p>
          </section>
        ) : null}

        {unread.length > 0 ? (
          <>
            <p className="nt-section">Pendientes ({unread.length})</p>
            {unread.map((n) => <NotificationRow item={n} key={n.id} onRead={readOne} busy={busy} />)}
          </>
        ) : null}

        {visibleRead.length > 0 ? (
          <>
            <p className="nt-section">{unread.length > 0 ? 'Leídas' : 'Últimas leídas'}</p>
            {visibleRead.map((n) => <NotificationRow item={n} key={n.id} onRead={readOne} busy={busy} />)}
          </>
        ) : null}

        {hasMore ? (
          <button className="nt-more" onClick={() => setShowAll(true)} type="button">Ver historial completo ({read.length})</button>
        ) : null}
      </section>
    </DriverShell>
  );
}

function NotificationRow({ item, onRead, busy }: { item: DriverNotification; onRead: (id: string) => void; busy: boolean }) {
  return (
    <article className={`nt-card${item.isRead ? ' read' : ''}`}>
      <span className="nt-dot" aria-hidden="true" />
      <div className="nt-body">
        <div className="nt-top"><strong>{item.title}</strong><small>{formatDate(item.createdAt)}</small></div>
        <p>{item.body}</p>
        {!item.isRead ? (
          <button className="nt-read-one" disabled={busy} onClick={() => onRead(item.id)} type="button">Marcar como leída</button>
        ) : null}
      </div>
    </article>
  );
}
