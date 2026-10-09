'use client';

import { CalendarDays, ChevronRight, Clock3, MapPin, Package, Phone, Wallet } from 'lucide-react';
import { StatusBadge } from '../components';
import { DeliverySummary, formatDate, formatMoney } from '../lib/driverApi';

export default function DeliveryCard({ delivery }: { delivery: DeliverySummary }) {
  const isCash = delivery.paymentMethodRequested === 'EFECTIVO_CONTRA_ENTREGA' || delivery.clientPaymentStatus === 'CONTRA_ENTREGA_PENDIENTE';
  return (
    <article className="delivery-card">
      <header>
        <div>
          <h3>{delivery.orderNumber}</h3>
          <p>{delivery.customer.fullName}</p>
        </div>
        <StatusBadge status={delivery.deliveryStatus} />
      </header>
      <div className="delivery-card-contact">
        <span><Phone size={18} />{delivery.customer.phone}</span>
        <span><MapPin size={18} />{delivery.deliveryAddress}</span>
      </div>
      <div className="delivery-meta">
        {delivery.itemsTotal != null ? (
          <span className="delivery-pill pickup"><Package size={15} /> {delivery.itemsPicked ?? 0}/{delivery.itemsTotal} recolectados</span>
        ) : null}
        {isCash ? <span className="delivery-pill cash"><Wallet size={15} /> Contra entrega</span> : null}
      </div>
      <div className="delivery-card-divider" />
      <div className="delivery-card-facts">
        <span><CalendarDays size={20} /><b>Fecha</b><strong>{formatDate(delivery.confirmedDeliveryDate)}</strong></span>
        <span><Clock3 size={20} /><b>Horario</b><strong>{delivery.deliveryTimeRange ?? '-'}</strong></span>
        <span><Wallet size={20} /><b>Total</b><strong>{formatMoney(delivery.totalAmount)}</strong></span>
      </div>
      <a className="delivery-summary-link" href={`/entregas/${delivery.id}`}>Ver resumen <ChevronRight size={22} /></a>
    </article>
  );
}
