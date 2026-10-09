'use client';

import { ArrowLeft, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DriverShell } from '../components';
import { DriverSettlements, formatMoney, getSettlements } from '../lib/driverApi';

function dayLabel(date: string) {
  const d = new Date(`${date}T00:00:00`);
  return new Intl.DateTimeFormat('es-GT', { weekday: 'long', day: '2-digit', month: 'long' }).format(d);
}

const STATUS_LABEL: Record<string, string> = {
  PENDIENTE_LIQUIDAR: 'Por entregar',
  LIQUIDADO: 'Entregado',
  CON_INCIDENCIA: 'Con incidencia',
  NO_APLICA: '—',
};

export default function LiquidacionesPage() {
  const router = useRouter();
  const [data, setData] = useState<DriverSettlements | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    getSettlements()
      .then((result) => { if (mounted) setData(result); })
      .catch((err) => { if (mounted) setError(err instanceof Error ? err.message : 'No se pudieron cargar las liquidaciones.'); })
      .finally(() => { if (mounted) setIsLoading(false); });
    return () => { mounted = false; };
  }, []);

  return (
    <DriverShell title="Liquidaciones" hideHeader>
      <section className="dp-page">
        <header className="dp-header">
          <button aria-label="Volver" className="dp-back" onClick={() => router.push('/perfil')} type="button"><ArrowLeft size={20} /></button>
          <h1>Liquidaciones</h1>
        </header>

        {error ? <div className="form-error">{error}</div> : null}
        {isLoading ? <section className="profile-card dp-loading">Cargando...</section> : null}

        {data ? (
          <>
            <section className="liq-summary">
              <div className="liq-pending">
                <span className="liq-pending-icon"><Wallet size={22} /></span>
                <div>
                  <small>Efectivo por entregar</small>
                  <strong>{formatMoney(data.pendingTotal)}</strong>
                  <p>{data.pendingCount} cobro{data.pendingCount === 1 ? '' : 's'} pendiente{data.pendingCount === 1 ? '' : 's'}</p>
                </div>
              </div>
            </section>

            <p className="dp-section-note">Este es el efectivo cobrado contra entrega que debes entregar a la empresa. El historial se agrupa por día.</p>

            {data.days.length === 0 ? (
              <section className="profile-card mv-empty"><strong>Sin cobros en efectivo</strong><p>Cuando cobres pedidos en efectivo, aparecerán aquí por día.</p></section>
            ) : null}

            {data.days.map((day) => (
              <section className="profile-card liq-day" key={day.date}>
                <header className="liq-day-head">
                  <strong>{dayLabel(day.date)}</strong>
                  <span>{formatMoney(day.total)}</span>
                </header>
                <div className="liq-day-items">
                  {day.items.map((item, idx) => (
                    <div className="liq-item" key={`${item.orderNumber}-${idx}`}>
                      <div className="liq-item-info">
                        <strong>{item.orderNumber}</strong>
                        <span className={`liq-chip ${item.status === 'PENDIENTE_LIQUIDAR' ? 'pending' : item.status === 'LIQUIDADO' ? 'ok' : 'muted'}`}>{STATUS_LABEL[item.status] ?? item.status}</span>
                      </div>
                      <strong className="liq-item-amount">{formatMoney(item.amount)}</strong>
                    </div>
                  ))}
                </div>
                {day.pendingTotal > 0 ? <footer className="liq-day-foot">Por entregar este día: <b>{formatMoney(day.pendingTotal)}</b></footer> : null}
              </section>
            ))}
          </>
        ) : null}
      </section>
    </DriverShell>
  );
}
