export const ORDER_STATUS_LABELS: Record<string, string> = {
  PEDIDO_SOLICITADO: 'Pedido solicitado',
  EN_REVISION: 'En revision',
  CONFIRMADO_ADMIN: 'Confirmado',
  REPROGRAMADO: 'Reprogramado',
  ENTREGA_EN_COORDINACION: 'Entrega en coordinacion',
  ENTREGA_PROGRAMADA: 'Entrega programada',
  PREPARANDO_PEDIDO: 'Preparando pedido',
  ASIGNADO_MOTORISTA: 'Asignado a entrega',
  EN_RECOLECCION: 'En recoleccion',
  RECOLECCION_COMPLETA: 'Recoleccion completa',
  EN_RUTA: 'En ruta',
  ENTREGADO: 'Entregado',
  NO_ENTREGADO: 'No entregado',
  CLIENTE_NO_LOCALIZADO: 'Cliente no localizado',
  ENTREGA_FALLIDA: 'Entrega fallida',
  PENDIENTE_REPROGRAMACION: 'Pendiente reprogramacion',
  CERRADO_POR_INCIDENCIA: 'Cerrado por incidencia',
  CANCELADO: 'Cancelado',
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDIENTE_PAGO: 'Pendiente de pago',
  PENDIENTE_LINK: 'Pendiente de link',
  LINK_ENVIADO: 'Link enviado',
  PENDIENTE_CONFIRMACION: 'Pendiente de confirmacion',
  PAGO_CONFIRMADO: 'Pago confirmado',
  PAGO_RECHAZADO: 'Pago rechazado',
  NO_PAGADO: 'No pagado',
  ANULADO: 'Anulado',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  EFECTIVO_CONTRA_ENTREGA: 'Efectivo contra entrega',
  VISA_LINK_MANUAL: 'Visa Link',
  TRANSFERENCIA_BANCARIA: 'Transferencia bancaria',
  DEPOSITO_BANCARIO: 'Deposito bancario',
  // Metodo historico, ya no aceptado en pedidos nuevos.
  POS_CONTRA_ENTREGA: 'POS contra entrega — no vigente',
};

export const DELIVERY_STATUS_LABELS: Record<string, string> = {
  PENDIENTE_PROGRAMACION: 'Pendiente de programacion',
  PROGRAMADA: 'Programada',
  REPROGRAMADA: 'Reprogramada',
  PREPARANDO_PEDIDO: 'Preparando pedido',
  ASIGNADA: 'Asignada',
  EN_RECOLECCION: 'En recoleccion',
  RECOLECCION_COMPLETA: 'Recoleccion completa',
  EN_RUTA: 'En ruta',
  ENTREGADA: 'Entregada',
  NO_ENTREGADA: 'No entregada',
  FALLIDA: 'Fallida',
  PENDIENTE_REPROGRAMACION: 'Pendiente reprogramacion',
  CANCELADA: 'Cancelada',
};

const POSITIVE_ORDER_STATUSES = new Set(['CONFIRMADO_ADMIN', 'ENTREGA_PROGRAMADA', 'ASIGNADO_MOTORISTA', 'ENTREGADO']);
const WARNING_ORDER_STATUSES = new Set(['EN_REVISION', 'REPROGRAMADO', 'ENTREGA_EN_COORDINACION', 'EN_RECOLECCION', 'RECOLECCION_COMPLETA', 'EN_RUTA', 'PENDIENTE_REPROGRAMACION']);
const NEGATIVE_ORDER_STATUSES = new Set(['CANCELADO', 'NO_ENTREGADO', 'CLIENTE_NO_LOCALIZADO', 'ENTREGA_FALLIDA', 'CERRADO_POR_INCIDENCIA']);

const POSITIVE_PAYMENT_STATUSES = new Set(['PAGO_CONFIRMADO']);
const WARNING_PAYMENT_STATUSES = new Set(['PENDIENTE_PAGO', 'PENDIENTE_LINK', 'LINK_ENVIADO', 'PENDIENTE_CONFIRMACION']);
const NEGATIVE_PAYMENT_STATUSES = new Set(['PAGO_RECHAZADO', 'NO_PAGADO', 'ANULADO']);
const POSITIVE_DELIVERY_STATUSES = new Set(['PROGRAMADA', 'ASIGNADA', 'ENTREGADA']);
const WARNING_DELIVERY_STATUSES = new Set(['PENDIENTE_PROGRAMACION', 'REPROGRAMADA', 'PREPARANDO_PEDIDO', 'EN_RECOLECCION', 'RECOLECCION_COMPLETA', 'EN_RUTA', 'PENDIENTE_REPROGRAMACION']);
const NEGATIVE_DELIVERY_STATUSES = new Set(['CANCELADA', 'NO_ENTREGADA', 'FALLIDA']);

function badgeClassFor(value: string, positive: Set<string>, warning: Set<string>, negative: Set<string>) {
  if (positive.has(value)) return 'badge green';
  if (warning.has(value)) return 'badge amber';
  if (negative.has(value)) return 'badge red';
  return 'badge';
}

export function OrderStatusBadge({ status }: { status: string }) {
  const className = badgeClassFor(status, POSITIVE_ORDER_STATUSES, WARNING_ORDER_STATUSES, NEGATIVE_ORDER_STATUSES);
  return <span className={className}>{ORDER_STATUS_LABELS[status] ?? status}</span>;
}

export function PaymentStatusBadge({ status }: { status: string }) {
  const className = badgeClassFor(status, POSITIVE_PAYMENT_STATUSES, WARNING_PAYMENT_STATUSES, NEGATIVE_PAYMENT_STATUSES);
  return <span className={className}>{PAYMENT_STATUS_LABELS[status] ?? status}</span>;
}

export function DeliveryStatusBadge({ status }: { status: string }) {
  const className = badgeClassFor(status, POSITIVE_DELIVERY_STATUSES, WARNING_DELIVERY_STATUSES, NEGATIVE_DELIVERY_STATUSES);
  return <span className={className}>{DELIVERY_STATUS_LABELS[status] ?? status}</span>;
}
