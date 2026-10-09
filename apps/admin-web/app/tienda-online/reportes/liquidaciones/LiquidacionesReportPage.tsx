'use client';

import { ScrollText } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import AdminRoutedShell from '../../../AdminRoutedShell';
import { adminApiRequest, getErrorText, getStoredAdminUser } from '../../../lib/adminApi';
import { exportRowsToXlsx } from '../../../lib/exportExcel';
import { formatDate, formatMoney, formatNumber } from '../../../lib/format';
import { hasPermission } from '../../../lib/permissions';
import { PAYMENT_METHOD_LABELS } from '../../pedidos/components/OrderStatusBadges';
import { SettlementStatusBadge } from '../../liquidaciones-cobros/components/SettlementStatusBadges';
import ReportFiltersBar from '../components/ReportFiltersBar';
import ReportNav from '../components/ReportNav';

type SettlementRow = {
  id: string;
  settlementNumber: string;
  settlementDate: string;
  status: string;
  totalPayments: number;
  totalAmount: number;
  paymentMethod: string | null;
  reference: string | null;
  createdByName: string | null;
  createdAt: string;
};

type SettlementsResponse = {
  data: SettlementRow[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  metrics: {
    totalLiquidado: number;
    cantidadLiquidaciones: number;
    liquidacionesActivas: number;
    liquidacionesAnuladas: number;
    pagosLiquidados: number;
    montoAnulado: number;
    pendienteLiquidar: number;
    incidencias: number;
  };
};

const emptyFilters = { dateFrom: '', dateTo: '', settlementStatus: '', paymentMethod: '', search: '' };

function buildQuery(filters: typeof emptyFilters, page: number) {
  const params = new URLSearchParams({ page: String(page), pageSize: '10' });
  Object.entries(filters).forEach(([key, value]) => { if (value.trim()) params.set(key, value.trim()); });
  return params.toString();
}

export default function LiquidacionesReportPage() {
  const canExport = hasPermission(getStoredAdminUser()?.permissions, 'store_reports.export');
  const [filters, setFilters] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [report, setReport] = useState<SettlementsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setMessage(null);
    adminApiRequest<SettlementsResponse>(`/admin/store/reports/settlements?${buildQuery(applied, page)}`)
      .then(setReport)
      .catch((error) => setMessage({ type: 'error', text: getErrorText(error, 'No se pudo cargar el reporte de liquidaciones.') }))
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
      const full = await adminApiRequest<SettlementsResponse>(`/admin/store/reports/settlements?${buildQuery(applied, 1)}&pageSize=5000`);
      const rows = [
        ['No. liquidación', 'Fecha', 'Estado', 'Cantidad de pagos', 'Monto total', 'Métodos incluidos', 'Referencia', 'Creado por'],
        ...full.data.map((row) => [row.settlementNumber, formatDate(row.settlementDate), row.status, row.totalPayments, row.totalAmount, row.paymentMethod ? PAYMENT_METHOD_LABELS[row.paymentMethod] ?? row.paymentMethod : 'Mixto', row.reference ?? '', row.createdByName ?? '']),
      ];
      await exportRowsToXlsx('reporte-liquidaciones-tienda-online.xlsx', 'Liquidaciones', rows);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo exportar el reporte.') });
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <AdminRoutedShell title="Tienda Online">
      <ReportNav activeHref="/tienda-online/reportes/liquidaciones" permissions={getStoredAdminUser()?.permissions} />

      <section className="report-generator-panel">
        <div className="panel-header"><h2><ScrollText size={20} /> Liquidaciones</h2></div>
        <ReportFiltersBar canExport={canExport} isExporting={isExporting} onExport={() => void exportReport()} onSubmit={submit}>
          <label><span>Desde</span><input onChange={(event) => setFilters({ ...filters, dateFrom: event.target.value })} type="date" value={filters.dateFrom} /></label>
          <label><span>Hasta</span><input onChange={(event) => setFilters({ ...filters, dateTo: event.target.value })} type="date" value={filters.dateTo} /></label>
          <label><span>Estado</span>
            <select onChange={(event) => setFilters({ ...filters, settlementStatus: event.target.value })} value={filters.settlementStatus}>
              <option value="">Todos</option>
              <option value="ACTIVA">Activa</option>
              <option value="ANULADA">Anulada</option>
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
          <label><span>Buscar</span><input onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="No. liquidacion o referencia" value={filters.search} /></label>
        </ReportFiltersBar>
        {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}
      </section>

      {report ? (
        <section className="reports-phase-one">
          <div className="report-metrics-grid">
            <article className="report-metric-card"><span>Total liquidado</span><strong>Q{formatMoney(report.metrics.totalLiquidado)}</strong></article>
            <article className="report-metric-card"><span>Cantidad de liquidaciones</span><strong>{formatNumber(report.metrics.cantidadLiquidaciones)}</strong></article>
            <article className="report-metric-card"><span>Activas</span><strong>{formatNumber(report.metrics.liquidacionesActivas)}</strong></article>
            <article className="report-metric-card"><span>Anuladas</span><strong>{formatNumber(report.metrics.liquidacionesAnuladas)}</strong></article>
            <article className="report-metric-card"><span>Pagos liquidados</span><strong>{formatNumber(report.metrics.pagosLiquidados)}</strong></article>
            <article className="report-metric-card"><span>Monto anulado</span><strong>Q{formatMoney(report.metrics.montoAnulado)}</strong></article>
            <article className="report-metric-card"><span>Pendiente de liquidar</span><strong>Q{formatMoney(report.metrics.pendienteLiquidar)}</strong></article>
            <article className="report-metric-card"><span>Incidencias</span><strong>{formatNumber(report.metrics.incidencias)}</strong></article>
          </div>

          <div className="report-table-scroll">
            <table className="report-preview-table">
              <thead>
                <tr><th>No. liquidación</th><th>Fecha</th><th>Estado</th><th>Cantidad de pagos</th><th>Monto total</th><th>Metodos incluidos</th><th>Referencia</th><th>Creado por</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {report.data.map((row) => (
                  <tr key={row.id}>
                    <td>{row.settlementNumber}</td>
                    <td>{formatDate(row.settlementDate)}</td>
                    <td><SettlementStatusBadge status={row.status} /></td>
                    <td>{row.totalPayments}</td>
                    <td>Q{formatMoney(row.totalAmount)}</td>
                    <td>{row.paymentMethod ? PAYMENT_METHOD_LABELS[row.paymentMethod] ?? row.paymentMethod : 'Mixto'}</td>
                    <td>{row.reference || '-'}</td>
                    <td>{row.createdByName ?? '-'}</td>
                    <td><a href={`/tienda-online/liquidaciones-cobros/${row.id}`}>Ver liquidación</a></td>
                  </tr>
                ))}
                {!isLoading && report.data.length === 0 ? <tr><td colSpan={9}>No hay liquidaciones con esos filtros.</td></tr> : null}
              </tbody>
            </table>
          </div>

          <div className="customer-table-footer">
            <span>Página {formatNumber(report.meta.page)} de {formatNumber(report.meta.totalPages)} — {formatNumber(report.meta.total)} liquidaciones</span>
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
