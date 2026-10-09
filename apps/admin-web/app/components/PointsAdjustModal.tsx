'use client';

import { useState } from 'react';

export type PointsAdjustModalState = {
  mode: 'add' | 'remove';
  customerName: string;
  onConfirm: (points: number, description: string) => void | Promise<void>;
};

export function PointsAdjustModal({
  state,
  onClose,
  isSubmitting,
}: {
  state: PointsAdjustModalState;
  onClose: () => void;
  isSubmitting?: boolean;
}) {
  const [points, setPoints] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    const parsedPoints = Math.abs(Number(points));
    if (!Number.isInteger(parsedPoints) || parsedPoints <= 0) {
      setError('Ingresa una cantidad entera mayor a cero.');
      return;
    }
    if (description.trim().length < 5) {
      setError('Describe el motivo del ajuste (minimo 5 caracteres).');
      return;
    }

    setError(null);
    void state.onConfirm(state.mode === 'add' ? parsedPoints : -parsedPoints, description.trim());
  }

  return (
    <div className="confirm-backdrop" role="presentation" onClick={onClose}>
      <section
        className="confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="points-adjust-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="points-adjust-title">
          {state.mode === 'add' ? 'Sumar puntos a' : 'Quitar puntos a'} {state.customerName}
        </h2>
        <label>
          Cantidad de puntos
          <input
            autoFocus
            inputMode="numeric"
            value={points}
            onChange={(event) => { setPoints(event.target.value.replace(/\D/g, '')); setError(null); }}
            placeholder="Ej. 100"
          />
        </label>
        <label>
          Motivo del ajuste
          <textarea
            value={description}
            onChange={(event) => { setDescription(event.target.value); setError(null); }}
            placeholder="Describe brevemente el motivo..."
          />
        </label>
        {error ? <p className="confirm-field-error">{error}</p> : null}
        <div className="confirm-actions">
          <button className="admin-secondary" disabled={isSubmitting} onClick={onClose} type="button">
            Cancelar
          </button>
          <button className="admin-primary" disabled={isSubmitting} onClick={handleConfirm} type="button">
            {isSubmitting ? 'Procesando...' : state.mode === 'add' ? 'Sumar puntos' : 'Quitar puntos'}
          </button>
        </div>
      </section>
    </div>
  );
}
