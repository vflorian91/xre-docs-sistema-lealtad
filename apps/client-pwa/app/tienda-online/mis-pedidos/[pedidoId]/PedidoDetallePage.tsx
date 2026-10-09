'use client';

import { ArrowLeft, ImageOff } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { absoluteStoreMediaUrl, clientStoreApiRequest, formatStoreDate, formatStoreMoney, getErrorText } from '../../lib/clientStoreApi';

type OrderItem = {
  id: string;
  brandName: string;
  productName: string;
  variantLabel?: string | null;
  sku?: string | null;
  imageUrl?: string | null;
  unitPrice: number;
  quantity: number;
  subtotal: number;
};

type TimelineEvent = {
  statusType: string;
  newStatus: string;
  comment?: string | null;
  createdAt: string;
};

type OrderDetail = {
  orderNumber: string;
  orderStatus: string;
  deliveryStatus: string;
  clientPaymentStatus: string;
  paymentMethodRequested: string;
  subtotalAmount: number;
  shippingAmount: number;
  totalAmount: number;
  suggestedDeliveryDate: string;
  confirmedDeliveryDate?: string | null;
  deliveryTimeRange?: string | null;
  deliveryAddress: string;
  deliveryReference?: string | null;
  deliveryPhone: string;
  receiverName?: string | null;
  deliveryCode?: string | null;
  deliveryCodeStatus?: string | null;
  deliveryCodeValidatedAt?: string | null;
  createdAt: string;
  items: OrderItem[];
  timeline: TimelineEvent[];
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
  EN_RECOLECCION: 'En recolección',
  RECOLECCION_COMPLETA: 'Recolección completa',
  ENTREGA_PROGRAMADA: 'Entrega programada',
  NO_ENTREGADO: 'No entregado',
  CANCELADO: 'Cancelado',
};

const DELIVERY_FLOW_MESSAGES: Record<string, string> = {
  ASIGNADA: 'Tu pedido está asignado a un motorista.',
  EN_RECOLECCION: 'Tu pedido está siendo recolectado en tienda.',
  RECOLECCION_COMPLETA: 'Tu pedido ya fue recolectado y está listo para salir.',
  EN_RUTA: 'Tu pedido va en camino.',
  ENTREGADA: 'Tu pedido fue entregado correctamente.',
  FALLIDA: 'Tuvimos un inconveniente con tu entrega. Nuestro equipo lo está revisando.',
  NO_ENTREGADA: 'No pudimos completar la entrega. Nuestro equipo dará seguimiento.',
};

const CLIENT_FLOW = [
  { status: 'EN_RECOLECCION', label: 'En recolección' },
  { status: 'RECOLECCION_COMPLETA', label: 'Recolección completa' },
  { status: 'EN_RUTA', label: 'En camino' },
  { status: 'ENTREGADA', label: 'Entregado' },
];

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

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  EFECTIVO_CONTRA_ENTREGA: 'Efectivo contra entrega',
  VISA_LINK_MANUAL: 'Visa Link',
  TRANSFERENCIA_BANCARIA: 'Transferencia bancaria',
  DEPOSITO_BANCARIO: 'Deposito bancario',
  // Metodo historico, ya no aceptado en pedidos nuevos.
  POS_CONTRA_ENTREGA: 'POS contra entrega — no vigente',
};

