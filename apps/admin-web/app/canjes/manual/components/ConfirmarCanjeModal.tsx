'use client';

import { AlertTriangle, Coins, Loader2 } from 'lucide-react';
import { formatMoney, formatNumber } from '../../../lib/format';
import { ClienteResult } from './types';

function Line({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="canje-modal-line">
      <span>{label}</span>
      <strong className={tone}>{value}</strong>
    </div>
  );
}

export function ConfirmarCanjeModal({
  cliente,
  points,
  amount,
  remainingPoints,
  reason,
  performedBy,
  isSubmitting,
  errorMessage,
  onCancel,
  onApply,
}: {
  cliente: ClienteResult;
  points: number;
  amount: number;
  remainingPoints: number;
  reason: string;
  performedBy: string;
  isSubmitting: boolean;
  errorMessage: string | null;
  onCancel: () => void;
  onApply: () => void;
}) {
  return (
    <div className="confirm-backdrop" role="presentation" onClick={isSubmitting ? undefined : onCancel}>
      <section
        className="confirm-dialog canje-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="canje-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="canje-modal-head">
          <span className="canje-card-icon"><Coins size={18} /></span>
          <div>
            <h2 id="canje-modal-title">Confirmar canje de puntos</h2>
            <p>Estás por aplicar un canje de puntos al cliente seleccionado. Esta acción descontará los puntos de forma inmediata.</p>
          </div>
        </header>

        <div className="canje-modal-summary">
          <Line label="Cliente" value={cliente.fullName} />
          <Line label="Código cliente" value={cliente.code} />
          <Line label="NIT" value={cliente.taxId || '—'} />
          <Line label="Puntos disponibles" value={`${formatNumber(cliente.availablePoints)} pts`} />
          <Line label="Puntos a canjear" value={`${formatNumber(points)} pts`} tone="blue" />
          <Line label="Puntos restantes" value={`${formatNumber(remainingPoints)} pts`} />
          <Line label="Monto equivalente" value={`Q${formatMoney(amount)}`} tone="green" />
          <Line label="Realizado por" value={performedBy} />
          <Line label="Motivo" value={reason.trim() || 'Sin motivo registrado.'} />
        </div>

        <div className="canje-modal-warning">
          <AlertTriangle size={15} />
          Una vez confirmado, el movimiento quedará registrado en la trazabilidad del cliente.
        </div>

        {errorMessage ? <div className="form-error canje-inline-msg">{errorMessage}</div> : null}

        <div className="canje-modal-actions">
          <button className="admin-secondary" disabled={isSubmitting} onClick={onCancel} type="button">Cancelar</button>
          <button className="admin-primary" disabled={isSubmitting} onClick={onApply} type="button">
            {isSubmitting ? <Loader2 className="canje-spin" size={16} /> : null}
            {isSubmitting ? 'Aplicando…' : 'Aplicar canje'}
          </button>
        </div>
      </section>
    </div>
  );
}
