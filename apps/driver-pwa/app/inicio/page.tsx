'use client';

import { AlertTriangle, Bell, CheckCircle2, Clock3, DollarSign, MapPin, Package, ShoppingBag, User, WalletCards } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { DriverShell, EmptyState, StatusBadge } from '../components';
import { DeliverySummary, driverApiRequest, formatMoney, getStoredDriverUser, statusLabel } from '../lib/driverApi';

type Dashboard = {
  cards: { today: number; pending: number; inRoute: number; delivered: number; failed: number };
  todayDeliveries: DeliverySummary[];
};

type DriverAlert = { text: string; href: string; tone: string; icon: LucideIcon };

export default function InicioPage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const user = getStoredDriverUser();

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    driverApiRequest<Dashboard>('/driver/dashboard')
      .then((result) => {
        if (isMounted) {
          setDashboard(result);
          setError('');
        }
      })
      .catch((err) => {
        if (isMounted) setError(err instanceof Error ? err.message : 'No se pudo cargar el inicio.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const deliveries = dashboard?.todayDeliveries ?? [];
  const activeDelivery = useMemo(() => deliveries.find((delivery) => delivery.deliveryStatus === 'EN_RUTA') ?? null, [deliveries]);
  const nextDeliveries = useMemo(
    () => deliveries.filter((delivery) => delivery.id !== activeDelivery?.id && !['ENTREGADA', 'NO_ENTREGADA', 'FALLIDA', 'CANCELADA'].includes(delivery.deliveryStatus)).slice(0, 3),
    [activeDelivery?.id, deliveries],
  );
  const alerts = buildAlerts(deliveries);

  return (
    <DriverShell title="Inicio">
      <section className="driver-home">
        <header className="driver-home-hero">
          <div>
            <h1>Hola, {firstName(user?.fullName) || 'motorista'}</h1>
            <p>Resumen de tu operacion de hoy</p>
            <span className={`driver-presence ${activeDelivery ? 'route' : 'available'}`}>
              <i />{activeDelivery ? 'En ruta' : 'Disponible'}
            </span>
          </div>
          <a className="driver-notification-button" href="/entregas" aria-label="Ver entregas">
            <Bell size={28} />
            {deliveries.length > 0 ? <i /> : null}
          </a>
        </header>

        {!user ? <div className="form-error">No hay una sesion valida de motorista. Inicia sesion nuevamente.</div> : null}
        {error ? <div className="form-error">{error}</div> : null}
        {isLoading ? <section className="driver-home-card driver-loading-card">Cargando operacion...</section> : <ActiveDeliveryCard delivery={activeDelivery} />}

        <section className="driver-home-metrics">
          <article>
            <span className="metric-icon blue"><ShoppingBag size={28} /></span>
            <div><span>Asignadas</span><strong>{dashboard?.cards.pending ?? 0}</strong></div>
          </article>
          <article>
            <span className="metric-icon green"><CheckCircle2 size={30} /></span>
            <div><span>Entregadas</span><strong>{dashboard?.cards.delivered ?? 0}</strong></div>
          </article>
        </section>

        <section className="driver-home-panel">
          <div className="driver-home-section-title">
            <h2>Proximas entregas</h2>
            <a href="/entregas">Ver todas las entregas</a>
          </div>
          {nextDeliveries.length ? (
            <div className="next-deliveries">
              {nextDeliveries.map((delivery) => (
                <article key={delivery.id}>
                  <span className="next-delivery-icon"><Package size={22} /></span>
                  <strong>{delivery.orderNumber}</strong>
                  <span>{delivery.customer.fullName}</span>
                  <small><MapPin size={16} />{summarizeAddress(delivery.deliveryAddress)}</small>
                  <StatusBadge status={delivery.deliveryStatus} />
                  <a href={`/entregas/${delivery.id}`}>Ver</a>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState text="No tienes entregas asignadas para hoy." />
          )}
        </section>

        <section className="driver-home-alerts">
          <h2>Alertas operativas</h2>
          {alerts.length ? (
            <div className="driver-alert-list">
              {alerts.map((alert) => {
                const Icon = alert.icon;
                return (
                  <a href={alert.href} key={alert.text}>
                    <span className={alert.tone}><Icon size={22} /></span>
                    <strong>{alert.text}</strong>
                    <b>›</b>
                  </a>
                );
              })}
            </div>
          ) : (
            <div className="driver-alert-empty">Todo en orden por ahora.</div>
          )}
        </section>
      </section>
    </DriverShell>
  );
}

function ActiveDeliveryCard({ delivery }: { delivery: DeliverySummary | null }) {
  if (!delivery) {
    return (
      <section className="driver-home-card empty-active-delivery">
        <div>
          <h2>No tienes entregas activas en este momento.</h2>
          <p>Revisa tus entregas asignadas para iniciar la siguiente operacion.</p>
        </div>
        <a className="primary-button" href="/entregas">Ver entregas asignadas</a>
      </section>
    );
  }

  const isCash = delivery.paymentMethodRequested === 'EFECTIVO_CONTRA_ENTREGA' || delivery.clientPaymentStatus === 'CONTRA_ENTREGA_PENDIENTE';

  return (
    <section className="driver-home-card active-delivery-card">
      <div className="active-delivery-map" aria-hidden="true">
        <span />
        <i />
      </div>
      <header>
        <span className="active-package-icon"><Package size={34} /></span>
        <div>
          <p>Pedido activo</p>
          <h2>{delivery.orderNumber}</h2>
        </div>
        <StatusBadge status={delivery.deliveryStatus} />
      </header>
      <div className="active-delivery-details">
        <p><User size={19} />{delivery.customer.fullName}</p>
        <p><MapPin size={19} />{summarizeAddress(delivery.deliveryAddress)}</p>
        <p><DollarSign size={19} />{paymentMethodLabel(delivery.paymentMethodRequested, delivery.clientPaymentStatus)}</p>
        <p><WalletCards size={19} />Total: <strong>{formatMoney(delivery.totalAmount)}</strong></p>
        {delivery.deliveryTimeRange ? <p className="estimate"><Clock3 size={19} />Horario: <strong>{delivery.deliveryTimeRange}</strong></p> : null}
      </div>
      <div className="active-delivery-actions">
        <a className="primary-button" href={`/entregas/${delivery.id}`}>Llegue al destino</a>
        {delivery.deliveryStatus === 'EN_RUTA' ? <a className="secondary-button" href={`/entregas/${delivery.id}`}>Reportar incidencia</a> : null}
        {isCash ? <span className="cash-chip">Contra entrega</span> : null}
      </div>
    </section>
  );
}

function buildAlerts(deliveries: DeliverySummary[]) {
  const cashPending = deliveries.filter((delivery) => delivery.paymentMethodRequested === 'EFECTIVO_CONTRA_ENTREGA' && delivery.deliveryStatus !== 'ENTREGADA').length;
  const incidents = deliveries.filter((delivery) => ['FALLIDA', 'NO_ENTREGADA'].includes(delivery.deliveryStatus)).length;
  const incompleteAddress = deliveries.filter((delivery) => !delivery.deliveryAddress || delivery.deliveryAddress.trim().length < 8).length;

  return [
    cashPending > 0 ? { text: `${cashPending} pedido${cashPending === 1 ? '' : 's'} contra entrega pendiente${cashPending === 1 ? '' : 's'} de liquidar`, href: '/entregas', tone: 'amber', icon: AlertTriangle } : null,
    incidents > 0 ? { text: `${incidents} incidencia${incidents === 1 ? '' : 's'} pendiente${incidents === 1 ? '' : 's'} de revision`, href: '/entregas', tone: 'red', icon: AlertTriangle } : null,
    incompleteAddress > 0 ? { text: `${incompleteAddress} pedido${incompleteAddress === 1 ? '' : 's'} con direccion incompleta`, href: '/entregas', tone: 'amber', icon: MapPin } : null,
  ].filter((alert): alert is DriverAlert => Boolean(alert));
}

function firstName(value?: string | null) {
  return value?.trim().split(/\s+/)[0] ?? '';
}

function summarizeAddress(value?: string | null) {
  if (!value) return 'Direccion pendiente';
  const [first, second] = value.split(',').map((part) => part.trim()).filter(Boolean);
  return second ? `${first}, ${second}` : first;
}

function paymentMethodLabel(method: string, paymentStatus: string) {
  if (method === 'EFECTIVO_CONTRA_ENTREGA' || paymentStatus === 'CONTRA_ENTREGA_PENDIENTE') return 'Contra entrega';
  const labels: Record<string, string> = {
    VISA_LINK_MANUAL: 'Visa Link',
    TRANSFERENCIA_BANCARIA: 'Transferencia',
    DEPOSITO_BANCARIO: 'Deposito',
  };
  return labels[method] ?? statusLabel(method);
}
