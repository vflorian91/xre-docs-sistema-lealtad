'use client';

import { useEffect, useMemo, useState } from 'react';
import { DriverShell, EmptyState } from '../components';
import { DeliverySummary, PickupStop, driverApiRequest, getPickupStops } from '../lib/driverApi';
import DeliveryCard from '../shared/DeliveryCard';

export default function EntregasPage() {
  const [deliveries, setDeliveries] = useState<DeliverySummary[]>([]);
  const [pickupStops, setPickupStops] = useState<PickupStop[]>([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    return params.toString();
  }, [status]);

  useEffect(() => {
    driverApiRequest<DeliverySummary[]>(`/driver/deliveries${query ? `?${query}` : ''}`)
      .then(setDeliveries)
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudieron cargar las entregas.'));
  }, [query]);

  useEffect(() => {
    getPickupStops().then(setPickupStops).catch(() => setPickupStops([]));
  }, []);

  const pickupOrderCount = pickupStops.reduce((sum, stop) => sum + stop.orderCount, 0);
  const pickupProductCount = pickupStops.reduce((sum, stop) => sum + stop.productCount, 0);

  return (
    <DriverShell title="Mis entregas">
      {error ? <div className="form-error">{error}</div> : null}
      {pickupStops.length > 0 ? (
        <a className="pickup-stops-link" href="/entregas/recoleccion">
          <span><strong>{pickupStops.length}</strong> tienda{pickupStops.length === 1 ? '' : 's'} por visitar</span>
          <small>{pickupOrderCount} pedido{pickupOrderCount === 1 ? '' : 's'} · {pickupProductCount} producto{pickupProductCount === 1 ? '' : 's'} pendientes</small>
        </a>
      ) : null}
      <section className="delivery-filter-bar">
        <select aria-label="Estado" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Todos</option>
          <option value="ASIGNADA">Asignadas</option>
          <option value="EN_RECOLECCION">En recolección</option>
          <option value="RECOLECCION_COMPLETA">Recolección completa</option>
          <option value="EN_RUTA">En ruta</option>
        </select>
      </section>
      <section className="delivery-list">
        {deliveries.map((delivery) => <DeliveryCard delivery={delivery} key={delivery.id} />)}
        {deliveries.length === 0 ? <EmptyState text="No tienes pedidos asignados pendientes de finalizar." /> : null}
      </section>
    </DriverShell>
  );
}
