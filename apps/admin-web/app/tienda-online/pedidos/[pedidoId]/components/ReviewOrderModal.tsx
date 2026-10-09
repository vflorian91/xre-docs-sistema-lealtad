'use client';

import { useState } from 'react';

export default function ReviewOrderModal({
  onCancel,
  onConfirm,
  submitting,
}: {
  onCancel: () => void;
  onConfirm: (comment: string) => void;
  submitting: boolean;
}) {
  const [comment, setComment] = useState('');

  return (
    <div className="confirm-backdrop" onClick={onCancel} role="presentation">
      <section aria-modal="true" className="confirm-dialog" onClick={(event) => event.stopPropagation()} role="dialog">
        <h2>Marcar pedido en revision</h2>
        <p>El pedido quedara marcado como en revision mientras se valida disponibilidad.</p>
        <label>
          Comentario interno (opcional)
          <textarea onChange={(event) => setComment(event.target.value)} placeholder="Comentario..." value={comment} />
        </label>
        <div className="confirm-actions">
          <button className="admin-secondary" disabled={submitting} onClick={onCancel} type="button">Cancelar</button>
          <button className="admin-primary" disabled={submitting} onClick={() => onConfirm(comment)} type="button">
            {submitting ? 'Guardando...' : 'Marcar en revision'}
          </button>
        </div>
      </section>
    </div>
  );
}
