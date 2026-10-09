'use client';

import { CalendarClock, Coins, Eye, Hash, ShieldCheck, UserRound, Wallet } from 'lucide-react';
import { formatMoney, formatNumber } from '../../../lib/format';
import { ClienteResult } from './types';

function Row({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="canje-preview-row">
      <span className="canje-preview-icon">{icon}</span>
      <span className="canje-preview-label">{label}</span>
      <span className={`canje-preview-value ${tone || ''}`}>{value}</span>
    </div>
  );
}

export function VistaPreviaCanje({
  cliente,
  points,
  amount,
  remainingPoints,
  performedBy,
}: {
  cliente: ClienteResult;
  points: number;
  amount: number;
  remainingPoints: number;
  performedBy: string;
}) {
  const now = new Date();
  return (
    <section className="canje-card canje-preview">
      <header className="canje-card-head">
        <span className="canje-card-icon"><Eye size={18} /></span>
        <div><h2>Vista previa del canje</h2></div>
      </header>
      <div className="canje-preview-list">
        <Row icon={<UserRound size={15} />} label="Cliente" value={cliente.fullName} />
        <Row icon={<Hash size={15} />} label="Código cliente" value={cliente.code} />
        <Row icon={<Wallet size={15} />} label="Puntos disponibles" value={`${formatNumber(cliente.availablePoints)} pts`} />
        <Row icon={<Coins size={15} />} label="Puntos a canjear" value={`${formatNumber(points)} pts`} tone="blue" />
        <Row icon={<Wallet size={15} />} label="Puntos restantes" value={`${formatNumber(remainingPoints)} pts`} />
        <Row icon={<Coins size={15} />} label="Monto equivalente" value={`Q${formatMoney(amount)}`} tone="green" />
        <Row icon={<ShieldCheck size={15} />} label="Realizado por" value={performedBy} />
        <Row icon={<CalendarClock size={15} />} label="Fecha" value={now.toLocaleString('es-GT', { dateStyle: 'short', timeStyle: 'short' })} />
        <Row icon={<ShieldCheck size={15} />} label="Estado posterior" value={<span className="badge amber">Pendiente de confirmación</span>} />
      </div>
    </section>
  );
}
