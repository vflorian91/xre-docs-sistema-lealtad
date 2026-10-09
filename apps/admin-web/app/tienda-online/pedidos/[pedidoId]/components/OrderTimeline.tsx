import { formatDate, formatTime } from '../../../../lib/format';
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '../../components/OrderStatusBadges';

type TimelineEvent = {
  statusType: string;
  newStatus: string;
  comment?: string | null;
  createdByName?: string | null;
  createdAt: string;
};

function labelForStatus(statusType: string, status: string) {
  if (statusType === 'PAYMENT_STATUS') return PAYMENT_STATUS_LABELS[status] ?? status;
  return ORDER_STATUS_LABELS[status] ?? status;
}

export default function OrderTimeline({ events }: { events: TimelineEvent[] }) {
  return (
    <section className="order-detail-card full-width">
      <h3>Timeline del pedido</h3>
      <div className="order-timeline">
        {events.map((event, index) => (
          <div className="order-timeline-item" key={index}>
            <strong>{labelForStatus(event.statusType, event.newStatus)}</strong>
            {event.comment ? <small>{event.comment}</small> : null}
            <small>{event.createdByName ?? 'Sistema'} - {formatDate(event.createdAt)} {formatTime(event.createdAt)}</small>
          </div>
        ))}
        {events.length === 0 ? <p className="muted-copy">Sin eventos registrados todavia.</p> : null}
      </div>
    </section>
  );
}
