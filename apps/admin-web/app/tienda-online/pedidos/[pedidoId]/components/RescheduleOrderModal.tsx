'use client';

import { useState } from 'react';

const TIME_RANGES = ['09:00 a 12:00', '12:00 a 15:00', '15:00 a 18:00'];

export default function RescheduleOrderModal({
  onCancel,
  onConfirm,
  submitting,
}: {
  onCancel: () => void;
  onConfirm: (data: { newConfirmedDeliveryDate: string; newDeliveryTimeRange: string; reason: string; comment: string }) => void;
  submitting: boolean;
}) {
  const [newConfirmedDeliveryDate, setNewConfirmedDeliveryDate] = useState('');
  const [newDeliveryTimeRange, setNewDeliveryTimeRange] = useState(TIME_RANGES[0]);
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');

  const canSubmit = newConfirmedDeliveryDate && reason.trim().length >= 3;

  return (
    <div className="confirm-backdrop" onClick={onCancel} role="presentation">
      <section aria-modal="true" className="confirm-dialog" onClick={(event) => event.stopPropagation()} role="dialog">
        <h2>Reprogramar entrega</h2>
        <p>La nueva fecha sera notificada al cliente y quedara registrada en el historial.</p>
        <label>
          Nueva fecha confirmada
          <input onChange={(event) => setNewConfirmedDeliveryDate(event.target.value)} type="date" value={newConfirmedDeliveryDate} />
        </label>
        <label>
          Nuevo rango horario
          <select onChange={(event) => setNewDeliveryTimeRange(event.target.value)} value={newDeliveryTimeRange}>
            {TIME_RANGES.map((range) => <option key={range} value={range}>{range}</option>)}
          </select>
        </label>
        <label>
          Motivo
          <textarea onChange={(event) => setReason(event.target.value)} placeholder="Motivo de la reprogramacion..." value={reason} />
        </label>
        <label>
          Comentario (opcional)
          <textarea onChange={(event) => setComment(event.target.value)} value={comment} />
        </label>
        <div className="confirm-actions">
          <button className="admin-secondary" disabled={submitting} onClick={onCancel} type="button">Cancelar</button>
          <button
            className="admin-primary"
            disabled={submitting || !canSubmit}
            onClick={() => onConfirm({ newConfirmedDeliveryDate, newDeliveryTimeRange, reason, comment })}
            type="button"
          >
            {submitting ? 'Guardando...' : 'Reprogramar'}
          </button>
        </div>
      </section>
    </div>
  );
}
