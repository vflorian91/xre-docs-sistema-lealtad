'use client';

import { Eye } from 'lucide-react';
import { formatDate, formatMoney } from '../../../lib/format';
import { PAYMENT_METHOD_LABELS, SettlementStatusBadge } from './SettlementStatusBadges';

export type SettlementRow = {
  id: string;
  settlementNumber: string;
  settlementDate: string;
  paymentMethod: string | null;
  totalPayments: number;
  totalAmount: number;
  status: string;
  createdByName: string | null;
};

export default function SettlementTable({ settlements, isLoading }: { settlements: SettlementRow[]; isLoading: boolean }) {
  return (
    <table className="customer-records-table">
      <thead>
        <tr>
          <th>No. liquidacion</th>
          <th>Fecha</th>
          <th>Metodos incluidos</th>
          <th>Cantidad de pagos</th>
          <th>Monto total</th>
          <th>Estado</th>
          <th>Creado por</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {settlements.map((settlement) => (
          <tr key={settlement.id}>
            <td><span className="table-main-text">{settlement.settlementNumber}</span></td>
            <td>{formatDate(settlement.settlementDate)}</td>
            <td>{settlement.paymentMethod ? PAYMENT_METHOD_LABELS[settlement.paymentMethod] ?? settlement.paymentMethod : 'Mixto'}</td>
            <td className="numeric-cell">{settlement.totalPayments}</td>
            <td className="numeric-cell">Q{formatMoney(settlement.totalAmount)}</td>
            <td><SettlementStatusBadge status={settlement.status} /></td>
            <td>{settlement.createdByName ?? '-'}</td>
            <td>
              <div className="customer-actions">
                <a aria-label={`Ver liquidacion ${settlement.settlementNumber}`} className="customer-icon-action" href={`/tienda-online/liquidaciones-cobros/${settlement.id}`}>
                  <Eye size={16} />
                </a>
              </div>
            </td>
          </tr>
        ))}
        {!isLoading && settlements.length === 0 ? <tr><td colSpan={8}>No hay liquidaciones con esos filtros.</td></tr> : null}
        {isLoading ? <tr><td colSpan={8}>Cargando liquidaciones...</td></tr> : null}
      </tbody>
    </table>
  );
}
