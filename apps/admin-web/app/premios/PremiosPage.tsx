'use client';

import { Eye, Gift, Pencil, Search } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import AdminRoutedShell from '../AdminRoutedShell';
import { adminApiRequest, getErrorText } from '../lib/adminApi';
import { formatNumber } from '../lib/format';

type RewardRow = {
  id: string;
  name: string;
  pointsValue: number;
  stock?: number | null;
  reservedStock: number;
  availableStock?: number | null;
  requiresApproval: boolean;
  isGiftCard: boolean;
  isPublished: boolean;
  productType?: string | null;
  genderTarget?: string | null;
};

type RewardFilters = {
  name: string;
  points: string;
  stock: string;
  available: string;
  published: '' | 'true' | 'false';
  flowType: '' | 'APPROVAL' | 'IMMEDIATE';
  rewardType: '' | 'GIFT_CARD' | 'PRODUCT';
  productType: string;
  genderTarget: string;
};

type PaginatedRewards = {
  data: RewardRow[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

const pageSize = 10;

const initialFilters: RewardFilters = {
  name: '',
  points: '',
  stock: '',
  available: '',
  published: '',
  flowType: '',
  rewardType: '',
  productType: '',
  genderTarget: '',
};

const PRODUCT_TYPE_OPTIONS = [
  ['DEPORTIVO', 'Deportivo'], ['CASUAL', 'Casual'], ['FORMAL', 'Formal'], ['RUNNING', 'Running'],
  ['URBANO', 'Urbano'], ['ROPA', 'Ropa'], ['ACCESORIO', 'Accesorio'], ['OTRO', 'Otro'],
] as const;
const GENDER_TARGET_OPTIONS = [
  ['HOMBRE', 'Hombre'], ['MUJER', 'Mujer'], ['NINO', 'Niño'], ['NINA', 'Niña'], ['UNISEX', 'Unisex'],
] as const;

function buildRewardsQuery(filters: RewardFilters, page: number) {
  const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });

  Object.entries(filters).forEach(([key, value]) => {
    const trimmed = value.trim();
    if (trimmed) params.set(key, trimmed);
  });

  return params.toString();
}

function stockLabel(value?: number | null) {
  return value == null ? 'Sin límite' : formatNumber(value);
}

function flowLabel(reward: RewardRow) {
  return reward.requiresApproval ? 'Con aprobación' : 'Inmediato';
}

function rewardTypeLabel(reward: RewardRow) {
  return reward.isGiftCard ? 'Tarjeta de regalo' : 'Producto';
}

