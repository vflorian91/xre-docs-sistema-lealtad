import { formatDate } from '../../../../lib/format';
import { DeliveryStatusBadge } from '../../components/OrderStatusBadges';

type OrderForDelivery = {
  deliveryStatus: string;
  deliveryAddress: string;
  deliveryReference?: string | null;
  deliveryPhone: string;
  receiverName?: string | null;
  suggestedDeliveryDate: string;
  confirmedDeliveryDate?: string | null;
  deliveryTimeRange?: string | null;
  assignedDriver?: { id: string; fullName: string; phone: string; code?: string | null } | null;
};

export default function OrderDeliveryInfo({ order }: { order: OrderForDelivery }) {
  return (
    <section className="order-detail-card">
      <h3>Direccion de entrega</h3>
      <div className="order-detail-row"><span>Estado de entrega</span><DeliveryStatusBadge status={order.deliveryStatus} /></div>
      <div className="order-detail-row"><span>Direccion</span><strong>{order.deliveryAddress}</strong></div>
      {order.deliveryReference ? <div className="order-detail-row"><span>Referencia</span><strong>{order.deliveryReference}</strong></div> : null}
      <div className="order-detail-row"><span>Telefono</span><strong>{order.deliveryPhone}</strong></div>
      {order.receiverName ? <div className="order-detail-row"><span>Quien recibe</span><strong>{order.receiverName}</strong></div> : null}
      <div className="order-detail-row"><span>Fecha sugerida</span><strong>{formatDate(order.suggestedDeliveryDate)}</strong></div>
      <div className="order-detail-row">
        <span>Fecha confirmada</span>
        <strong>{order.confirmedDeliveryDate ? formatDate(order.confirmedDeliveryDate) : 'Pendiente de confirmacion'}</strong>
      </div>
      {order.deliveryTimeRange ? <div className="order-detail-row"><span>Horario</span><strong>{order.deliveryTimeRange}</strong></div> : null}
      <div className="order-detail-row">
        <span>Mensajero asignado</span>
        <strong>{order.assignedDriver ? `${order.assignedDriver.fullName} (${order.assignedDriver.phone})` : 'Sin mensajero'}</strong>
      </div>
    </section>
  );
}
