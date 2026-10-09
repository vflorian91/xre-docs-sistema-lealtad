'use client';

import { useState } from 'react';
import { INCIDENT_REASON_LABELS } from '../../components/SettlementStatusBadges';

const REASON_CODES = Object.keys(INCIDENT_REASON_LABELS);

export default function MarkIncidentModal({
  onCancel,
  onConfirm,
  orderNumber,
  submitting,
}: {
  onCancel: () => void;
  onConfirm: (data: { reasonCode: string; comment: string }) => void;
  orderNumber: string;
  submitting: boolean;
}) {
  const [reasonCode, setReasonCode] = useState(REASON_CODES[0]);
  const [comment, setComment] = useState('');

  const requiresComment = reasonCode === 'OTRO';
  const canSubmit = !requiresComment || comment.trim().length > 0;

  return (
    <div className="confirm-backdrop" onClick={onCancel} role="presentation">
      <section aria-modal="true" className="confirm-dialog" onClick={(event) => event.stopPropagation()} role="dialog">
        <h2>Marcar incidencia</h2>
        <p>Pedido {orderNumber}. El pago quedara retenido y no podra liquidarse hasta liberar la incidencia.</p>
        <label>
          Motivo
          <select onChange={(event) => setReasonCode(event.target.value)} value={reasonCode}>
            {REASON_CODES.map((code) => (
              <option key={code} value={code}>{INCIDENT_REASON_LABELS[code]}</option>
            ))}
          </select>
        </label>
        <label>
          Comentario{requiresComment ? ' (obligatorio)' : ' (opcional)'}
          <textarea onChange={(event) => setComment(event.target.value)} value={comment} />
        </label>
        <div className="confirm-actions">
          <button className="admin-secondary" disabled={submitting} onClick={onCancel} type="button">Cancelar</button>
          <button className="admin-primary" disabled={submitting || !canSubmit} onClick={() => onConfirm({ reasonCode, comment })} type="button">
            {submitting ? 'Guardando...' : 'Confirmar'}
          </button>
        </div>
      </section>
    </div>
  );
}
