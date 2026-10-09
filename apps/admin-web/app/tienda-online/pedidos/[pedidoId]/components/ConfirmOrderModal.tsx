'use client';

import { useState } from 'react';

const TIME_RANGES = ['09:00 a 12:00', '12:00 a 15:00', '15:00 a 18:00'];

export default function ConfirmOrderModal({
  onCancel,
  onConfirm,
  submitting,
  suggestedDeliveryDate,
}: {
  onCancel: () => void;
  onConfirm: (data: { confirmedDeliveryDate: string; deliveryTimeRange: string; internalComment: string }) => void;
  submitting: boolean;
  suggestedDeliveryDate: string;
}) {
  const [confirmedDeliveryDate, setConfirmedDeliveryDate] = useState(suggestedDeliveryDate.slice(0, 10));
  const [deliveryTimeRange, setDeliveryTimeRange] = useState(TIME_RANGES[0]);
  const [internalComment, setInternalComment] = useState('');

  return (
    <div className="confirm-backdrop" onClick={onCancel} role="presentation">
      <section aria-modal="true" className="confirm-dialog" onClick={(event) => event.stopPropagation()} role="dialog">
        <h2>Confirmar pedido</h2>
        <p>El pedido quedara confirmado y se descontara el stock de los productos solicitados.</p>
        <label>
          Fecha confirmada de entrega
          <input onChange={(event) => setConfirmedDeliveryDate(event.target.value)} type="date" value={confirmedDeliveryDate} />
        </label>
        <label>
          Rango horario
          <select onChange={(event) => setDeliveryTimeRange(event.target.value)} value={deliveryTimeRange}>
            {TIME_RANGES.map((range) => <option key={range} value={range}>{range}</option>)}
          </select>
        </label>
        <label>
          Comentario interno (opcional)
          <textarea onChange={(event) => setInternalComment(event.target.value)} value={internalComment} />
        </label>
        <div className="confirm-actions">
          <button className="admin-secondary" disabled={submitting} onClick={onCancel} type="button">Cancelar</button>
          <button
            className="admin-primary"
            disabled={submitting || !confirmedDeliveryDate}
            onClick={() => onConfirm({ confirmedDeliveryDate, deliveryTimeRange, internalComment })}
            type="button"
          >
            {submitting ? 'Confirmando...' : 'Confirmar pedido'}
          </button>
        </div>
      </section>
    </div>
  );
}
