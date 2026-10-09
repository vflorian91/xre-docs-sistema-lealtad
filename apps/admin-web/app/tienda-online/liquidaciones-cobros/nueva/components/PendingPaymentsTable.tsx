'use client';

import { AlertTriangle, Eye } from 'lucide-react';
import { formatDate, formatMoney } from '../../../../lib/format';
import { PAYMENT_METHOD_LABELS } from '../../components/SettlementStatusBadges';

export type PendingPaymentRow = {
  paymentId: string;
  orderId: string;
  orderNumber: string;
  customer: { id: string; fullName: string; phone: string };
  driver?: { id: string; fullName: string } | null;
  paymentMethod: string;
  amount: number;
  referenceNumber?: string | null;
  authorizationCode?: string | null;
  voucherNumber?: string | null;
  paidAt?: string | null;
};

export default function PendingPaymentsTable({
  payments,
  isLoading,
  selectedIds,
  onToggle,
  onMarkIncident,
}: {
  payments: PendingPaymentRow[];
  isLoading: boolean;
  selectedIds: Set<string>;
  onToggle: (paymentId: string) => void;
  onMarkIncident: (payment: PendingPaymentRow) => void;
}) {
  return (
    <table className="customer-records-table">
      <thead>
        <tr>
          <th></th>
          <th>No. pedido</th>
          <th>Cliente</th>
          <th>Metodo</th>
          <th>Monto</th>
          <th>Referencia/Autorizacion</th>
          <th>Mensajero</th>
          <th>Fecha de pago</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {payments.map((payment) => (
          <tr key={payment.paymentId}>
            <td>
              <input
                checked={selectedIds.has(payment.paymentId)}
                onChange={() => onToggle(payment.paymentId)}
                type="checkbox"
              />
            </td>
            <td><span className="table-main-text">{payment.orderNumber}</span></td>
            <td>{payment.customer.fullName}</td>
            <td>{PAYMENT_METHOD_LABELS[payment.paymentMethod] ?? payment.paymentMethod}</td>
            <td className="numeric-cell">Q{formatMoney(payment.amount)}</td>
            <td>{payment.referenceNumber || payment.authorizationCode || payment.voucherNumber || '-'}</td>
            <td>{payment.paymentMethod === 'EFECTIVO_CONTRA_ENTREGA' ? payment.driver?.fullName ?? 'Sin asignar' : '-'}</td>
            <td>{payment.paidAt ? formatDate(payment.paidAt) : '-'}</td>
            <td>
              <div className="customer-actions">
                <a aria-label={`Ver pedido ${payment.orderNumber}`} className="customer-icon-action" href={`/tienda-online/pedidos/${payment.orderId}`}>
                  <Eye size={16} />
                </a>
                <button aria-label="Marcar incidencia" className="customer-icon-action" onClick={() => onMarkIncident(payment)} type="button">
                  <AlertTriangle size={16} />
                </button>
              </div>
            </td>
          </tr>
        ))}
        {!isLoading && payments.length === 0 ? <tr><td colSpan={9}>No hay pagos pendientes de liquidar con esos filtros.</td></tr> : null}
        {isLoading ? <tr><td colSpan={9}>Cargando pagos pendientes...</td></tr> : null}
      </tbody>
    </table>
  );
}
