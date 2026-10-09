'use client';

import { Truck } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import AdminRoutedShell from '../../../AdminRoutedShell';
import { adminApiRequest, getErrorText, getStoredAdminUser } from '../../../lib/adminApi';
import { exportRowsToXlsx } from '../../../lib/exportExcel';
import { formatDate, formatNumber } from '../../../lib/format';
import { hasPermission } from '../../../lib/permissions';
import { DELIVERY_STATUS_LABELS, DeliveryStatusBadge, ORDER_STATUS_LABELS, OrderStatusBadge } from '../../pedidos/components/OrderStatusBadges';
import ReportFiltersBar from '../components/ReportFiltersBar';
import ReportNav from '../components/ReportNav';

type DeliveryRow = {
  orderId: string;
  orderNumber: string;
  customer: { fullName: string };
  driver: { id: string; fullName: string } | null;
  confirmedDeliveryDate: string | null;
  deliveryTimeRange: string | null;
  deliveryStatus: string;
  orderStatus: string;
  deliveredAt: string | null;
  failureReason: string | null;
};

type DeliveriesResponse = {
  data: DeliveryRow[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  metrics: {
    programadas: number;
    asignadas: number;
    enRuta: number;
    entregadas: number;
    noEntregadas: number;
    reprogramadas: number;
    canceladas: number;
    tiempoPromedioEntregaHoras: number | null;
  };
};

const emptyFilters = { dateFrom: '', dateTo: '', deliveryStatus: '', search: '' };

function buildQuery(filters: typeof emptyFilters, page: number) {
  const params = new URLSearchParams({ page: String(page), pageSize: '10' });
  Object.entries(filters).forEach(([key, value]) => { if (value.trim()) params.set(key, value.trim()); });
  return params.toString();
}

export default function EntregasReportPage() {
  const canExport = hasPermission(getStoredAdminUser()?.permissions, 'store_reports.export');
  const [filters, setFilters] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [report, setReport] = useState<DeliveriesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setMessage(null);
    adminApiRequest<DeliveriesResponse>(`/admin/store/reports/deliveries?${buildQuery(applied, page)}`)
      .then(setReport)
      .catch((error) => setMessage({ type: 'error', text: getErrorText(error, 'No se pudo cargar el reporte de entregas.') }))
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
      const full = await adminApiRequest<DeliveriesResponse>(`/admin/store/reports/deliveries?${buildQuery(applied, 1)}&pageSize=5000`);
      const rows = [
        ['No. pedido', 'Cliente', 'Mensajero', 'Fecha programada', 'Rango horario', 'Estado entrega', 'Estado pedido', 'Fecha entrega', 'Motivo no entrega'],
        ...full.data.map((row) => [row.orderNumber, row.customer.fullName, row.driver?.fullName ?? '', row.confirmedDeliveryDate ? formatDate(row.confirmedDeliveryDate) : '', row.deliveryTimeRange ?? '', DELIVERY_STATUS_LABELS[row.deliveryStatus] ?? row.deliveryStatus, ORDER_STATUS_LABELS[row.orderStatus] ?? row.orderStatus, row.deliveredAt ? formatDate(row.deliveredAt) : '', row.failureReason ?? '']),
      ];
      await exportRowsToXlsx('reporte-entregas-tienda-online.xlsx', 'Entregas', rows);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo exportar el reporte.') });
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <AdminRoutedShell title="Tienda Online">
      <ReportNav activeHref="/tienda-online/reportes/entregas" permissions={getStoredAdminUser()?.permissions} />

      <section className="report-generator-panel">
        <div className="panel-header"><h2><Truck size={20} /> Entregas</h2></div>
        <ReportFiltersBar canExport={canExport} isExporting={isExporting} onExport={() => void exportReport()} onSubmit={submit}>
          <label><span>Desde</span><input onChange={(event) => setFilters({ ...filters, dateFrom: event.target.value })} type="date" value={filters.dateFrom} /></label>
          <label><span>Hasta</span><input onChange={(event) => setFilters({ ...filters, dateTo: event.target.value })} type="date" value={filters.dateTo} /></label>
          <label><span>Estado entrega</span>
            <select onChange={(event) => setFilters({ ...filters, deliveryStatus: event.target.value })} value={filters.deliveryStatus}>
              <option value="">Todos</option>
              {Object.entries(DELIVERY_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label><span>Buscar</span><input onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Pedido, cliente o mensajero" value={filters.search} /></label>
        </ReportFiltersBar>
        {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}
      </section>

      {report ? (
        <section className="reports-phase-one">
          <div className="report-metrics-grid">
            <article className="report-metric-card"><span>Programadas</span><strong>{formatNumber(report.metrics.programadas)}</strong></article>
            <article className="report-metric-card"><span>Asignadas</span><strong>{formatNumber(report.metrics.asignadas)}</strong></article>
            <article className="report-metric-card"><span>En ruta</span><strong>{formatNumber(report.metrics.enRuta)}</strong></article>
            <article className="report-metric-card"><span>Entregadas</span><strong>{formatNumber(report.metrics.entregadas)}</strong></article>
            <article className="report-metric-card"><span>No entregadas</span><strong>{formatNumber(report.metrics.noEntregadas)}</strong></article>
            <article className="report-metric-card"><span>Reprogramadas</span><strong>{formatNumber(report.metrics.reprogramadas)}</strong></article>
            <article className="report-metric-card"><span>Canceladas</span><strong>{formatNumber(report.metrics.canceladas)}</strong></article>
            <article className="report-metric-card"><span>Tiempo promedio de entrega</span><strong>{report.metrics.tiempoPromedioEntregaHoras != null ? `${formatNumber(Math.round(report.metrics.tiempoPromedioEntregaHoras))} h` : '-'}</strong></article>
          </div>

          <div className="report-table-scroll">
            <table className="report-preview-table">
              <thead>
                <tr><th>No. pedido</th><th>Cliente</th><th>Mensajero</th><th>Fecha programada</th><th>Rango horario</th><th>Estado entrega</th><th>Estado pedido</th><th>Fecha entrega</th><th>Motivo no entrega</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {report.data.map((row) => (
                  <tr key={row.orderId}>
                    <td>{row.orderNumber}</td>
                    <td>{row.customer.fullName}</td>
                    <td>{row.driver?.fullName ?? 'Sin asignar'}</td>
                    <td>{row.confirmedDeliveryDate ? formatDate(row.confirmedDeliveryDate) : '-'}</td>
                    <td>{row.deliveryTimeRange ?? '-'}</td>
                    <td><DeliveryStatusBadge status={row.deliveryStatus} /></td>
                    <td><OrderStatusBadge status={row.orderStatus} /></td>
                    <td>{row.deliveredAt ? formatDate(row.deliveredAt) : '-'}</td>
                    <td>{row.failureReason || '-'}</td>
                    <td>
                      <a href={`/tienda-online/pedidos/${row.orderId}`}>Ver pedido</a>
                      {row.driver ? <> · <a href={`/tienda-online/mensajeros/${row.driver.id}`}>Ver mensajero</a></> : null}
                    </td>
                  </tr>
                ))}
                {!isLoading && report.data.length === 0 ? <tr><td colSpan={10}>No hay entregas con esos filtros.</td></tr> : null}
              </tbody>
            </table>
          </div>

          <div className="customer-table-footer">
            <span>Página {formatNumber(report.meta.page)} de {formatNumber(report.meta.totalPages)} — {formatNumber(report.meta.total)} entregas</span>
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
