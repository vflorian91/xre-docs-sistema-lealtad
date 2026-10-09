'use client';

import { useEffect, useState } from 'react';
import { DriverShell, EmptyState } from '../components';
import { DeliverySummary, driverApiRequest } from '../lib/driverApi';
import DeliveryCard from '../shared/DeliveryCard';

export default function HistorialPage() {
  const [deliveries, setDeliveries] = useState<DeliverySummary[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    driverApiRequest<DeliverySummary[]>('/driver/history')
      .then(setDeliveries)
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo cargar el historial.'));
  }, []);

  return (
    <DriverShell title="Historial">
      {error ? <div className="form-error">{error}</div> : null}
      <section className="delivery-list">
        {deliveries.map((delivery) => <DeliveryCard delivery={delivery} key={delivery.id} />)}
        {deliveries.length === 0 ? <EmptyState text="Todavia no tienes historial de entregas." /> : null}
      </section>
    </DriverShell>
  );
}
