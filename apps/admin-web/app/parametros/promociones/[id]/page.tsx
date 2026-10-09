'use client';

import { ArrowLeft, Megaphone } from 'lucide-react';
import { useEffect, useState } from 'react';
import AdminRoutedShell from '../../../AdminRoutedShell';
import { adminApiRequest, getErrorText } from '../../../lib/adminApi';
import { formatDate, formatMoney, formatNumber } from '../../../lib/format';

type PromotionDetail = {
  id: string;
  name: string;
  type: string;
  multiplier?: string | null;
  bonusPoints?: number | null;
  minimumAmount?: string | null;
  startsAt: string;
  endsAt: string;
  status: string;
  targetLevels?: string[];
  shoeTypeId?: string | null;
  priority: number;
  hasUsage: boolean;
  createdAt: string;
  store?: { code: string; name: string } | null;
};

export default function PromocionDetallePage({ params }: { params: { id: string } }) {
  const [promotion, setPromotion] = useState<PromotionDetail | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    void loadPromotion();
  }, [params.id]);

  async function loadPromotion() {
    try {
      setPromotion(await adminApiRequest<PromotionDetail>(`/points/promotions/${params.id}`));
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo cargar la promocion.') });
    }
  }

  return (
    <AdminRoutedShell title="Parametros / Promociones">
      <section className="customer-edit-page">
        <div className="customer-edit-header">
          <a aria-label="Regresar a promociones" className="customer-back-button" href="/parametros/promociones"><ArrowLeft size={20} /></a>
          <div>
            <h2>{promotion?.name ?? 'Promocion'}</h2>
            <p>Detalle solo lectura de la campaña de acumulacion.</p>
          </div>
        </div>

        {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}

        {promotion ? (
          <section className="panel customer-edit-card wide">
            <h3><Megaphone size={18} /> Detalle</h3>
            <div className="customer-edit-summary-grid">
              <Detail label="Codigo" value={promotion.id} />
              <Detail label="Estado" value={promotion.status} tone={promotion.status === 'ACTIVE' ? 'summary-green' : 'summary-red'} />
              <Detail label="Tipo" value={promotion.type} />
              <Detail label="Multiplicador" value={promotion.multiplier ? `${promotion.multiplier}x` : '-'} />
              <Detail label="Puntos adicionales" value={promotion.bonusPoints ? formatNumber(promotion.bonusPoints) : '-'} />
              <Detail label="Compra minima" value={promotion.minimumAmount ? `Q${formatMoney(promotion.minimumAmount)}` : '-'} />
              <Detail label="Publico" value={promotion.targetLevels?.length ? promotion.targetLevels.join(', ') : 'Todos'} />
              <Detail label="Tienda" value={promotion.store ? `${promotion.store.name} (${promotion.store.code})` : 'Todas'} />
              <Detail label="Inicio" value={formatDate(promotion.startsAt)} />
              <Detail label="Finalizacion" value={formatDate(promotion.endsAt)} />
              <Detail label="Usada para puntos" value={promotion.hasUsage ? 'Si' : 'No'} />
              <Detail label="Creacion" value={formatDate(promotion.createdAt)} />
            </div>
          </section>
        ) : null}
      </section>
    </AdminRoutedShell>
  );
}

function Detail({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="customer-edit-summary-item">
      <span>{label}</span>
      <strong className={tone}>{value}</strong>
    </div>
  );
}
