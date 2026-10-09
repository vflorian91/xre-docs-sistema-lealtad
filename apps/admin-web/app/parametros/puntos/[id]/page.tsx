'use client';

import { ArrowLeft, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AdminRoutedShell from '../../../AdminRoutedShell';
import { adminApiRequest, getErrorText } from '../../../lib/adminApi';
import { formatDate, formatMoney, formatNumber } from '../../../lib/format';

type PointRuleDetail = {
  id: string;
  name: string;
  amountPerPoint: string;
  pointValueAmount: string;
  minimumAmount: string;
  maxPointsPerPurchase?: number | null;
  pointsExpirationDays?: number | null;
  isActive: boolean;
  startsAt: string;
  endsAt?: string | null;
  createdAt: string;
  brand?: { id: string; code: string; name: string } | null;
};

export default function PuntoDetallePage() {
  const params = useParams<{ id: string }>();
  const ruleId = params.id;
  const [rule, setRule] = useState<PointRuleDetail | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    void loadRule();
  }, [ruleId]);

  async function loadRule() {
    try {
      setRule(await adminApiRequest<PointRuleDetail>(`/points/rules/${ruleId}`));
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo cargar la regla de puntos.') });
    }
  }

  return (
    <AdminRoutedShell title="Parametros / Puntos">
      <section className="customer-edit-page">
        <div className="customer-edit-header">
          <a aria-label="Regresar a puntos" className="customer-back-button" href="/parametros/puntos"><ArrowLeft size={20} /></a>
          <div>
            <h2>{rule?.name ?? 'Regla de puntos'}</h2>
            <p>Detalle solo lectura de la logica usada para acumular puntos.</p>
          </div>
        </div>

        {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}

        {rule ? (
          <section className="panel customer-edit-card wide">
            <h3><Settings size={18} /> Detalle</h3>
            <div className="customer-edit-summary-grid">
              <Detail label="Codigo" value={rule.id} />
              <Detail label="Estado" value={rule.isActive ? 'Activa' : 'Finalizada'} tone={rule.isActive ? 'summary-green' : 'summary-red'} />
              <Detail label="Marca" value={rule.brand?.name ?? '-'} />
              <Detail label="Q gastados por punto" value={`Q${formatMoney(rule.amountPerPoint)}`} />
              <Detail label="Valor de punto" value={`Q${formatPointValue(rule.pointValueAmount)}`} />
              <Detail label="Compra minima" value={`Q${formatMoney(rule.minimumAmount)}`} />
              <Detail label="Maximo por compra" value={rule.maxPointsPerPurchase ? formatNumber(rule.maxPointsPerPurchase) : 'Sin limite'} />
              <Detail label="Vencimiento" value={rule.pointsExpirationDays ? `${formatNumber(rule.pointsExpirationDays)} dias` : 'Sin vencimiento'} />
              <Detail label="Inicio" value={formatDate(rule.startsAt)} />
              <Detail label="Finalizacion" value={formatDate(rule.endsAt)} />
              <Detail label="Creacion" value={formatDate(rule.createdAt)} />
            </div>
          </section>
        ) : null}
      </section>
    </AdminRoutedShell>
  );
}

function formatPointValue(value: string | number) {
  return new Intl.NumberFormat('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 5 }).format(Number(value));
}

function Detail({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="customer-edit-summary-item">
      <span>{label}</span>
      <strong className={tone}>{value}</strong>
    </div>
  );
}
