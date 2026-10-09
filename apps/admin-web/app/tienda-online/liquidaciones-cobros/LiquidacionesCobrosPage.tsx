'use client';

import { Banknote, Download } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import AdminRoutedShell from '../../AdminRoutedShell';
import { adminApiRequest, getErrorText, getStoredAdminUser } from '../../lib/adminApi';
import { formatNumber } from '../../lib/format';
import { hasPermission } from '../../lib/permissions';
import '../pedidos/pedidos.css';
import SettlementFilters, { initialSettlementFilters, SettlementFiltersState } from './components/SettlementFilters';
import SettlementSummaryCards, { SettlementSummary } from './components/SettlementSummaryCards';
import SettlementTable, { SettlementRow } from './components/SettlementTable';

type PaginatedSettlements = {
  data: SettlementRow[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

const pageSize = 10;
const emptySummary: SettlementSummary = {
  totalPendingAmount: 0,
  totalPendingCount: 0,
  pendingEfectivo: 0,
  pendingVisaLink: 0,
  pendingTransferencia: 0,
  pendingDeposito: 0,
  totalSettledThisMonth: 0,
  activeSettlementsThisMonth: 0,
  incidentsCount: 0,
};

function buildQuery(filters: SettlementFiltersState, page: number) {
  const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
  Object.entries(filters).forEach(([key, value]) => {
    if (value.trim()) params.set(key, value.trim());
  });
  return params.toString();
}

export default function LiquidacionesCobrosPage() {
  const permissions = getStoredAdminUser()?.permissions;
  const canCreate = hasPermission(permissions, 'store_payment_settlements.create');
  const canExport = hasPermission(permissions, 'store_payment_settlements.export');

  const [settlements, setSettlements] = useState<SettlementRow[]>([]);
  const [summary, setSummary] = useState<SettlementSummary>(emptySummary);
  const [meta, setMeta] = useState({ page: 1, limit: pageSize, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [filters, setFilters] = useState<SettlementFiltersState>(initialSettlementFilters);
  const [appliedFilters, setAppliedFilters] = useState<SettlementFiltersState>(initialSettlementFilters);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    adminApiRequest<SettlementSummary>('/admin/store/payment-settlements/summary')
      .then((result) => setSummary(result))
      .catch(() => {});
  }, []);

  useEffect(() => {
    void loadSettlements(currentPage, appliedFilters);
  }, [currentPage, appliedFilters]);

  async function loadSettlements(page: number, nextFilters: SettlementFiltersState) {
    setIsLoading(true);
    setMessage(null);

    try {
      const result = await adminApiRequest<PaginatedSettlements>(`/admin/store/payment-settlements?${buildQuery(nextFilters, page)}`);
      setSettlements(result.data);
      setMeta(result.meta);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudieron cargar las liquidaciones.') });
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
    <AdminRoutedShell title="Tienda Online">
      {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}

      <SettlementSummaryCards summary={summary} />

      <article className="panel table-panel wide-panel customer-table-panel">
        <div className="panel-header customer-table-header">
          <div>
            <h2><Banknote size={24} /> Liquidación de Cobros</h2>
            <p className="muted-copy">Control de pagos confirmados pendientes de corte interno.</p>
          </div>
          <div className="customer-profile-actions">
            {canExport ? (
              <a className="admin-secondary customer-action-button" href={exportHref(appliedFilters)} target="_blank" rel="noreferrer">
                <Download size={16} /> Exportar
              </a>
            ) : null}
            {canCreate ? (
              <a className="admin-primary customer-action-button" href="/tienda-online/liquidaciones-cobros/nueva">Nueva liquidación</a>
            ) : null}
          </div>
        </div>

        <SettlementFilters filters={filters} onChange={setFilters} onSubmit={submitFilters} />

        <SettlementTable isLoading={isLoading} settlements={settlements} />

        <div className="customer-table-footer">
          <span>Mostrando pagina {formatNumber(meta.page)} de {formatNumber(meta.totalPages)} - {formatNumber(meta.total)} liquidaciones</span>
          <div className="customer-pagination">
            <button disabled={meta.page === 1 || isLoading} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} type="button">‹</button>
            <button disabled={meta.page === meta.totalPages || isLoading} onClick={() => setCurrentPage((page) => Math.min(meta.totalPages, page + 1))} type="button">›</button>
          </div>
        </div>
      </article>
    </AdminRoutedShell>
  );
}

function exportHref(filters: SettlementFiltersState) {
  const params = new URLSearchParams({ type: 'settlements' });
  Object.entries(filters).forEach(([key, value]) => {
    if (value.trim()) params.set(key, value.trim());
  });
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
  return `${base}/admin/store/payment-settlements/export?${params.toString()}`;
}
