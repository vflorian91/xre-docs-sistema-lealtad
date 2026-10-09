'use client';

import { ArrowLeft, Calendar, Gift, Image, Pencil, Star, WalletCards } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import AdminRoutedShell from '../../AdminRoutedShell';
import { absoluteMediaUrl, adminApiRequest, getErrorText } from '../../lib/adminApi';
import { formatDate, formatNumber } from '../../lib/format';

type RewardDetail = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  pointsValue: number;
  stock?: number | null;
  reservedStock: number;
  availableStock?: number | null;
  imageUrl?: string | null;
  isActive: boolean;
  isFeatured: boolean;
  requiresApproval: boolean;
  isGiftCard: boolean;
  isPublished: boolean;
  displayOrder: number;
  redemptionLimitPerCustomer?: number | null;
  termsConditions?: string | null;
  category?: { id: string; code: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
};

export default function PremioPerfilPage() {
  const params = useParams<{ id: string }>();
  const rewardId = params.id;
  const [reward, setReward] = useState<RewardDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    void loadReward();
  }, [rewardId]);

  async function loadReward() {
    setIsLoading(true);
    setMessage(null);

    try {
      const result = await adminApiRequest<RewardDetail>(`/rewards/${rewardId}`);
      setReward(result);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo cargar el premio.') });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AdminRoutedShell title="Premios">
      <section className="customer-profile-page">
        <div className="customer-profile-page-header">
          <div>
            <a aria-label="Volver a premios" className="customer-back-button" href="/premios">
              <ArrowLeft size={22} />
            </a>
            <div>
              <h2>Perfil del premio</h2>
              <p>Consulta costo, stock, visibilidad e imagen del beneficio.</p>
            </div>
          </div>
          {reward ? (
            <div className="customer-profile-actions">
              <a className="admin-primary" href={`/premios/${reward.id}/editar`}><Pencil size={16} /> Editar premio</a>
            </div>
          ) : null}
        </div>

        {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}
        {isLoading ? <div className="form-success">Cargando premio...</div> : null}

        {reward ? (
          <>
            <section className="customer-profile-hero">
              <div className="customer-avatar-large">
                {reward.imageUrl ? <img alt="" src={absoluteMediaUrl(reward.imageUrl)} /> : <Gift size={64} />}
              </div>
              <div>
                <div className="customer-profile-name-row">
                  <h3>{reward.name}</h3>
                  <span className={reward.isActive ? 'badge green' : 'badge red'}>{reward.isActive ? 'ACTIVO' : 'INACTIVO'}</span>
                  <span className={reward.isPublished ? 'badge green' : 'badge red'}>{reward.isPublished ? 'PUBLICADO' : 'NO PUBLICADO'}</span>
                  <span className={reward.requiresApproval ? 'badge blue' : 'badge green'}>{reward.requiresApproval ? 'REQUIERE APROBACION' : 'CANJE INMEDIATO'}</span>
                  {reward.isGiftCard ? <span className="loyalty-level-badge gold">Tarjeta de regalo</span> : null}
                  {reward.isFeatured ? <span className="loyalty-level-badge gold">Destacado</span> : null}
                </div>
                <p className="customer-code-line"><strong>{reward.code}</strong> · {reward.category?.name || 'Sin categoria'}</p>
                <div className="customer-profile-info-grid">
                  <span><WalletCards size={16} /> {formatNumber(reward.pointsValue)} puntos</span>
                  <span><Gift size={16} /> {reward.stock ?? 'Stock sin limite'}</span>
                  <span><Star size={16} /> Orden {formatNumber(reward.displayOrder)}</span>
                  <span><Calendar size={16} /> Creado el {formatDate(reward.createdAt)}</span>
                  <span><Calendar size={16} /> Actualizado el {formatDate(reward.updatedAt)}</span>
                  <span><Image size={16} /> {reward.imageUrl ? 'Imagen configurada' : 'Sin imagen'}</span>
                </div>
              </div>
            </section>

            <section className="customer-history-layout">
              <article className="customer-history-panel">
                <h3>Descripcion</h3>
                <p className="muted-copy">{reward.description || 'Este premio no tiene descripcion configurada.'}</p>
              </article>
              <article className="customer-history-panel">
                <h3>Imagen</h3>
                {reward.imageUrl ? <img alt="" className="reward-detail-image" src={absoluteMediaUrl(reward.imageUrl)} /> : <p className="muted-copy">No hay imagen asignada.</p>}
              </article>
              <article className="customer-history-panel">
                <h3>Terminos y condiciones</h3>
                <p className="muted-copy">{reward.termsConditions || 'Sin terminos y condiciones configurados.'}</p>
                <p className="muted-copy">Limite por cliente: {reward.redemptionLimitPerCustomer ?? 'Sin limite'}</p>
              </article>
            </section>
          </>
        ) : null}
      </section>
    </AdminRoutedShell>
  );
}
