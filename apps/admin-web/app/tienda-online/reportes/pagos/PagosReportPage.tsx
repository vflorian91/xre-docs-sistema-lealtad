'use client';

import { CreditCard, FileText } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import AdminRoutedShell from '../../../AdminRoutedShell';
import { absoluteMediaUrl, adminApiRequest, getErrorText, getStoredAdminUser } from '../../../lib/adminApi';
import { exportRowsToXlsx } from '../../../lib/exportExcel';
import { formatDate, formatMoney, formatNumber } from '../../../lib/format';
import { hasPermission } from '../../../lib/permissions';
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, PaymentStatusBadge } from '../../pedidos/components/OrderStatusBadges';
import { PaymentSettlementStatusBadge } from '../../liquidaciones-cobros/components/SettlementStatusBadges';
import ReportFiltersBar from '../components/ReportFiltersBar';
import ReportNav from '../components/ReportNav';

type PaymentRow = {
  paymentId: string;
  orderId: string;
  orderNumber: string;
  customer: { fullName: string };
  paymentMethod: string;
  amount: number;
  paymentStatus: string;
  settlementStatus: string;
  settlementId: string | null;
  referenceNumber: string | null;
  authorizationCode: string | null;
  paidAt: string | null;
  receiptFileUrl: string | null;
  receiptFileName: string | null;
};

