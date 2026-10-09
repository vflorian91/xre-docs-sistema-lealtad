'use client';

import { ShoppingCart } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import AdminRoutedShell from '../../../AdminRoutedShell';
import { adminApiRequest, getErrorText, getStoredAdminUser } from '../../../lib/adminApi';
import { exportRowsToXlsx } from '../../../lib/exportExcel';
import { formatDate, formatMoney, formatNumber } from '../../../lib/format';
import { hasPermission } from '../../../lib/permissions';
import { ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from '../../pedidos/components/OrderStatusBadges';
import { DELIVERY_STATUS_LABELS, OrderStatusBadge, PaymentStatusBadge, DeliveryStatusBadge } from '../../pedidos/components/OrderStatusBadges';
import ReportFiltersBar from '../components/ReportFiltersBar';
import ReportNav from '../components/ReportNav';

type SaleRow = {
  orderId: string;
  orderNumber: string;
  createdAt: string;
  customer: { fullName: string };
  paymentMethodRequested: string;
  orderStatus: string;
  clientPaymentStatus: string;
  deliveryStatus: string;
  subtotalAmount: number;
  totalAmount: number;
};

type SalesResponse = {
  data: SaleRow[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  metrics: {
    totalVendido: number;
    cantidadPedidos: number;
    ticketPromedio: number;
    pedidosSolicitados: number;
    pedidosConfirmados: number;
    pedidosEntregados: number;
    pedidosCancelados: number;
    pedidosNoEntregados: number;
  };
};

const emptyFilters = { dateFrom: '', dateTo: '', orderStatus: '', paymentStatus: '', deliveryStatus: '', paymentMethod: '', search: '' };

function buildQuery(filters: typeof emptyFilters, page: number) {
  const params = new URLSearchParams({ page: String(page), pageSize: '10' });
  Object.entries(filters).forEach(([key, value]) => { if (value.trim()) params.set(key, value.trim()); });
  return params.toString();
}

export default function VentasReportPage() {
  const canExport = hasPermission(getStoredAdminUser()?.permissions, 'store_reports.export');
  const [filters, setFilters] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [report, setReport] = useState<SalesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setMessage(null);
    adminApiRequest<SalesResponse>(`/admin/store/reports/sales?${buildQuery(applied, page)}`)
      .then(setReport)
      .catch((error) => setMessage({ type: 'error', text: getErrorText(error, 'No se pudo cargar el reporte de ventas.') }))
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
      const full = await adminApiRequest<SalesResponse>(`/admin/store/reports/sales?${buildQuery(applied, 1)}&pageSize=5000`);
      const rows = [
        ['No. pedido', 'Fecha', 'Cliente', 'Metodo de pago', 'Estado pedido', 'Estado pago', 'Estado entrega', 'Subtotal', 'Total'],
        ...full.data.map((row) => [row.orderNumber, formatDate(row.createdAt), row.customer.fullName, PAYMENT_METHOD_LABELS[row.paymentMethodRequested] ?? row.paymentMethodRequested, ORDER_STATUS_LABELS[row.orderStatus] ?? row.orderStatus, PAYMENT_STATUS_LABELS[row.clientPaymentStatus] ?? row.clientPaymentStatus, DELIVERY_STATUS_LABELS[row.deliveryStatus] ?? row.deliveryStatus, row.subtotalAmount, row.totalAmount]),
      ];
      await exportRowsToXlsx('reporte-ventas-tienda-online.xlsx', 'Ventas', rows);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo exportar el reporte.') });
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <AdminRoutedShell title="Tienda Online">
      <ReportNav activeHref="/tienda-online/reportes/ventas" permissions={getStoredAdminUser()?.permissions} />

      <section className="report-generator-panel">
        <div className="panel-header"><h2><ShoppingCart size={20} /> Ventas y pedidos</h2></div>
        <ReportFiltersBar canExport={canExport} isExporting={isExporting} onExport={() => void exportReport()} onSubmit={submit}>
          <label><span>Desde</span><input onChange={(event) => setFilters({ ...filters, dateFrom: event.target.value })} type="date" value={filters.dateFrom} /></label>
          <label><span>Hasta</span><input onChange={(event) => setFilters({ ...filters, dateTo: event.target.value })} type="date" value={filters.dateTo} /></label>
          <label><span>Estado pedido</span>
            <select onChange={(event) => setFilters({ ...filters, orderStatus: event.target.value })} value={filters.orderStatus}>
              <option value="">Todos</option>
              {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label><span>Estado pago</span>
            <select onChange={(event) => setFilters({ ...filters, paymentStatus: event.target.value })} value={filters.paymentStatus}>
              <option value="">Todos</option>
              {Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label><span>Estado entrega</span>
            <select onChange={(event) => setFilters({ ...filters, deliveryStatus: event.target.value })} value={filters.deliveryStatus}>
              <option value="">Todos</option>
              {Object.entries(DELIVERY_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label><span>Metodo de pago</span>
            <select onChange={(event) => setFilters({ ...filters, paymentMethod: event.target.value })} value={filters.paymentMethod}>
              <option value="">Todos</option>
              <option value="EFECTIVO_CONTRA_ENTREGA">Efectivo contra entrega</option>
              <option value="VISA_LINK_MANUAL">Visa Link</option>
              <option value="TRANSFERENCIA_BANCARIA">Transferencia bancaria</option>
              <option value="DEPOSITO_BANCARIO">Deposito bancario</option>
            </select>
          </label>
          <label><span>Buscar</span><input onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="No. pedido, cliente, correo o telefono" value={filters.search} /></label>
        </ReportFiltersBar>
        {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}
      </section>

      {report ? (
        <section className="reports-phase-one">
          <div className="report-metrics-grid">
            <article className="report-metric-card"><span>Total vendido</span><strong>Q{formatMoney(report.metrics.totalVendido)}</strong></article>
            <article className="report-metric-card"><span>Cantidad de pedidos</span><strong>{formatNumber(report.metrics.cantidadPedidos)}</strong></article>
            <article className="report-metric-card"><span>Ticket promedio</span><strong>Q{formatMoney(report.metrics.ticketPromedio)}</strong></article>
            <article className="report-metric-card"><span>Solicitados</span><strong>{formatNumber(report.metrics.pedidosSolicitados)}</strong></article>
            <article className="report-metric-card"><span>Confirmados</span><strong>{formatNumber(report.metrics.pedidosConfirmados)}</strong></article>
            <article className="report-metric-card"><span>Entregados</span><strong>{formatNumber(report.metrics.pedidosEntregados)}</strong></article>
            <article className="report-metric-card"><span>Cancelados</span><strong>{formatNumber(report.metrics.pedidosCancelados)}</strong></article>
            <article className="report-metric-card"><span>No entregados</span><strong>{formatNumber(report.metrics.pedidosNoEntregados)}</strong></article>
          </div>

          <div className="report-table-scroll">
            <table className="report-preview-table">
              <thead>
                <tr><th>No. pedido</th><th>Fecha</th><th>Cliente</th><th>Metodo de pago</th><th>Estado pedido</th><th>Estado pago</th><th>Estado entrega</th><th>Subtotal</th><th>Total</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {report.data.map((row) => (
                  <tr key={row.orderId}>
                    <td>{row.orderNumber}</td>
                    <td>{formatDate(row.createdAt)}</td>
                    <td>{row.customer.fullName}</td>
                    <td>{PAYMENT_METHOD_LABELS[row.paymentMethodRequested] ?? row.paymentMethodRequested}</td>
                    <td><OrderStatusBadge status={row.orderStatus} /></td>
                    <td><PaymentStatusBadge status={row.clientPaymentStatus} /></td>
                    <td><DeliveryStatusBadge status={row.deliveryStatus} /></td>
                    <td>Q{formatMoney(row.subtotalAmount)}</td>
                    <td>Q{formatMoney(row.totalAmount)}</td>
                    <td><a href={`/tienda-online/pedidos/${row.orderId}`}>Ver pedido</a></td>
                  </tr>
                ))}
                {!isLoading && report.data.length === 0 ? <tr><td colSpan={10}>No hay pedidos con esos filtros.</td></tr> : null}
              </tbody>
            </table>
          </div>

          <div className="customer-table-footer">
            <span>Página {formatNumber(report.meta.page)} de {formatNumber(report.meta.totalPages)} — {formatNumber(report.meta.total)} pedidos</span>
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
