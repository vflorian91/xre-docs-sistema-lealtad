'use client';

import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { clientStoreApiRequest, formatStoreDate, formatStoreMoney, getErrorText } from '../lib/clientStoreApi';

type OrderSummary = {
  id: string;
  orderNumber: string;
  orderStatus: string;
  deliveryStatus: string;
  clientPaymentStatus: string;
  totalAmount: number;
  suggestedDeliveryDate: string;
  createdAt: string;
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  PEDIDO_SOLICITADO: 'Pedido solicitado',
  EN_REVISION: 'En revision',
  CONFIRMADO_ADMIN: 'Confirmado',
  REPROGRAMADO: 'Reprogramado',
  PREPARANDO_PEDIDO: 'Preparando pedido',
  ASIGNADO_MOTORISTA: 'Asignado a entrega',
  EN_RUTA: 'En ruta',
  ENTREGADO: 'Entregado',
  NO_ENTREGADO: 'No entregado',
  CANCELADO: 'Cancelado',
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDIENTE_PAGO: 'Pendiente de pago',
  PENDIENTE_LINK: 'Pendiente de link',
  LINK_ENVIADO: 'Link enviado',
  PENDIENTE_CONFIRMACION: 'Pendiente de confirmacion',
  PAGO_CONFIRMADO: 'Pago confirmado',
  PAGO_RECHAZADO: 'Pago rechazado',
  NO_PAGADO: 'No pagado',
  ANULADO: 'Anulado',
};

export default function MisPedidosPage() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    clientStoreApiRequest<OrderSummary[]>('/pwa-client/store/orders')
      .then((result) => setOrders(result))
      .catch((error) => setMessage({ type: 'error', text: getErrorText(error, 'No se pudieron cargar tus pedidos.') }))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="store-screen">
      <header className="store-header">
        <a aria-label="Volver a tienda" className="store-back-link" href="/tienda-online">
          <ArrowLeft size={18} />
        </a>
        <h1>Mis pedidos</h1>
      </header>

      <div className="store-content">
        {message ? <div className={`store-message ${message.type}`}>{message.text}</div> : null}
        {isLoading ? <div className="store-loading">Cargando pedidos...</div> : null}

        {!isLoading && orders.length === 0 ? (
          <div className="store-empty-state">
            <p>Todavia no tienes pedidos de la tienda.</p>
            <a className="store-button-secondary" href="/tienda-online">Ir a tienda</a>
          </div>
        ) : null}

        {orders.map((order) => (
          <a className="store-order-card" href={`/tienda-online/mis-pedidos/${order.id}`} key={order.id}>
            <div className="store-order-card-row">
              <strong>{order.orderNumber}</strong>
              <span>Q{formatStoreMoney(order.totalAmount)}</span>
            </div>
            <span className="store-availability">{formatStoreDate(order.createdAt)}</span>
            <div className="store-order-card-row">
              <span className="store-badge">{ORDER_STATUS_LABELS[order.orderStatus] ?? order.orderStatus}</span>
              <span className="store-badge">{PAYMENT_STATUS_LABELS[order.clientPaymentStatus] ?? order.clientPaymentStatus}</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