type PaymentsResponse = {
  data: PaymentRow[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  metrics: {
    totalConfirmados: number;
    montoConfirmado: number;
    pendienteDePago: number;
    pendienteDeConfirmacion: number;
    rechazadosNoPagados: number;
    pendienteLiquidar: number;
    liquidado: number;
    conIncidencia: number;
  };
};

const emptyFilters = { dateFrom: '', dateTo: '', paymentMethod: '', paymentStatus: '', settlementStatus: '', search: '' };

function buildQuery(filters: typeof emptyFilters, page: number) {
  const params = new URLSearchParams({ page: String(page), pageSize: '10' });
  Object.entries(filters).forEach(([key, value]) => { if (value.trim()) params.set(key, value.trim()); });
  return params.toString();
}

export default function PagosReportPage() {
  const canExport = hasPermission(getStoredAdminUser()?.permissions, 'store_reports.export');
  const [filters, setFilters] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [report, setReport] = useState<PaymentsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setMessage(null);
    adminApiRequest<PaymentsResponse>(`/admin/store/reports/payments?${buildQuery(applied, page)}`)
      .then(setReport)
      .catch((error) => setMessage({ type: 'error', text: getErrorText(error, 'No se pudo cargar el reporte de pagos.') }))
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
      const full = await adminApiRequest<PaymentsResponse>(`/admin/store/reports/payments?${buildQuery(applied, 1)}&pageSize=5000`);
      const rows = [
        ['No. pedido', 'Cliente', 'Metodo de pago', 'Monto', 'Estado pago', 'Estado liquidacion', 'Referencia', 'Autorizacion', 'Fecha de pago'],
        ...full.data.map((row) => [row.orderNumber, row.customer.fullName, PAYMENT_METHOD_LABELS[row.paymentMethod] ?? row.paymentMethod, row.amount, PAYMENT_STATUS_LABELS[row.paymentStatus] ?? row.paymentStatus, row.settlementStatus, row.referenceNumber ?? '', row.authorizationCode ?? '', row.paidAt ? formatDate(row.paidAt) : '']),
      ];
      await exportRowsToXlsx('reporte-pagos-tienda-online.xlsx', 'Pagos', rows);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo exportar el reporte.') });
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <AdminRoutedShell title="Tienda Online">
      <ReportNav activeHref="/tienda-online/reportes/pagos" permissions={getStoredAdminUser()?.permissions} />

      <section className="report-generator-panel">
        <div className="panel-header"><h2><CreditCard size={20} /> Pagos</h2></div>
        <ReportFiltersBar canExport={canExport} isExporting={isExporting} onExport={() => void exportReport()} onSubmit={submit}>
          <label><span>Desde</span><input onChange={(event) => setFilters({ ...filters, dateFrom: event.target.value })} type="date" value={filters.dateFrom} /></label>
          <label><span>Hasta</span><input onChange={(event) => setFilters({ ...filters, dateTo: event.target.value })} type="date" value={filters.dateTo} /></label>
          <label><span>Metodo de pago</span>
            <select onChange={(event) => setFilters({ ...filters, paymentMethod: event.target.value })} value={filters.paymentMethod}>
              <option value="">Todos</option>
              <option value="EFECTIVO_CONTRA_ENTREGA">Efectivo contra entrega</option>
              <option value="VISA_LINK_MANUAL">Visa Link</option>
              <option value="TRANSFERENCIA_BANCARIA">Transferencia bancaria</option>
              <option value="DEPOSITO_BANCARIO">Deposito bancario</option>
            </select>
          </label>
          <label><span>Estado pago</span>
            <select onChange={(event) => setFilters({ ...filters, paymentStatus: event.target.value })} value={filters.paymentStatus}>
              <option value="">Todos</option>
              {Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label><span>Estado liquidación</span>
            <select onChange={(event) => setFilters({ ...filters, settlementStatus: event.target.value })} value={filters.settlementStatus}>
              <option value="">Todos</option>
              <option value="PENDIENTE_LIQUIDAR">Pendiente</option>
              <option value="LIQUIDADO">Liquidado</option>
              <option value="CON_INCIDENCIA">Con incidencia</option>
              <option value="NO_APLICA">No aplica</option>
            </select>
          </label>
          <label><span>Buscar</span><input onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Pedido, cliente, referencia o autorizacion" value={filters.search} /></label>
        </ReportFiltersBar>
        {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}
      </section>

      {report ? (
        <section className="reports-phase-one">
          <div className="report-metrics-grid">
            <article className="report-metric-card"><span>Pagos confirmados</span><strong>{formatNumber(report.metrics.totalConfirmados)}</strong></article>
            <article className="report-metric-card"><span>Monto confirmado</span><strong>Q{formatMoney(report.metrics.montoConfirmado)}</strong></article>
            <article className="report-metric-card"><span>Pendiente de pago</span><strong>{formatNumber(report.metrics.pendienteDePago)}</strong></article>
            <article className="report-metric-card"><span>Pendiente de confirmación</span><strong>{formatNumber(report.metrics.pendienteDeConfirmacion)}</strong></article>
            <article className="report-metric-card"><span>Rechazados / no pagados</span><strong>{formatNumber(report.metrics.rechazadosNoPagados)}</strong></article>
            <article className="report-metric-card"><span>Pendiente de liquidar</span><strong>{formatNumber(report.metrics.pendienteLiquidar)}</strong></article>
            <article className="report-metric-card"><span>Liquidado</span><strong>{formatNumber(report.metrics.liquidado)}</strong></article>
            <article className="report-metric-card"><span>Con incidencia</span><strong>{formatNumber(report.metrics.conIncidencia)}</strong></article>
          </div>

          <div className="report-table-scroll">
            <table className="report-preview-table">
              <thead>
                <tr><th>No. pedido</th><th>Cliente</th><th>Metodo</th><th>Monto</th><th>Estado pago</th><th>Liquidación</th><th>Referencia</th><th>Autorizacion</th><th>Fecha pago</th><th>Comprobante</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {report.data.map((row) => (
                  <tr key={row.paymentId}>
                    <td>{row.orderNumber}</td>
                    <td>{row.customer.fullName}</td>
                    <td>{PAYMENT_METHOD_LABELS[row.paymentMethod] ?? row.paymentMethod}</td>
                    <td>Q{formatMoney(row.amount)}</td>
                    <td><PaymentStatusBadge status={row.paymentStatus} /></td>
                    <td><PaymentSettlementStatusBadge status={row.settlementStatus} /></td>
                    <td>{row.referenceNumber || '-'}</td>
                    <td>{row.authorizationCode || '-'}</td>
                    <td>{row.paidAt ? formatDate(row.paidAt) : '-'}</td>
                    <td>{row.receiptFileUrl ? <a href={absoluteMediaUrl(row.receiptFileUrl)} rel="noreferrer" target="_blank"><FileText size={14} /></a> : '-'}</td>
                    <td>
                      <a href={`/tienda-online/pedidos/${row.orderId}`}>Ver pedido</a>
                      {row.settlementId ? <> · <a href={`/tienda-online/liquidaciones-cobros/${row.settlementId}`}>Ver liquidación</a></> : null}
                    </td>
                  </tr>
                ))}
                {!isLoading && report.data.length === 0 ? <tr><td colSpan={11}>No hay pagos con esos filtros.</td></tr> : null}
              </tbody>
            </table>
          </div>

          <div className="customer-table-footer">
            <span>Página {formatNumber(report.meta.page)} de {formatNumber(report.meta.totalPages)} — {formatNumber(report.meta.total)} pagos</span>
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
