'use client';

import { ClipboardList } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import AdminRoutedShell from '../../AdminRoutedShell';
import { adminApiRequest, getErrorText } from '../../lib/adminApi';
import { formatNumber } from '../../lib/format';
import OrderFilters, { initialOrderFilters, OrderFiltersState } from './components/OrderFilters';
import OrderTable, { OrderRow } from './components/OrderTable';
import './pedidos.css';

type PaginatedOrders = {
  data: OrderRow[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

const pageSize = 10;

function buildQuery(filters: OrderFiltersState, page: number) {
  const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
  Object.entries(filters).forEach(([key, value]) => {
    if (value.trim()) params.set(key, value.trim());
  });
  return params.toString();
}

export default function PedidosPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: pageSize, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [filters, setFilters] = useState<OrderFiltersState>(initialOrderFilters);
  const [appliedFilters, setAppliedFilters] = useState<OrderFiltersState>(initialOrderFilters);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    void loadOrders(currentPage, appliedFilters);
  }, [currentPage, appliedFilters]);

  async function loadOrders(page: number, nextFilters: OrderFiltersState) {
    setIsLoading(true);
    setMessage(null);

    try {
      const result = await adminApiRequest<PaginatedOrders>(`/admin/store/orders?${buildQuery(nextFilters, page)}`);
      setOrders(result.data);
      setMeta({ page: result.meta.page, limit: result.meta.limit, total: result.meta.total, totalPages: result.meta.totalPages });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudieron cargar los pedidos.') });
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

      <article className="panel table-panel wide-panel customer-table-panel">
        <div className="panel-header customer-table-header">
          <div><h2><ClipboardList size={24} /> Pedidos de tienda online</h2></div>
        </div>

        <OrderFilters filters={filters} onChange={setFilters} onSubmit={submitFilters} />

        <OrderTable isLoading={isLoading} orders={orders} />

        <div className="customer-table-footer">
          <span>Mostrando pagina {formatNumber(meta.page)} de {formatNumber(meta.totalPages)} - {formatNumber(meta.total)} pedidos</span>
          <div className="customer-pagination">
            <button disabled={meta.page === 1 || isLoading} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} type="button">‹</button>
            <button disabled={meta.page === meta.totalPages || isLoading} onClick={() => setCurrentPage((page) => Math.min(meta.totalPages, page + 1))} type="button">›</button>
          </div>
        </div>
      </article>
    </AdminRoutedShell>
  );
}
