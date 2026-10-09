'use client';

import { useState } from 'react';
import { formatMoney } from '../../../../lib/format';

export default function CreateSettlementModal({
  count,
  onCancel,
  onConfirm,
  submitting,
  totalAmount,
}: {
  count: number;
  onCancel: () => void;
  onConfirm: (data: { reference: string; comment: string }) => void;
  submitting: boolean;
  totalAmount: number;
}) {
  const [reference, setReference] = useState('');
  const [comment, setComment] = useState('');

  return (
    <div className="confirm-backdrop" onClick={onCancel} role="presentation">
      <section aria-modal="true" className="confirm-dialog" onClick={(event) => event.stopPropagation()} role="dialog">
        <h2>¿Confirmar liquidación?</h2>
        <p>Cantidad de pagos: <strong>{count}</strong></p>
        <p>Monto total: <strong>Q{formatMoney(totalAmount)}</strong></p>
        <label>
          Referencia (opcional)
          <input onChange={(event) => setReference(event.target.value)} value={reference} />
        </label>
        <label>
          Comentario (opcional)
          <textarea onChange={(event) => setComment(event.target.value)} value={comment} />
        </label>
        <div className="confirm-actions">
          <button className="admin-secondary" disabled={submitting} onClick={onCancel} type="button">Cancelar</button>
          <button className="admin-primary" disabled={submitting || count === 0} onClick={() => onConfirm({ reference, comment })} type="button">
            {submitting ? 'Creando...' : 'Confirmar'}
          </button>
        </div>
      </section>
    </div>
  );
}
