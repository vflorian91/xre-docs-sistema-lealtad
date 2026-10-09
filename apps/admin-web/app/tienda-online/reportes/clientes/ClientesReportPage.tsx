'use client';

import { Users } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import AdminRoutedShell from '../../../AdminRoutedShell';
import { adminApiRequest, getErrorText, getStoredAdminUser } from '../../../lib/adminApi';
import { exportRowsToXlsx } from '../../../lib/exportExcel';
import { formatDate, formatMoney, formatNumber } from '../../../lib/format';
import { hasPermission } from '../../../lib/permissions';
import ReportFiltersBar from '../components/ReportFiltersBar';
import ReportNav from '../components/ReportNav';

type CustomerRow = {
  customerId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  ordersCount: number;
  deliveredCount: number;
  cancelledOrNotDeliveredCount: number;
  totalAmountPurchased: number;
  lastOrderAt: string | null;
};

type CustomersResponse = {
  data: CustomerRow[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  metrics: {
    clientesCompradores: number;
    clientesConEntregados: number;
    clientesConPendientes: number;
    clientesRecurrentes: number;
    montoTotalComprado: number;
    ticketPromedioPorCliente: number;
  };
};

const emptyFilters = { dateFrom: '', dateTo: '', search: '', minAmount: '', minOrders: '' };

function buildQuery(filters: typeof emptyFilters, page: number) {
  const params = new URLSearchParams({ page: String(page), pageSize: '10' });
  Object.entries(filters).forEach(([key, value]) => { if (value.trim()) params.set(key, value.trim()); });
  return params.toString();
}

export default function ClientesReportPage() {
  const canExport = hasPermission(getStoredAdminUser()?.permissions, 'store_reports.export');
  const [filters, setFilters] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [report, setReport] = useState<CustomersResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setMessage(null);
    adminApiRequest<CustomersResponse>(`/admin/store/reports/customers?${buildQuery(applied, page)}`)
      .then(setReport)
      .catch((error) => setMessage({ type: 'error', text: getErrorText(error, 'No se pudo cargar el reporte de clientes.') }))
      .finally(() => setIsLoading(false));
  }, [applied, page]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setApplied({ ...filters });
  }

  async function exportReport() {
    setIsExporting(true);
    try {
      const full = await adminApiRequest<CustomersResponse>(`/admin/store/reports/customers?${buildQuery(applied, 1)}&pageSize=5000`);
      const rows = [
        ['Cliente', 'Correo', 'Telefono', 'Cantidad de pedidos', 'Pedidos entregados', 'Cancelados/no entregados', 'Monto total comprado', 'Ultimo pedido'],
        ...full.data.map((row) => [row.fullName, row.email ?? '', row.phone ?? '', row.ordersCount, row.deliveredCount, row.cancelledOrNotDeliveredCount, row.totalAmountPurchased, row.lastOrderAt ? formatDate(row.lastOrderAt) : '']),
      ];
      await exportRowsToXlsx('reporte-clientes-tienda-online.xlsx', 'Clientes', rows);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo exportar el reporte.') });
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <AdminRoutedShell title="Tienda Online">
      <ReportNav activeHref="/tienda-online/reportes/clientes" permissions={getStoredAdminUser()?.permissions} />

      <section className="report-generator-panel">
        <div className="panel-header"><h2><Users size={20} /> Clientes compradores</h2></div>
        <ReportFiltersBar canExport={canExport} isExporting={isExporting} onExport={() => void exportReport()} onSubmit={submit}>
          <label><span>Desde</span><input onChange={(event) => setFilters({ ...filters, dateFrom: event.target.value })} type="date" value={filters.dateFrom} /></label>
          <label><span>Hasta</span><input onChange={(event) => setFilters({ ...filters, dateTo: event.target.value })} type="date" value={filters.dateTo} /></label>
          <label><span>Monto mínimo</span><input onChange={(event) => setFilters({ ...filters, minAmount: event.target.value })} placeholder="Q" type="number" value={filters.minAmount} /></label>
          <label><span>Pedidos mínimos</span><input onChange={(event) => setFilters({ ...filters, minOrders: event.target.value })} type="number" value={filters.minOrders} /></label>
          <label><span>Buscar</span><input onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Nombre, correo, telefono o codigo" value={filters.search} /></label>
        </ReportFiltersBar>
        {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}
      </section>

      {report ? (
        <section className="reports-phase-one">
          <div className="report-metrics-grid">
            <article className="report-metric-card"><span>Clientes compradores</span><strong>{formatNumber(report.metrics.clientesCompradores)}</strong></article>
            <article className="report-metric-card"><span>Con entregados</span><strong>{formatNumber(report.metrics.clientesConEntregados)}</strong></article>
            <article className="report-metric-card"><span>Con pendientes</span><strong>{formatNumber(report.metrics.clientesConPendientes)}</strong></article>
            <article className="report-metric-card"><span>Recurrentes</span><strong>{formatNumber(report.metrics.clientesRecurrentes)}</strong></article>
            <article className="report-metric-card"><span>Monto total comprado</span><strong>Q{formatMoney(report.metrics.montoTotalComprado)}</strong></article>
            <article className="report-metric-card"><span>Ticket promedio por cliente</span><strong>Q{formatMoney(report.metrics.ticketPromedioPorCliente)}</strong></article>
          </div>

          <div className="report-table-scroll">
            <table className="report-preview-table">
              <thead>
                <tr><th>Cliente</th><th>Correo</th><th>Telefono</th><th>Pedidos</th><th>Entregados</th><th>Cancelados/no entregados</th><th>Monto comprado</th><th>Último pedido</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {report.data.map((row) => (
                  <tr key={row.customerId}>
                    <td>{row.fullName}</td>
                    <td>{row.email ?? '-'}</td>
                    <td>{row.phone ?? '-'}</td>
                    <td>{formatNumber(row.ordersCount)}</td>
                    <td>{formatNumber(row.deliveredCount)}</td>
                    <td>{formatNumber(row.cancelledOrNotDeliveredCount)}</td>
                    <td>Q{formatMoney(row.totalAmountPurchased)}</td>
                    <td>{row.lastOrderAt ? formatDate(row.lastOrderAt) : '-'}</td>
                    <td><a href={`/clientes/${row.customerId}`}>Ver cliente</a></td>
                  </tr>
                ))}
                {!isLoading && report.data.length === 0 ? <tr><td colSpan={9}>No hay clientes con esos filtros.</td></tr> : null}
              </tbody>
            </table>
          </div>

          <div className="customer-table-footer">
            <span>Página {formatNumber(report.meta.page)} de {formatNumber(report.meta.totalPages)} — {formatNumber(report.meta.total)} clientes</span>
            <div className="customer-pagination">
              <button disabled={report.meta.page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} type="button">‹</button>
              <button disabled={report.meta.page === report.meta.totalPages} onClick={() => setPage((value) => Math.min(report.meta.totalPages, value + 1))} type="button">›</button>
            </div>
          </div>
        </section>
      ) : null}
    </AdminRoutedShell>
  );
}
