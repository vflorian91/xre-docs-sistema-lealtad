'use client';

import { RefreshCw, TimerReset } from 'lucide-react';
import { useState } from 'react';
import AdminRoutedShell from '../../AdminRoutedShell';
import { adminApiRequest, getErrorText } from '../../lib/adminApi';
import { formatNumber } from '../../lib/format';

type ExpirationRunResult = {
  skipped: boolean;
  reason?: string;
  now?: string;
  pointsExpired?: number;
  promotionalBalanceExpired?: number;
  redemptionsExpired?: number;
};

export default function MantenimientoParametrosPage() {
  const [result, setResult] = useState<ExpirationRunResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function runExpirations() {
    setIsSubmitting(true);
    setMessage(null);

    try {
      const nextResult = await adminApiRequest<ExpirationRunResult>('/admin/maintenance/expirations/run', {
        method: 'POST',
        body: JSON.stringify({ limit: 1000 }),
      });
      setResult(nextResult);
      setMessage({
        type: 'success',
        text: nextResult.skipped
          ? 'Ya hay un proceso de expiraciones en ejecucion.'
          : 'Expiraciones ejecutadas correctamente.',
      });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudieron ejecutar las expiraciones.') });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AdminRoutedShell title="Parametros / Mantenimiento">
      <section className="customer-dashboard-toolbar">
        <div>
          <h2>Mantenimiento operativo</h2>
          <p>Ejecuta tareas de cierre para puntos, saldo promocional y canjes vencidos.</p>
        </div>
      </section>

      {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}

      <section className="customer-summary-grid">
        <article className="customer-metric-card">
          <span className="customer-metric-icon amber"><TimerReset size={24} /></span>
          <div><span>Puntos vencidos</span><strong>{formatNumber(result?.pointsExpired ?? 0)}</strong><p>ultima ejecucion</p></div>
        </article>
        <article className="customer-metric-card">
          <span className="customer-metric-icon green"><TimerReset size={24} /></span>
          <div><span>Saldo vencido</span><strong>{formatNumber(result?.promotionalBalanceExpired ?? 0)}</strong><p>ultima ejecucion</p></div>
        </article>
        <article className="customer-metric-card">
          <span className="customer-metric-icon violet"><TimerReset size={24} /></span>
          <div><span>Canjes vencidos</span><strong>{formatNumber(result?.redemptionsExpired ?? 0)}</strong><p>ultima ejecucion</p></div>
        </article>
      </section>

      <section className="customer-table-panel">
        <div className="panel-header">
          <div>
            <h2>Expiraciones</h2>
            <p className="muted-copy">El sistema tambien ejecuta esta tarea automaticamente por intervalo en la API.</p>
          </div>
        </div>

        <div className="form-actions">
          <button className="admin-primary" disabled={isSubmitting} onClick={() => void runExpirations()} type="button">
            <RefreshCw size={16} />
            {isSubmitting ? 'Ejecutando...' : 'Ejecutar expiraciones'}
          </button>
        </div>
      </section>
    </AdminRoutedShell>
  );
}
