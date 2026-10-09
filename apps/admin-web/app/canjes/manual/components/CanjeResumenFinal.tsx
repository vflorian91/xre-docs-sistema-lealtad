'use client';

import { CheckCircle2, Eye, Printer, RotateCcw } from 'lucide-react';
import { formatMoney, formatNumber } from '../../../lib/format';
import { SuccessData } from './types';

function Line({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="canje-final-line">
      <span>{label}</span>
      <strong className={tone}>{value}</strong>
    </div>
  );
}

export function CanjeResumenFinal({ data, onNewCanje }: { data: SuccessData; onNewCanje: () => void }) {
  return (
    <section className="canje-card canje-final">
      <div className="canje-final-hero">
        <span className="canje-final-check"><CheckCircle2 size={40} /></span>
        <h2>Canje aplicado correctamente</h2>
        <p>El movimiento quedó registrado en la trazabilidad del cliente.</p>
      </div>

      <div className="canje-final-grid">
        <Line label="Código del movimiento" value={<span className="canje-final-code">{data.movementCode}</span>} />
        <Line label="Cliente" value={data.cliente.fullName} />
        <Line label="Código cliente" value={data.cliente.code} />
        <Line label="NIT" value={data.cliente.taxId || '—'} />
        <Line label="Puntos descontados" value={`${formatNumber(data.pointsRedeemed)} pts`} tone="red" />
        <Line label="Puntos restantes" value={`${formatNumber(data.remainingPoints)} pts`} />
        <Line label="Monto equivalente aplicado" value={`Q${formatMoney(data.amount)}`} tone="green" />
        <Line label="Fecha y hora" value={new Date(data.appliedAt).toLocaleString('es-GT', { dateStyle: 'short', timeStyle: 'short' })} />
        <Line label="Usuario que realizó el canje" value={data.performedBy} />
        <Line label="Motivo" value={data.reason.trim() || 'Sin motivo registrado.'} />
        <Line label="Estado" value={<span className="badge green">Aplicado</span>} />
      </div>

      <footer className="canje-actions">
        <button className="admin-secondary" onClick={() => window.print()} type="button"><Printer size={16} /> Imprimir comprobante</button>
        <a className="admin-secondary" href={`/clientes/${data.cliente.id}`}><Eye size={16} /> Ver detalle del cliente</a>
        <button className="admin-primary" onClick={onNewCanje} type="button"><RotateCcw size={16} /> Nuevo canje</button>
      </footer>
    </section>
  );
}
