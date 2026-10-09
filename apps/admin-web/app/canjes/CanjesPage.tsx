'use client';

import { Eye, Search } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import AdminRoutedShell from '../AdminRoutedShell';
import { adminApiRequest, getErrorText } from '../lib/adminApi';
import { formatDate, formatNumber } from '../lib/format';

type RedemptionRequestStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'SENT_TO_STORE' | 'READY' | 'DELIVERED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';

type RedemptionRow = {
  id: string;
  requestCode: string;
  status: RedemptionRequestStatus;
  productNameSnapshot: string;
  requestedAt: string;
  deliveredAt?: string | null;
  customer: {
    id: string;
    fullName: string;
  };
  product: {
    id: string;
    name: string;
    requiresApproval?: boolean;
  };
  pickupStore?: {
    id: string;
    name: string;
  } | null;
};

type PaginatedRedemptions = {
  data: RedemptionRow[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

type RedemptionFilters = {
  requestCode: string;
  customer: string;
  product: string;
  store: string;
  status: '' | RedemptionRequestStatus;
  requestedAt: string;
  deliveredAt: string;
};

const STATUS_LABELS: Record<RedemptionRequestStatus, string> = {
  PENDING_APPROVAL: 'Pendiente de aprobación',
  APPROVED: 'Aprobado',
  SENT_TO_STORE: 'Enviado a tienda',
  READY: 'Listo para recoger',
  DELIVERED: 'Entregado',
  REJECTED: 'Rechazado',
  CANCELLED: 'Cancelado',
  EXPIRED: 'Vencido',
};

const pageSize = 10;

const initialFilters: RedemptionFilters = {
  requestCode: '',
  customer: '',
  product: '',
  store: '',
  status: '',
  requestedAt: '',
  deliveredAt: '',
};

function redemptionStatusClass(status: RedemptionRequestStatus) {
  if (status === 'DELIVERED') return 'badge green';
  if (status === 'READY' || status === 'APPROVED' || status === 'SENT_TO_STORE') return 'badge blue';
  if (status === 'PENDING_APPROVAL') return 'badge amber';
  return 'badge red';
}

function buildRedemptionsQuery(filters: RedemptionFilters, page: number) {
  const params = new URLSearchParams({ take: String(pageSize), page: String(page) });

  Object.entries(filters).forEach(([key, value]) => {
    const trimmed = value.trim();
    if (trimmed) params.set(key, trimmed);
  });

  return params.toString();
}

function requiresApproval(redemption: RedemptionRow) {
  return redemption.product.requiresApproval !== false;
}

export default function CanjesPage() {
  const [redemptions, setRedemptions] = useState<RedemptionRow[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: pageSize, total: 0, totalPages: 1 });
  const [filters, setFilters] = useState<RedemptionFilters>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<RedemptionFilters>(initialFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    void loadRedemptions(currentPage, appliedFilters);
  }, [currentPage, appliedFilters]);

  async function loadRedemptions(page: number, nextFilters: RedemptionFilters) {
    setIsLoading(true);
    setMessage(null);

    try {
      const result = await adminApiRequest<PaginatedRedemptions>(`/redemptions?${buildRedemptionsQuery(nextFilters, page)}`);
      setRedemptions(result.data);
      setMeta(result.meta);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudieron cargar las solicitudes de canje.') });
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
    <AdminRoutedShell title="Solicitudes de Canje">
      {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}

      <article className="panel table-panel wide-panel customer-table-panel redemptions-table-panel">
        <div className="panel-header customer-table-header">
          <div><h2>Tabla de solicitudes de canje</h2></div>
        </div>

        <form className="customer-table-toolbar redemptions-filter-toolbar" onSubmit={submitFilters}>
          <label className="customer-filter-field">
            <span>Canje</span>
            <input value={filters.requestCode} onChange={(event) => setFilters({ ...filters, requestCode: event.target.value })} placeholder="Código" />
          </label>
          <label className="customer-filter-field">
            <span>Cliente</span>
            <input value={filters.customer} onChange={(event) => setFilters({ ...filters, customer: event.target.value })} placeholder="Nombre" />
          </label>
          <label className="customer-filter-field">
            <span>Producto</span>
            <input value={filters.product} onChange={(event) => setFilters({ ...filters, product: event.target.value })} placeholder="Producto" />
          </label>
          <label className="customer-filter-field">
            <span>Tienda</span>
            <input value={filters.store} onChange={(event) => setFilters({ ...filters, store: event.target.value })} placeholder="Tienda" />
          </label>
          <label className="customer-filter-field">
            <span>Estado</span>
            <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value as RedemptionFilters['status'] })}>
              <option value="">Todos</option>
              <option value="PENDING_APPROVAL">Pendiente</option>
              <option value="APPROVED">Aprobado</option>
              <option value="SENT_TO_STORE">Enviado</option>
              <option value="READY">Listo</option>
              <option value="DELIVERED">Entregado</option>
              <option value="REJECTED">Rechazado</option>
              <option value="CANCELLED">Cancelado</option>
              <option value="EXPIRED">Vencido</option>
            </select>
          </label>
          <label className="customer-filter-field">
            <span>Fecha solicitud</span>
            <input type="date" value={filters.requestedAt} onChange={(event) => setFilters({ ...filters, requestedAt: event.target.value })} />
          </label>
          <label className="customer-filter-field">
            <span>Fecha entrega</span>
            <input type="date" value={filters.deliveredAt} onChange={(event) => setFilters({ ...filters, deliveredAt: event.target.value })} />
          </label>
          <button className="admin-primary customer-filter-submit table-filter-search-button" type="submit">
            <Search size={16} /> Buscar
          </button>
        </form>

        <table className="customer-records-table redemptions-records-table">
          <thead>
            <tr>
              <th>Canje</th>
              <th>Cliente</th>
              <th>Producto</th>
              <th>Tienda</th>
              <th>Estado</th>
              <th>Fecha de solicitud</th>
              <th>Fecha de entrega</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {redemptions.map((redemption) => (
              <tr key={redemption.id}>
                <td><span className="table-main-text">{redemption.requestCode}</span></td>
                <td>{redemption.customer.fullName}</td>
                <td>{redemption.productNameSnapshot || redemption.product.name}</td>
                <td>{requiresApproval(redemption) ? redemption.pickupStore?.name || '-' : '-'}</td>
                <td><span className={redemptionStatusClass(redemption.status)}>{STATUS_LABELS[redemption.status]}</span></td>
                <td>{formatDate(redemption.requestedAt)}</td>
                <td>{requiresApproval(redemption) && redemption.deliveredAt ? formatDate(redemption.deliveredAt) : '-'}</td>
                <td>
                  <div className="customer-actions">
                    <a aria-label={`Ver solicitud ${redemption.requestCode}`} className="customer-icon-action" href={`/canjes/${redemption.id}`}><Eye size={16} /></a>
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && redemptions.length === 0 ? <tr><td colSpan={8}>No hay solicitudes de canje con los filtros actuales.</td></tr> : null}
            {isLoading ? <tr><td colSpan={8}>Cargando solicitudes de canje...</td></tr> : null}
          </tbody>
        </table>

        <div className="customer-table-footer">
          <span>Mostrando página {formatNumber(meta.page)} de {formatNumber(meta.totalPages)} · {formatNumber(meta.total)} solicitudes</span>
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
