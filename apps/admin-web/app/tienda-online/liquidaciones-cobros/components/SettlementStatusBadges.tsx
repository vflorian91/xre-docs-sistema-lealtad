export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  EFECTIVO_CONTRA_ENTREGA: 'Efectivo contra entrega',
  VISA_LINK_MANUAL: 'Visa Link',
  TRANSFERENCIA_BANCARIA: 'Transferencia bancaria',
  DEPOSITO_BANCARIO: 'Deposito bancario',
  // Metodo historico, ya no aceptado en pedidos nuevos.
  POS_CONTRA_ENTREGA: 'POS contra entrega — no vigente',
};

export const SETTLEMENT_STATUS_LABELS: Record<string, string> = {
  ACTIVA: 'Activa',
  ANULADA: 'Anulada',
};

export const PAYMENT_SETTLEMENT_STATUS_LABELS: Record<string, string> = {
  PENDIENTE_LIQUIDAR: 'Pendiente',
  LIQUIDADO: 'Liquidado',
  CON_INCIDENCIA: 'Incidencia',
  NO_APLICA: 'No aplica',
};

export const INCIDENT_REASON_LABELS: Record<string, string> = {
  MONTO_NO_COINCIDE: 'Monto no coincide',
  COMPROBANTE_INVALIDO: 'Comprobante invalido',
  REFERENCIA_DUPLICADA: 'Referencia duplicada',
  EFECTIVO_NO_ENTREGADO: 'Efectivo no entregado',
  DIFERENCIA_CAJA: 'Diferencia de caja',
  OTRO: 'Otro',
};

function badgeClassFor(value: string, positive: Set<string>, warning: Set<string>, negative: Set<string>) {
  if (positive.has(value)) return 'badge green';
  if (warning.has(value)) return 'badge amber';
  if (negative.has(value)) return 'badge red';
  return 'badge';
}

const POSITIVE_SETTLEMENT_STATUSES = new Set(['ACTIVA', 'LIQUIDADO']);
const WARNING_SETTLEMENT_STATUSES = new Set(['PENDIENTE_LIQUIDAR']);
const NEGATIVE_SETTLEMENT_STATUSES = new Set(['ANULADA', 'CON_INCIDENCIA']);

export function SettlementStatusBadge({ status }: { status: string }) {
  const className = badgeClassFor(status, POSITIVE_SETTLEMENT_STATUSES, WARNING_SETTLEMENT_STATUSES, NEGATIVE_SETTLEMENT_STATUSES);
  return <span className={className}>{SETTLEMENT_STATUS_LABELS[status] ?? status}</span>;
}

export function PaymentSettlementStatusBadge({ status }: { status: string }) {
  const className = badgeClassFor(status, POSITIVE_SETTLEMENT_STATUSES, WARNING_SETTLEMENT_STATUSES, NEGATIVE_SETTLEMENT_STATUSES);
  return <span className={className}>{PAYMENT_SETTLEMENT_STATUS_LABELS[status] ?? status}</span>;
}
