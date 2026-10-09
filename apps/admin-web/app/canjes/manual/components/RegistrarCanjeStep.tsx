'use client';

import { ArrowLeft, Gift, Lock } from 'lucide-react';
import { formatMoney, formatNumber } from '../../../lib/format';
import { ClienteResult, isActiveClient, levelBadgeClass } from './types';
import { VistaPreviaCanje } from './VistaPreviaCanje';

function ReadField({ label, value, icon }: { label: string; value: React.ReactNode; icon?: boolean }) {
  return (
    <label className="canje-field canje-field-locked">
      {label}
      <span className="canje-locked-input">
        {value}
        {icon ? <Lock size={13} /> : null}
      </span>
    </label>
  );
}

export function RegistrarCanjeStep({
  cliente,
  pointValueAmount,
  points,
  reason,
  performedBy,
  onPointsChange,
  onReasonChange,
  onBack,
  onConfirm,
}: {
  cliente: ClienteResult;
  pointValueAmount: number;
  points: string;
  reason: string;
  performedBy: string;
  onPointsChange: (value: string) => void;
  onReasonChange: (value: string) => void;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const active = isActiveClient(cliente);
  const pointsNum = Number(points || 0);
  const amount = pointsNum * pointValueAmount;
  const remaining = cliente.availablePoints - pointsNum;
  const exceeds = pointsNum > cliente.availablePoints;
  const invalid = !active || !Number.isInteger(pointsNum) || pointsNum <= 0 || exceeds;

  return (
    <div className="canje-register-layout">
      <section className="canje-card">
        <header className="canje-card-head">
          <span className="canje-card-icon"><Gift size={18} /></span>
          <div><h2>Registrar canje</h2><p>Datos del cliente bloqueados. Ingresa los puntos a canjear.</p></div>
        </header>

        <div className="canje-register-grid">
          <ReadField label="Cliente" value={`${cliente.fullName} (${cliente.code})`} icon />
          <ReadField label="NIT" value={cliente.taxId || '—'} icon />
          <ReadField label="Puntos disponibles" value={formatNumber(cliente.availablePoints)} icon />
          <ReadField label="Nivel" value={<span className={levelBadgeClass(cliente.loyaltyLevel)}>{cliente.loyaltyLevel || 'Básico'}</span>} />
          <ReadField label="Estado" value={<span className={`badge ${active ? 'green' : 'red'}`}>{active ? 'Activo' : 'Inactivo'}</span>} />

          <label className="canje-field">
            Puntos a canjear <b>*</b>
            <input
              inputMode="numeric"
              value={points}
              onChange={(event) => onPointsChange(event.target.value.replace(/\D/g, ''))}
              placeholder="Ej. 500"
            />
          </label>
          <label className="canje-field">
            Equivalente en monto
            <span className="canje-locked-input">Q{formatMoney(amount)}<Lock size={13} /></span>
          </label>
          <label className="canje-field canje-field-wide">
            Motivo (opcional)
            <span className="canje-textarea-wrap">
              <textarea
                maxLength={240}
                value={reason}
                onChange={(event) => onReasonChange(event.target.value)}
                placeholder="Describe brevemente el motivo del canje..."
              />
              <small>{reason.length} / 240</small>
            </span>
          </label>
        </div>

        {exceeds ? <div className="form-error canje-inline-msg">Los puntos a canjear no pueden exceder los puntos disponibles.</div> : null}

        <div className="canje-summary-strip">
          <span>Puntos antes: <strong>{formatNumber(cliente.availablePoints)}</strong></span>
          <span>Puntos a descontar: <strong>{formatNumber(pointsNum)}</strong></span>
          <span>Puntos restantes: <strong>{formatNumber(Math.max(0, remaining))}</strong></span>
          <span>Monto a aplicar: <strong className="green">Q{formatMoney(amount)}</strong></span>
        </div>

        <footer className="canje-actions">
          <button className="admin-secondary" onClick={onBack} type="button"><ArrowLeft size={16} /> Atrás</button>
          <button className="admin-primary" disabled={invalid} onClick={onConfirm} type="button"><Gift size={16} /> Confirmar canje</button>
        </footer>
      </section>

      <VistaPreviaCanje
        cliente={cliente}
        points={pointsNum}
        amount={amount}
        remainingPoints={Math.max(0, remaining)}
        performedBy={performedBy}
      />
    </div>
  );
}
