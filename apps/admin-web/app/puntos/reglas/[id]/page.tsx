'use client';

import { ArrowLeft, Calendar, CheckCircle2, Settings, WalletCards } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import AdminRoutedShell from '../../../AdminRoutedShell';
import { adminApiRequest, getErrorText } from '../../../lib/adminApi';
import { formatDate, formatMoney } from '../../../lib/format';

type PointRuleDetail = {
  id: string;
  name: string;
  amountPerPoint: string;
  minimumAmount: string;
  maxPointsPerPurchase?: number | null;
  roundingMode: string;
  isActive: boolean;
  startsAt: string;
  endsAt?: string | null;
};

export default function ReglaPuntosDetallePage() {
  const params = useParams<{ id: string }>();
  const ruleId = params.id;
  const [rule, setRule] = useState<PointRuleDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    void loadRule();
  }, [ruleId]);

  async function loadRule() {
    setIsLoading(true);
    setMessage(null);

    try {
      const result = await adminApiRequest<PointRuleDetail>(`/points/rules/${ruleId}`);
      setRule(result);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo cargar la regla.') });
    } finally {
      setIsLoading(false);
    }
  }

  async function activateRule() {
    if (!rule) return;
    setIsSubmitting(true);
    setMessage(null);

    try {
      const updated = await adminApiRequest<PointRuleDetail>(`/points/rules/${rule.id}/activate`, { method: 'POST' });
      setRule(updated);
      setMessage({ type: 'success', text: `Regla ${updated.name} activada.` });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo activar la regla.') });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AdminRoutedShell title="Puntos">
      <section className="customer-profile-page">
        <div className="customer-profile-page-header">
          <div>
            <a aria-label="Volver a puntos" className="customer-back-button" href="/puntos">
              <ArrowLeft size={22} />
            </a>
            <div>
              <h2>Detalle de regla</h2>
              <p>Consulta los parametros de acumulacion de puntos.</p>
            </div>
          </div>
          {rule && !rule.isActive ? (
            <div className="customer-profile-actions">
              <button className="admin-primary" disabled={isSubmitting} onClick={() => void activateRule()} type="button"><CheckCircle2 size={16} /> Activar regla</button>
            </div>
          ) : null}
        </div>

        {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}
        {isLoading ? <div className="form-success">Cargando regla...</div> : null}

        {rule ? (
          <>
            <section className="customer-profile-hero">
              <div className="customer-avatar-large"><WalletCards size={64} /></div>
              <div>
                <div className="customer-profile-name-row">
                  <h3>{rule.name}</h3>
                  <span className={rule.isActive ? 'badge green' : 'badge red'}>{rule.isActive ? 'ACTIVA' : 'INACTIVA'}</span>
                </div>
                <div className="customer-profile-info-grid">
                  <span><Settings size={16} /> Q{formatMoney(rule.amountPerPoint)} por punto</span>
                  <span><Settings size={16} /> Minimo Q{formatMoney(rule.minimumAmount)}</span>
                  <span><Calendar size={16} /> Inicio {formatDate(rule.startsAt)}</span>
                  <span><Calendar size={16} /> {rule.endsAt ? `Fin ${formatDate(rule.endsAt)}` : 'Sin fecha fin'}</span>
                </div>
              </div>
            </section>

          </>
        ) : null}
      </section>
    </AdminRoutedShell>
  );
}
