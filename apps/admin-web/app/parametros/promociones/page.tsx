'use client';

import { Eye, Megaphone, Plus, RefreshCcw, Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import AdminRoutedShell from '../../AdminRoutedShell';
import { ConfirmModal, ConfirmModalState } from '../../components/ConfirmModal';
import { adminApiRequest, getErrorText, getStoredAdminUser, StoredAdminUser } from '../../lib/adminApi';
import { formatDate, formatMoney, formatNumber } from '../../lib/format';

type PromotionRow = {
  id: string;
  name: string;
  type: string;
  multiplier?: string | null;
  bonusPoints?: number | null;
  minimumAmount?: string | null;
  startsAt: string;
  endsAt: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ENDED';
  targetLevels?: string[];
  shoeTypeId?: string | null;
  createdAt: string;
  store?: { id: string; code: string; name: string } | null;
};

type PromotionsResponse = {
  data: PromotionRow[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

const pageSize = 10;
const emptyMeta = { page: 1, limit: pageSize, total: 0, totalPages: 1 };

function typeLabel(type: string) {
  const labels: Record<string, string> = {
    DOUBLE_POINTS: 'Puntos dobles',
    TRIPLE_POINTS: 'Puntos triples',
    CUSTOM_MULTIPLIER: 'Multiplicador',
    FIXED_BONUS: 'Puntos adicionales',
    SPECIAL_AMOUNT: 'Regla por monto',
    SHOE_TYPE_RULE: 'Tipo de calzado',
  };
  return labels[type] ?? type;
}

function statusLabel(status: string) {
  if (status === 'ACTIVE') return 'Activa';
  if (status === 'ENDED') return 'Finalizada';
  return 'Inactiva';
}

export default function ParametrosPromocionesPage() {
  const [user, setUser] = useState<StoredAdminUser | null>(null);
  const [promotions, setPromotions] = useState<PromotionRow[]>([]);
  const [meta, setMeta] = useState(emptyMeta);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmModalState | null>(null);

  const canManage = Boolean(user?.permissions.includes('settings.manage'));
  useEffect(() => {
    setUser(getStoredAdminUser());
  }, []);

  useEffect(() => {
    void loadPromotions();
  }, [currentPage]);

  async function loadPromotions(nextPage = currentPage) {
    setIsLoading(true);
    setMessage(null);

    const params = new URLSearchParams({ page: String(nextPage), limit: String(pageSize) });
    if (searchTerm.trim()) params.set('search', searchTerm.trim());
    if (statusFilter) params.set('status', statusFilter);

    try {
      const result = await adminApiRequest<PromotionsResponse>(`/points/promotions?${params.toString()}`);
      setPromotions(result.data);
      setMeta(result.meta);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudieron cargar las promociones.') });
    } finally {
      setIsLoading(false);
    }
  }

  function setFilter(update: () => void) {
    update();
    setCurrentPage(1);
  }

  function finishPromotion(promotion: PromotionRow) {
    setConfirmState({
      title: '¿Finalizar esta promoción?',
      description: `Se finalizará la promoción "${promotion.name}" y dejará de aplicarse a nuevas compras.`,
      confirmLabel: 'Finalizar',
      onConfirm: () => void applyFinishPromotion(promotion),
    });
  }

  async function applyFinishPromotion(promotion: PromotionRow) {
    setConfirmState(null);
    setIsSubmitting(true);
    setMessage(null);

    try {
      await adminApiRequest(`/points/promotions/${promotion.id}/finish`, { method: 'POST' });
      await loadPromotions();
      setMessage({ type: 'success', text: 'Promocion finalizada correctamente.' });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo finalizar la promocion.') });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AdminRoutedShell title="Parametros / Promociones">
      <section className="customer-dashboard-toolbar">
        <span />
        {canManage ? <Link className="admin-primary" href="/parametros/promociones/nuevo"><Plus size={16} /> Nuevo</Link> : null}
      </section>

      {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}

      <article className="panel table-panel wide-panel customer-table-panel">
        <div className="panel-header customer-table-header">
          <div><h2><Megaphone size={24} /> Tabla de promociones</h2></div>
          <span className="count-pill">{formatNumber(meta.total)}</span>
        </div>

        <div className="customer-table-toolbar">
          <label className="customer-search">
            <input aria-label="Buscar promociones" value={searchTerm} onChange={(event) => setFilter(() => setSearchTerm(event.target.value))} placeholder="Buscar promocion..." />
            <Search size={18} />
          </label>
          <select aria-label="Filtrar por estado" value={statusFilter} onChange={(event) => setFilter(() => setStatusFilter(event.target.value))}>
            <option value="">Estado: Todos</option>
            <option value="ACTIVE">Activa</option>
            <option value="ENDED">Finalizada</option>
            <option value="INACTIVE">Inactiva</option>
          </select>
          <button className="admin-secondary" onClick={() => void loadPromotions(1)} type="button">Filtrar</button>
        </div>

        <table className="customer-records-table transactions-records-table">
          <thead>
            <tr>
              <th>Promocion</th>
              <th>Tipo</th>
              <th>Beneficio</th>
              <th>Publico</th>
              <th>Tiendas</th>
              <th>Minimo</th>
              <th>Inicio</th>
              <th>Finalizacion</th>
              <th>Estado</th>
              <th>Creacion</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {promotions.map((promotion) => (
              <tr key={promotion.id}>
                <td><span className="table-main-text">{promotion.name}</span></td>
                <td>{typeLabel(promotion.type)}</td>
                <td>{promotion.bonusPoints ? `+${formatNumber(promotion.bonusPoints)} pts` : `${promotion.multiplier ?? '1'}x`}</td>
                <td>{promotion.targetLevels?.length ? promotion.targetLevels.join(', ') : 'Todos'}</td>
                <td>{promotion.store ? `${promotion.store.name} (${promotion.store.code})` : 'Todas'}</td>
                <td>{promotion.minimumAmount ? `Q${formatMoney(promotion.minimumAmount)}` : '-'}</td>
                <td>{formatDate(promotion.startsAt)}</td>
                <td>{formatDate(promotion.endsAt)}</td>
                <td><span className={promotion.status === 'ACTIVE' ? 'badge green' : 'badge red'}>{statusLabel(promotion.status)}</span></td>
                <td>{formatDate(promotion.createdAt)}</td>
                <td>
                  <div className="customer-actions">
                    <Link aria-label={`Ver promocion ${promotion.name}`} className="customer-icon-action" href={`/parametros/promociones/${promotion.id}`}><Eye size={16} /></Link>
                    {canManage && promotion.status === 'ACTIVE' ? (
                      <button aria-label={`Finalizar promocion ${promotion.name}`} className="customer-icon-action" disabled={isSubmitting} onClick={() => void finishPromotion(promotion)} type="button"><RefreshCcw size={16} /></button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && promotions.length === 0 ? <tr><td colSpan={11}>No hay promociones registradas.</td></tr> : null}
            {isLoading ? <tr><td colSpan={11}>Cargando promociones...</td></tr> : null}
          </tbody>
        </table>

        <div className="customer-table-footer">
          <span>Pagina {formatNumber(meta.page)} de {formatNumber(meta.totalPages)}</span>
          <div className="customer-pagination">
            <button disabled={meta.page <= 1 || isLoading} onClick={() => setCurrentPage((value) => Math.max(1, value - 1))} type="button">‹</button>
            <button className="active" type="button">{formatNumber(meta.page)}</button>
            <button disabled={meta.page >= meta.totalPages || isLoading} onClick={() => setCurrentPage((value) => value + 1)} type="button">›</button>
          </div>
        </div>
      </article>
      {confirmState ? (
        <ConfirmModal state={confirmState} onClose={() => setConfirmState(null)} isSubmitting={isSubmitting} />
      ) : null}
    </AdminRoutedShell>
  );
}
