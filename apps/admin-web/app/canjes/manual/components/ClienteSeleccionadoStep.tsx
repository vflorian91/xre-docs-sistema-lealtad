'use client';

import { ArrowLeft, CalendarDays, CircleDollarSign, Sparkles, UserRound } from 'lucide-react';
import { formatDate, formatMoney, formatNumber } from '../../../lib/format';
import { ClienteResult, isActiveClient, levelBadgeClass } from './types';

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="canje-field-read">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function ClienteSeleccionadoStep({
  cliente,
  pointValueAmount,
  onBack,
  onContinue,
}: {
  cliente: ClienteResult;
  pointValueAmount: number;
  onBack: () => void;
  onContinue: () => void;
}) {
  const active = isActiveClient(cliente);
  const amount = cliente.availablePoints * pointValueAmount;
  const noPoints = cliente.availablePoints <= 0;
  const yearSince = cliente.createdAt ? new Date(cliente.createdAt).getFullYear() : null;

  return (
    <section className="canje-card">
      <header className="canje-card-head">
        <span className="canje-card-icon"><UserRound size={18} /></span>
        <div>
          <h2>Cliente seleccionado</h2>
          <p>Verifica que sea el cliente correcto antes de registrar el canje.</p>
        </div>
      </header>

      <div className="canje-selected-grid">
        <div className="canje-selected-fields">
          <Field label="Nombre completo" value={cliente.fullName} />
          <Field label="Código cliente" value={cliente.code} />
          <Field label="NIT" value={cliente.taxId || '—'} />
          <Field label="Correo" value={cliente.email || '—'} />
          <Field label="Teléfono" value={cliente.phone || '—'} />
          <Field label="Nivel" value={<span className={levelBadgeClass(cliente.loyaltyLevel)}>{cliente.loyaltyLevel || 'Básico'}</span>} />
          <Field label="Estado" value={<span className={`badge ${active ? 'green' : 'red'}`}>{active ? 'Activo' : 'Inactivo'}</span>} />
          <Field label="Tienda frecuente" value={cliente.registrationStore?.name || '—'} />
          <Field label="Último canje" value={cliente.lastRedemptionAt ? formatDate(cliente.lastRedemptionAt) : 'Sin canjes previos'} />
          <Field label="Cliente desde" value={yearSince ?? '—'} />
        </div>

        <div className="canje-stats">
          <div className="canje-stat blue">
            <span className="canje-stat-icon"><Sparkles size={20} /></span>
            <span className="canje-stat-label">Puntos disponibles</span>
            <strong>{formatNumber(cliente.availablePoints)}</strong>
            <small>puntos</small>
          </div>
          <div className="canje-stat green">
            <span className="canje-stat-icon"><CircleDollarSign size={20} /></span>
            <span className="canje-stat-label">Equivalencia estimada</span>
            <strong>Q{formatMoney(amount)}</strong>
            <small>según regla activa</small>
          </div>
          <div className="canje-stat violet">
            <span className="canje-stat-icon"><CalendarDays size={20} /></span>
            <span className="canje-stat-label">Cliente desde</span>
            <strong>{yearSince ?? '—'}</strong>
            <small>año de registro</small>
          </div>
        </div>
      </div>

      {!active ? <div className="form-error canje-inline-msg">El cliente está inactivo y no puede realizar canjes.</div> : null}
      {active && noPoints ? <div className="form-error canje-inline-msg">El cliente no cuenta con puntos disponibles para canjear.</div> : null}

      <footer className="canje-actions">
        <button className="admin-secondary" onClick={onBack} type="button"><ArrowLeft size={16} /> Volver a buscar</button>
        <button className="admin-primary" disabled={!active || noPoints} onClick={onContinue} type="button">Continuar con canje</button>
      </footer>
    </section>
  );
}
