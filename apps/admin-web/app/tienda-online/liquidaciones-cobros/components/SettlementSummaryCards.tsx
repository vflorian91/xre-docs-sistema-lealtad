import { formatMoney, formatNumber } from '../../../lib/format';

export type SettlementSummary = {
  totalPendingAmount: number;
  totalPendingCount: number;
  pendingEfectivo: number;
  pendingVisaLink: number;
  pendingTransferencia: number;
  pendingDeposito: number;
  totalSettledThisMonth: number;
  activeSettlementsThisMonth: number;
  incidentsCount: number;
};

export default function SettlementSummaryCards({ summary }: { summary: SettlementSummary }) {
  const items: Array<{ label: string; value: string }> = [
    { label: 'Pendiente de liquidar', value: `Q${formatMoney(summary.totalPendingAmount)}` },
    { label: 'Pagos pendientes', value: formatNumber(summary.totalPendingCount) },
    { label: 'Efectivo pendiente', value: `Q${formatMoney(summary.pendingEfectivo)}` },
    { label: 'Visa Link pendiente', value: `Q${formatMoney(summary.pendingVisaLink)}` },
    { label: 'Transferencia pendiente', value: `Q${formatMoney(summary.pendingTransferencia)}` },
    { label: 'Deposito pendiente', value: `Q${formatMoney(summary.pendingDeposito)}` },
    { label: 'Liquidado este mes', value: `Q${formatMoney(summary.totalSettledThisMonth)}` },
    { label: 'Incidencias', value: formatNumber(summary.incidentsCount) },
  ];

  return (
    <div className="order-summary-cards">
      {items.map((item) => (
        <article className="order-summary-card" key={item.label}>
          <strong>{item.label}</strong>
          <span>{item.value}</span>
        </article>
      ))}
    </div>
  );
}
