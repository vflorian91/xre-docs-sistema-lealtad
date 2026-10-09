'use client';

import { Eye, Megaphone, Pencil, Search } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import AdminRoutedShell from '../AdminRoutedShell';
import { adminApiRequest, getErrorText } from '../lib/adminApi';
import { formatNumber } from '../lib/format';

type BannerStatus = 'ACTIVE' | 'INACTIVE' | 'DRAFT';
type BannerPlacement = 'LOYALTY' | 'STORE';

type MarketingBannerRow = {
  id: string;
  title: string;
  status?: BannerStatus;
  isActive: boolean;
  totalViews?: number;
  totalClicks?: number;
};

type BannerFilters = {
  title: string;
  status: '' | BannerStatus;
  views: string;
  clicks: string;
  ctr: string;
};

type BannerListResponse = {
  data: MarketingBannerRow[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

const initialFilters: BannerFilters = {
  title: '',
  status: '',
  views: '',
  clicks: '',
  ctr: '',
};

const statusLabels: Record<BannerStatus, string> = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
  DRAFT: 'Borrador',
};

function getBannerStatus(banner: MarketingBannerRow): BannerStatus {
  if (banner.status) return banner.status;
  return banner.isActive ? 'ACTIVE' : 'INACTIVE';
}

function badgeClass(status: BannerStatus) {
  if (status === 'ACTIVE') return 'green';
  if (status === 'DRAFT') return 'amber';
  return 'red';
}

function ctr(totalViews = 0, totalClicks = 0) {
  if (!totalViews) return '0%';
  return `${((totalClicks / totalViews) * 100).toFixed(1)}%`;
}

function buildBannerQuery(filters: BannerFilters, page: number) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: '10',
  });

  Object.entries(filters).forEach(([key, value]) => {
    const trimmed = value.trim();
    if (trimmed) params.set(key, trimmed);
  });

  return params.toString();
}

function pageWindow(page: number, totalPages: number) {
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export default function BannersPage({
  basePath = '/banners',
  placement = 'LOYALTY',
  title = 'Banners',
}: {
  basePath?: string;
  placement?: BannerPlacement;
  title?: string;
}) {
  const [banners, setBanners] = useState<MarketingBannerRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [filters, setFilters] = useState<BannerFilters>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<BannerFilters>(initialFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 1 });

  useEffect(() => {
    void loadBanners(currentPage, appliedFilters);
  }, [currentPage, appliedFilters, placement]);

  async function loadBanners(page: number, nextFilters: BannerFilters) {
    setIsLoading(true);
    setMessage(null);

    try {
      const query = `${buildBannerQuery(nextFilters, page)}&placement=${placement}`;
      const result = await adminApiRequest<BannerListResponse>(`/marketing-banners?${query}`);
      setBanners(result.data);
      setMeta(result.meta);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudieron cargar los banners.') });
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
    <AdminRoutedShell title={title}>
      {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}

      <article className="panel table-panel wide-panel customer-table-panel banners-admin-panel">
        <div className="panel-header customer-table-header">
          <div><h2><Megaphone size={24} /> Tabla de banners</h2></div>
          <a className="admin-primary customer-action-button" href={`${basePath}/nuevo`}>Nuevo banner</a>
        </div>

        <form className="customer-table-toolbar banner-filter-toolbar" onSubmit={submitFilters}>
          <label className="customer-filter-field">
            <span>Título del banner</span>
            <input value={filters.title} onChange={(event) => setFilters({ ...filters, title: event.target.value })} placeholder="Título" />
          </label>
          <label className="customer-filter-field">
            <span>Estado</span>
            <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value as BannerFilters['status'] })}>
              <option value="">Todos</option>
              <option value="ACTIVE">Activo</option>
              <option value="INACTIVE">Inactivo</option>
              <option value="DRAFT">Borrador</option>
            </select>
          </label>
          <label className="customer-filter-field">
            <span>Visualizaciones</span>
            <input min="0" inputMode="numeric" type="number" value={filters.views} onChange={(event) => setFilters({ ...filters, views: event.target.value })} placeholder="Mínimo" />
          </label>
          <label className="customer-filter-field">
            <span>Clics</span>
            <input min="0" inputMode="numeric" type="number" value={filters.clicks} onChange={(event) => setFilters({ ...filters, clicks: event.target.value })} placeholder="Mínimo" />
          </label>
          <label className="customer-filter-field">
            <span>CTR</span>
            <input min="0" inputMode="decimal" step="0.1" type="number" value={filters.ctr} onChange={(event) => setFilters({ ...filters, ctr: event.target.value })} placeholder="Mín. %" />
          </label>
          <button className="admin-primary customer-filter-submit table-filter-search-button" type="submit">
            <Search size={16} /> Buscar
          </button>
        </form>

        <table className="customer-records-table banners-records-table">
          <thead>
            <tr>
              <th>Título del banner</th>
              <th>Estado</th>
              <th>Visualizaciones</th>
              <th>Clics</th>
              <th>CTR</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {banners.map((banner) => {
              const status = getBannerStatus(banner);
              const views = banner.totalViews ?? 0;
              const clicks = banner.totalClicks ?? 0;

              return (
                <tr key={banner.id}>
                  <td><span className="table-main-text">{banner.title}</span></td>
                  <td><span className={`badge ${badgeClass(status)}`}>{statusLabels[status]}</span></td>
                  <td className="numeric-cell">{formatNumber(views)}</td>
                  <td className="numeric-cell">{formatNumber(clicks)}</td>
                  <td className="numeric-cell">{ctr(views, clicks)}</td>
                  <td>
                    <div className="customer-actions">
                      <a title="Ver" aria-label={`Ver banner ${banner.title}`} className="customer-icon-action" href={`${basePath}/${banner.id}`}><Eye size={15} /></a>
                      <a title="Editar" aria-label={`Editar banner ${banner.title}`} className="customer-icon-action" href={`${basePath}/${banner.id}/editar`}><Pencil size={15} /></a>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!isLoading && banners.length === 0 ? <tr><td colSpan={6}>No hay banners con esos filtros.</td></tr> : null}
            {isLoading ? <tr><td colSpan={6}>Cargando banners...</td></tr> : null}
          </tbody>
        </table>

        <div className="customer-table-footer">
          <span>Mostrando página {formatNumber(meta.page)} de {formatNumber(meta.totalPages)} · {formatNumber(meta.total)} banners</span>
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