export default function PremiosPage() {
  const [rewards, setRewards] = useState<RewardRow[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: pageSize, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [filters, setFilters] = useState<RewardFilters>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<RewardFilters>(initialFilters);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    void loadRewards(currentPage, appliedFilters);
  }, [currentPage, appliedFilters]);

  async function loadRewards(page: number, nextFilters: RewardFilters) {
    setIsLoading(true);
    setMessage(null);

    try {
      const result = await adminApiRequest<PaginatedRewards>(`/rewards?${buildRewardsQuery(nextFilters, page)}`);
      setRewards(result.data);
      setMeta(result.meta);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudieron cargar los premios.') });
    } finally {
      setIsLoading(false);
    }
  }

  function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCurrentPage(1);
    setAppliedFilters({ ...filters });
  }

  return (
    <AdminRoutedShell title="Premios">
      {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}

      <article className="panel table-panel wide-panel customer-table-panel rewards-table-panel">
        <div className="panel-header customer-table-header">
          <div><h2><Gift size={24} /> Tabla de premios</h2></div>
          <a className="admin-primary customer-action-button" href="/premios/nuevo">Nuevo premio</a>
        </div>

        <form className="customer-table-toolbar rewards-filter-toolbar" onSubmit={submitFilters}>
          <label className="customer-filter-field">
            <span>Premio</span>
            <input value={filters.name} onChange={(event) => setFilters({ ...filters, name: event.target.value })} placeholder="Título" />
          </label>
          <label className="customer-filter-field">
            <span>Puntos</span>
            <input min="0" inputMode="numeric" type="number" value={filters.points} onChange={(event) => setFilters({ ...filters, points: event.target.value })} placeholder="Mínimo" />
          </label>
          <label className="customer-filter-field">
            <span>Stock</span>
            <input min="0" inputMode="numeric" type="number" value={filters.stock} onChange={(event) => setFilters({ ...filters, stock: event.target.value })} placeholder="Mínimo" />
          </label>
          <label className="customer-filter-field">
            <span>Disponible</span>
            <input min="0" inputMode="numeric" type="number" value={filters.available} onChange={(event) => setFilters({ ...filters, available: event.target.value })} placeholder="Mínimo" />
          </label>
          <label className="customer-filter-field">
            <span>Publicado</span>
            <select value={filters.published} onChange={(event) => setFilters({ ...filters, published: event.target.value as RewardFilters['published'] })}>
              <option value="">Todos</option>
              <option value="true">Sí</option>
              <option value="false">No</option>
            </select>
          </label>
          <label className="customer-filter-field">
            <span>Tipo flujo</span>
            <select value={filters.flowType} onChange={(event) => setFilters({ ...filters, flowType: event.target.value as RewardFilters['flowType'] })}>
              <option value="">Todos</option>
              <option value="APPROVAL">Con aprobación</option>
              <option value="IMMEDIATE">Inmediato</option>
            </select>
          </label>
          <label className="customer-filter-field">
            <span>Tipo</span>
            <select value={filters.rewardType} onChange={(event) => setFilters({ ...filters, rewardType: event.target.value as RewardFilters['rewardType'] })}>
              <option value="">Todos</option>
              <option value="PRODUCT">Producto</option>
              <option value="GIFT_CARD">Tarjeta de regalo</option>
            </select>
          </label>
          <label className="customer-filter-field">
            <span>Tipo calzado</span>
            <select value={filters.productType} onChange={(event) => setFilters({ ...filters, productType: event.target.value })}>
              <option value="">Todos</option>
              {PRODUCT_TYPE_OPTIONS.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
            </select>
          </label>
          <label className="customer-filter-field">
            <span>Género</span>
            <select value={filters.genderTarget} onChange={(event) => setFilters({ ...filters, genderTarget: event.target.value })}>
              <option value="">Todos</option>
              {GENDER_TARGET_OPTIONS.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
            </select>
          </label>
          <button className="admin-primary customer-filter-submit table-filter-search-button" type="submit">
            <Search size={16} /> Buscar
          </button>
        </form>

        <table className="customer-records-table rewards-records-table">
          <thead>
            <tr>
              <th>Premio</th>
              <th>Puntos</th>
              <th>Stock</th>
              <th>Disponible</th>
              <th>Publicado</th>
              <th>Tipo flujo</th>
              <th>Tipo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rewards.map((reward) => (
              <tr key={reward.id}>
                <td><span className="table-main-text">{reward.name}</span></td>
                <td className="numeric-cell">{formatNumber(reward.pointsValue)}</td>
                <td className="numeric-cell">{stockLabel(reward.stock)}</td>
                <td className="numeric-cell">{stockLabel(reward.availableStock)}</td>
                <td><span className={reward.isPublished ? 'badge green' : 'badge red'}>{reward.isPublished ? 'Sí' : 'No'}</span></td>
                <td>{flowLabel(reward)}</td>
                <td>{rewardTypeLabel(reward)}</td>
                <td>
                  <div className="customer-actions">
                    <a aria-label={`Ver premio ${reward.name}`} className="customer-icon-action" href={`/premios/${reward.id}`}><Eye size={16} /></a>
                    <a aria-label={`Editar premio ${reward.name}`} className="customer-icon-action" href={`/premios/${reward.id}/editar`}><Pencil size={16} /></a>
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && rewards.length === 0 ? <tr><td colSpan={8}>No hay premios con esos filtros.</td></tr> : null}
            {isLoading ? <tr><td colSpan={8}>Cargando premios...</td></tr> : null}
          </tbody>
        </table>

        <div className="customer-table-footer">
          <span>Mostrando página {formatNumber(meta.page)} de {formatNumber(meta.totalPages)} · {formatNumber(meta.total)} premios</span>
          <div className="customer-pagination">
            <button disabled={meta.page === 1 || isLoading} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} type="button">‹</button>
            {pageWindow(meta.page, meta.totalPages).map((page) => (
              <button className={page === meta.page ? 'active' : ''} key={page} onClick={() => setCurrentPage(page)} type="button">{page}</button>
            ))}
            <button disabled={meta.page === meta.totalPages || isLoading} onClick={() => setCurrentPage((page) => Math.min(meta.totalPages, page + 1))} type="button">›</button>
          </div>
        </div>
      </article>
    </AdminRoutedShell>
  );
}

function pageWindow(page: number, totalPages: number) {
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}
