'use client';

import { ArrowLeft, ChevronRight, MapPin, PackageCheck, Store, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DriverShell, EmptyState } from '../../components';
import { PickupStop, getPickupStops } from '../../lib/driverApi';

export default function RecoleccionPage() {
  const [stops, setStops] = useState<PickupStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    getPickupStops()
      .then((data) => {
        setStops(data);
        setError('');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudieron cargar las recolecciones.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DriverShell title="Recolección" hideHeader>
      <header className="dd-header">
        <a aria-label="Volver" className="dd-icon-btn" href="/entregas"><ArrowLeft size={20} /></a>
        <h1>Recolección por tienda</h1>
        <span className="dd-icon-btn disabled"><Store size={19} /></span>
      </header>

      {error ? <div className="form-error">{error}</div> : null}
      {loading ? <section className="profile-card profile-loading">Cargando recolecciones...</section> : null}

      {!loading && !error ? (
        <section className="pickup-stop-list">
          {stops.map((stop) => <PickupStopCard key={stop.store.id} stop={stop} />)}
          {stops.length === 0 ? <EmptyState text="No tienes productos pendientes de recoger en tiendas." /> : null}
        </section>
      ) : null}
    </DriverShell>
  );
}

function PickupStopCard({ stop }: { stop: PickupStop }) {
  return (
    <article className="pickup-stop-card">
      <header>
        <span className="pickup-stop-icon"><Store size={24} /></span>
        <div>
          <h2>{stop.store.name}</h2>
          <p><MapPin size={15} />{stop.store.address || 'Dirección de tienda pendiente'}</p>
        </div>
      </header>

      <div className="pickup-stop-metrics">
        <span><strong>{stop.orderCount}</strong> pedido{stop.orderCount === 1 ? '' : 's'}</span>
        <span><strong>{stop.productCount}</strong> producto{stop.productCount === 1 ? '' : 's'}</span>
      </div>

      <div className="pickup-stop-orders">
        {stop.orders.map((order) => (
          <a className="pickup-stop-order" href={`/entregas/${order.id}`} key={order.id}>
            <div>
              <strong>{order.orderNumber}</strong>
              <span><User size={14} />{order.customer.fullName}</span>
              <small>{order.pendingItems.map((item) => `${item.quantity}x ${item.productName}`).join(' · ')}</small>
            </div>
            <span className="pickup-stop-count"><PackageCheck size={15} />{order.pendingItems.length}</span>
            <ChevronRight size={19} />
          </a>
        ))}
      </div>
    </article>
  );
}
