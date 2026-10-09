import { formatNumber } from '../../../lib/format';

type SummaryCards = {
  solicitados: number;
  enRevision: number;
  confirmados: number;
  reprogramados: number;
  cancelados: number;
  pendientesPago: number;
  pagosConfirmados: number;
  pendientesLink: number;
};

export default function OrderSummaryCards({ cards }: { cards: SummaryCards }) {
  const items: Array<{ label: string; value: number }> = [
    { label: 'Pedidos solicitados', value: cards.solicitados },
    { label: 'En revision', value: cards.enRevision },
    { label: 'Confirmados', value: cards.confirmados },
    { label: 'Reprogramados', value: cards.reprogramados },
    { label: 'Cancelados', value: cards.cancelados },
    { label: 'Pendientes de pago', value: cards.pendientesPago },
    { label: 'Pagos confirmados', value: cards.pagosConfirmados },
    { label: 'Pendientes de link', value: cards.pendientesLink },
  ];

  return (
    <div className="order-summary-cards">
      {items.map((item) => (
        <article className="order-summary-card" key={item.label}>
          <strong>{item.label}</strong>
          <span>{formatNumber(item.value)}</span>
        </article>
      ))}
    </div>
  );
}
