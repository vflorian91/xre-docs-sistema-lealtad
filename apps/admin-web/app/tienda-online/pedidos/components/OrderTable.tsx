import { Eye } from 'lucide-react';
import { formatDate } from '../../../lib/format';
import { OrderStatusBadge, PAYMENT_METHOD_LABELS, PaymentStatusBadge } from './OrderStatusBadges';

export type OrderRow = {
  id: string;
  orderNumber: string;
  customer: { fullName: string; phone: string };
  totalAmount: number;
  paymentMethodRequested: string;
  clientPaymentStatus: string;
  orderStatus: string;
  deliveryStatus: string;
  createdAt: string;
  suggestedDeliveryDate: string;
  confirmedDeliveryDate?: string | null;
};

export default function OrderTable({ orders, isLoading }: { orders: OrderRow[]; isLoading: boolean }) {
  return (
    <table className="customer-records-table store-order-table">
      <thead>
        <tr>
          <th>Pedido</th>
          <th>Cliente</th>
          <th>Telefono</th>
          <th>Metodo de pago</th>
          <th>Estado de pago</th>
          <th>Estado pedido</th>
          <th>Fecha solicitud</th>
          <th>Fecha sugerida</th>
          <th>Fecha confirmada</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((order) => (
          <tr key={order.id}>
            <td>
              <a className="store-order-link" href={`/tienda-online/pedidos/${order.id}`}>{order.orderNumber}</a>
            </td>
            <td>{order.customer.fullName}</td>
            <td>{order.customer.phone}</td>
            <td>{PAYMENT_METHOD_LABELS[order.paymentMethodRequested] ?? order.paymentMethodRequested}</td>
            <td><PaymentStatusBadge status={order.clientPaymentStatus} /></td>
            <td><OrderStatusBadge status={order.orderStatus} /></td>
            <td>{formatDate(order.createdAt)}</td>
            <td>{formatDate(order.suggestedDeliveryDate)}</td>
            <td>{order.confirmedDeliveryDate ? formatDate(order.confirmedDeliveryDate) : 'Pendiente'}</td>
            <td>
              <div className="customer-actions">
                <a aria-label={`Ver pedido ${order.orderNumber}`} className="customer-icon-action" href={`/tienda-online/pedidos/${order.id}`}>
                  <Eye size={16} />
                </a>
              </div>
            </td>
          </tr>
        ))}
        {!isLoading && orders.length === 0 ? <tr><td colSpan={10}>No hay pedidos con esos filtros.</td></tr> : null}
        {isLoading ? <tr><td colSpan={10}>Cargando pedidos...</td></tr> : null}
      </tbody>
    </table>
  );
}
