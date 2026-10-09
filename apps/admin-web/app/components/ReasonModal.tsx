'use client';

import { useState } from 'react';

export type ReasonModalState = {
  title: string;
  description: string;
  confirmLabel: string;
  initialValue?: string;
  onConfirm: (reason: string) => void | Promise<void>;
};

export function ReasonModal({
  state,
  onClose,
  isSubmitting,
  minLength = 8,
}: {
  state: ReasonModalState;
  onClose: () => void;
  isSubmitting?: boolean;
  minLength?: number;
}) {
  const [reason, setReason] = useState(state.initialValue ?? '');
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    const trimmed = reason.trim();
    if (trimmed.length < minLength) {
      setError(`La razon debe tener al menos ${minLength} caracteres.`);
      return;
    }

    setError(null);
    void state.onConfirm(trimmed);
  }

  return (
    <div className="confirm-backdrop" role="presentation" onClick={onClose}>
      <section
        className="confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reason-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="reason-modal-title">{state.title}</h2>
        <p>{state.description}</p>
        <label>
          Razon
          <textarea
            autoFocus
            value={reason}
            onChange={(event) => { setReason(event.target.value); setError(null); }}
            placeholder="Describe brevemente el motivo..."
          />
        </label>
        {error ? <p className="confirm-field-error">{error}</p> : null}
        <div className="confirm-actions">
          <button className="admin-secondary" disabled={isSubmitting} onClick={onClose} type="button">
            Cancelar
          </button>
          <button className="admin-primary" disabled={isSubmitting} onClick={handleConfirm} type="button">
            {isSubmitting ? 'Procesando...' : state.confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