export default function PedidoDetallePage() {
  const params = useParams<{ pedidoId: string }>();
  const orderId = params.pedidoId;
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    clientStoreApiRequest<OrderDetail>(`/pwa-client/store/orders/${orderId}`)
      .then((result) => setOrder(result))
      .catch((error) => setMessage({ type: 'error', text: getErrorText(error, 'No se pudo cargar el pedido.') }))
      .finally(() => setIsLoading(false));
  }, [orderId]);

  return (
    <div className="store-screen">
      <header className="store-header">
        <a aria-label="Volver a mis pedidos" className="store-back-link" href="/tienda-online/mis-pedidos">
          <ArrowLeft size={18} />
        </a>
        <h1>Detalle de pedido</h1>
      </header>

      <div className="store-content">
        {message ? <div className={`store-message ${message.type}`}>{message.text}</div> : null}
        {isLoading ? <div className="store-loading">Cargando pedido...</div> : null}

        {order ? (
          <>
            <div className="store-summary-card">
              <strong>{order.orderNumber}</strong>
              <div className="store-order-card-row">
                <span className="store-badge">{ORDER_STATUS_LABELS[order.orderStatus] ?? order.orderStatus}</span>
                <span className="store-badge">{PAYMENT_STATUS_LABELS[order.clientPaymentStatus] ?? order.clientPaymentStatus}</span>
              </div>
              <span>Solicitado el {formatStoreDate(order.createdAt)}</span>
            </div>

            <div className="store-summary-card">
              <strong>Productos</strong>
              {order.items.map((item) => {
                const imageUrl = absoluteStoreMediaUrl(item.imageUrl);
                return (
                  <div className="store-cart-item" key={item.id}>
                    <div className="store-cart-item-image">{imageUrl ? <img alt={item.productName} src={imageUrl} /> : <ImageOff size={18} />}</div>
                    <div className="store-cart-item-info">
                      <span className="store-brand-label">{item.brandName}</span>
                      <strong>{item.productName}</strong>
                      {item.variantLabel ? <small>{item.variantLabel}</small> : null}
                      {item.sku ? <small>SKU: {item.sku}</small> : null}
                      <div className="store-cart-item-row">
                        <span>{item.quantity} x Q{formatStoreMoney(item.unitPrice)}</span>
                        <span className="store-price">Q{formatStoreMoney(item.subtotal)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="store-summary-row"><span>Subtotal</span><span>Q{formatStoreMoney(order.subtotalAmount)}</span></div>
              <div className="store-summary-row"><span>Envio</span><span>Q{formatStoreMoney(order.shippingAmount)}</span></div>
              <div className="store-summary-row is-total"><span>Total</span><span>Q{formatStoreMoney(order.totalAmount)}</span></div>
            </div>

            <div className="store-summary-card">
              <strong>Entrega</strong>
              <span className="store-badge">{DELIVERY_FLOW_MESSAGES[order.deliveryStatus] ?? 'Estamos dando seguimiento a tu pedido.'}</span>
              <span>{order.deliveryAddress}</span>
              {order.deliveryReference ? <span>{order.deliveryReference}</span> : null}
              <span>Telefono: {order.deliveryPhone}</span>
              {order.confirmedDeliveryDate
                ? <span>Fecha de entrega: {formatStoreDate(order.confirmedDeliveryDate)}</span>
                : <span>Fecha de entrega: Por programar por nuestro equipo.</span>}
              {order.deliveryTimeRange ? <span>Horario: {order.deliveryTimeRange}</span> : null}
            </div>

            <div className="store-summary-card">
              <strong>Seguimiento de entrega</strong>
              <div className="client-delivery-flow">
                {CLIENT_FLOW.map((step) => {
                  const currentIndex = CLIENT_FLOW.findIndex((item) => item.status === order.deliveryStatus);
                  const stepIndex = CLIENT_FLOW.findIndex((item) => item.status === step.status);
                  const state = currentIndex === -1 ? 'pending' : stepIndex < currentIndex ? 'done' : stepIndex === currentIndex ? 'current' : 'pending';
                  return <span className={state} key={step.status}><i />{step.label}</span>;
                })}
              </div>
            </div>

            {order.deliveryCode ? (
              <div className="store-summary-card delivery-code-card">
                <strong>Código de entrega</strong>
                <p>Comparte este código únicamente con el motorista cuando recibas tu pedido.</p>
                <b>{order.deliveryCode}</b>
              </div>
            ) : null}

            <div className="store-summary-card">
              <strong>Pago</strong>
              <span>Metodo: {PAYMENT_METHOD_LABELS[order.paymentMethodRequested] ?? order.paymentMethodRequested}</span>
              <span>Estado: {PAYMENT_STATUS_LABELS[order.clientPaymentStatus] ?? order.clientPaymentStatus}</span>
            </div>

            {order.timeline.length > 0 ? (
              <div className="store-summary-card">
                <strong>Seguimiento</strong>
                <div className="store-timeline">
                  {order.timeline.map((event, index) => (
                    <div className="store-timeline-item" key={index}>
                      <strong>{ORDER_STATUS_LABELS[event.newStatus] ?? event.newStatus}</strong>
                      {event.comment ? <small>{event.comment}</small> : null}
                      <small>{formatStoreDate(event.createdAt)}</small>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
