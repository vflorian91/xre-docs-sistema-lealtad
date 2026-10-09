'use client';

import { BarChart3, Download, FileSpreadsheet, RefreshCcw } from 'lucide-react';
import { FormEvent, ReactNode, useEffect, useState } from 'react';
import AdminRoutedShell from '../AdminRoutedShell';
import { adminApiRequest, getErrorText } from '../lib/adminApi';
import { exportRowsToXlsx } from '../lib/exportExcel';
import { formatMoney, formatNumber } from '../lib/format';

type Breakdown = { status: string; purchases?: number; customers?: number; requests?: number; salesAmount?: string; points?: number; pointsReserved?: number };

type AdminReports = {
  generatedAt: string;
  range: { from: string; to: string; label: string };
  selectedStoreId: string | null;
  availableStores: Array<{ id: string; code: string; name: string; status: string }>;
  totals: {
    purchases: number;
    salesAmount: string;
    averageTicket: string;
    pointsIssued: number;
    customersRegistered: number;
    activeCustomers: number;
    redemptions: number;
    pointsReserved: number;
  };
  byStore: Array<{
    storeId: string;
    storeCode: string;
    storeName: string;
    purchases: number;
    salesAmount: string;
    pointsIssued: number;
    averageTicket: string;
    customersRegistered: number;
    redemptions: number;
    pointsReserved: number;
  }>;
  topCustomers: Array<{
    customerId: string;
    customerCode: string;
    fullName: string;
    phone: string;
    purchases: number;
    salesAmount: string;
    pointsIssued: number;
  }>;
  dailySales: Array<{ date: string; purchases: number; salesAmount: string; points: number; newCustomers: number; redemptions: number }>;
  pointBreakdown: Array<{ type: string; movements: number; points: number }>;
  purchaseStatusBreakdown: Breakdown[];
  customerStatusBreakdown: Breakdown[];
  redemptionBreakdown: Breakdown[];
};

type ReportType = 'summary' | 'daily-activity' | 'store-performance' | 'customer-activity' | 'point-movements' | 'redemptions';

const reportCatalog: Array<{ value: ReportType; label: string; sheetName: string }> = [
  { value: 'summary', label: 'Resumen operativo', sheetName: 'Resumen' },
  { value: 'daily-activity', label: 'Actividad diaria', sheetName: 'Actividad diaria' },
  { value: 'store-performance', label: 'Desempeño por tienda', sheetName: 'Tiendas' },
  { value: 'customer-activity', label: 'Actividad de clientes', sheetName: 'Clientes' },
  { value: 'point-movements', label: 'Movimientos de puntos', sheetName: 'Puntos' },
  { value: 'redemptions', label: 'Canjes', sheetName: 'Canjes' },
];

const movementLabels: Record<string, string> = {
  PURCHASE_EARNED: 'Puntos por compras',
  PURCHASE_REVERSED: 'Puntos revertidos',
  POINT_CONVERTED_TO_BALANCE: 'Convertidos a saldo',
  ADMIN_ADJUSTMENT_POSITIVE: 'Ajustes positivos',
  ADMIN_ADJUSTMENT_NEGATIVE: 'Ajustes negativos',
  REDEMPTION_RESERVED: 'Reservados para canje',
  REDEMPTION_USED: 'Utilizados en canjes',
  REDEMPTION_RELEASED: 'Liberados de canjes',
  EXPIRED: 'Vencidos',
};

const statusLabels: Record<string, string> = {
  ACTIVE: 'Activos', INACTIVE: 'Inactivos', BLOCKED: 'Bloqueados',
  APPROVED: 'Aprobadas', PENDING_REVIEW: 'Pendientes', REJECTED: 'Rechazadas', REVERSED: 'Anuladas',
  READY: 'Listos', DELIVERED: 'Entregados', CANCELLED: 'Cancelados', EXPIRED: 'Vencidos',
};

function toInputDate(date: Date) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 10);
}

function defaultStartDate() {
  const date = new Date();
  date.setDate(date.getDate() - 29);
  return toInputDate(date);
}

function labelStatus(value: string) {
  return statusLabels[value] ?? value;
}

function buildReportRows(reportType: ReportType, report: AdminReports): Array<Array<string | number>> {
  if (reportType === 'summary') {
    return [
      ['Indicador', 'Valor'],
      ['Período', report.range.label],
      ['Compras aprobadas', report.totals.purchases],
      ['Monto vendido', Number(report.totals.salesAmount)],
      ['Ticket promedio', Number(report.totals.averageTicket)],
      ['Clientes compradores', report.totals.activeCustomers],
      ['Clientes nuevos', report.totals.customersRegistered],
      ['Puntos emitidos', report.totals.pointsIssued],
      ['Solicitudes de canje', report.totals.redemptions],
      ['Puntos reservados', report.totals.pointsReserved],
    ];
  }
  if (reportType === 'daily-activity') {
    return [['Fecha', 'Compras', 'Ventas', 'Puntos', 'Clientes nuevos', 'Canjes'], ...report.dailySales.map((row) => [row.date, row.purchases, Number(row.salesAmount), row.points, row.newCustomers, row.redemptions])];
  }
  if (reportType === 'store-performance') {
    return [['Tienda', 'Código', 'Compras', 'Ventas', 'Ticket promedio', 'Clientes nuevos', 'Puntos emitidos', 'Canjes'], ...report.byStore.map((row) => [row.storeName, row.storeCode, row.purchases, Number(row.salesAmount), Number(row.averageTicket), row.customersRegistered, row.pointsIssued, row.redemptions])];
  }
  if (reportType === 'customer-activity') {
    return [['Cliente', 'Código', 'Teléfono', 'Compras', 'Monto comprado', 'Puntos emitidos'], ...report.topCustomers.map((row) => [row.fullName, row.customerCode, row.phone, row.purchases, Number(row.salesAmount), row.pointsIssued])];
  }
  if (reportType === 'point-movements') {
    return [['Tipo', 'Movimientos', 'Puntos'], ...report.pointBreakdown.map((row) => [movementLabels[row.type] ?? row.type, row.movements, row.points])];
  }
  return [['Estado', 'Solicitudes', 'Puntos reservados'], ...report.redemptionBreakdown.map((row) => [labelStatus(row.status), row.requests ?? 0, row.pointsReserved ?? 0])];
}

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <article className="report-metric-card"><span>{label}</span><strong>{value}</strong>{detail ? <small>{detail}</small> : null}</article>;
}

function DataTable({ headers, children }: { headers: string[]; children: ReactNode }) {
  return <div className="report-table-scroll"><table className="report-preview-table"><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}

function BarList({ rows }: { rows: Array<{ label: string; value: number; display: string }> }) {
  const max = Math.max(...rows.map((row) => Math.abs(row.value)), 1);
  return <div className="report-bar-list">{rows.map((row) => <div className="report-bar-row" key={row.label}><div><span>{row.label}</span><strong>{row.display}</strong></div><div className="report-bar-track"><span style={{ width: `${Math.max(2, Math.abs(row.value) / max * 100)}%` }} /></div></div>)}</div>;
}

export default function ReportesPage() {
  const [reportType, setReportType] = useState<ReportType>('summary');
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(() => toInputDate(new Date()));
  const [storeId, setStoreId] = useState('');
  const [report, setReport] = useState<AdminReports | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function fetchReport() {
    if (!startDate || !endDate || startDate > endDate) throw new Error('El rango de fechas seleccionado no es válido.');
    const params = new URLSearchParams({ from: startDate, to: endDate });
    if (storeId) params.set('storeId', storeId);
    return adminApiRequest<AdminReports>(`/admin/reports?${params.toString()}`);
  }

  useEffect(() => {
    let active = true;
    void fetchReport().then((data) => { if (active) setReport(data); }).catch((error) => { if (active) setMessage({ type: 'error', text: getErrorText(error, 'No se pudieron cargar los reportes.') }); }).finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
    // La carga inicial usa el rango predeterminado; los cambios se aplican con Consultar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function consult(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setIsLoading(true);
    try { setReport(await fetchReport()); } catch (error) { setMessage({ type: 'error', text: getErrorText(error, 'No se pudo generar el reporte.') }); } finally { setIsLoading(false); }
  }

  async function exportExcel() {
    if (!report) return;
    setIsExporting(true);
    setMessage(null);
    try {
      const selected = reportCatalog.find((item) => item.value === reportType) ?? reportCatalog[0];
      await exportRowsToXlsx(`reporte-${reportType}-${startDate}-${endDate}.xlsx`, selected.sheetName, buildReportRows(reportType, report));
      setMessage({ type: 'success', text: 'Reporte Excel generado correctamente.' });
    } catch (error) { setMessage({ type: 'error', text: getErrorText(error, 'No se pudo exportar el reporte.') }); } finally { setIsExporting(false); }
  }

  return <AdminRoutedShell title="Reportes">
    <section className="customer-table-panel report-generator-panel">
      <div className="panel-header"><h2><FileSpreadsheet size={20} /> Reportes operativos</h2><button className="admin-secondary" disabled={!report || isExporting} onClick={() => void exportExcel()} type="button"><Download size={17} /> {isExporting ? 'Exportando...' : 'Exportar Excel'}</button></div>
      <form className="report-generator-form report-phase-one-filters" onSubmit={(event) => void consult(event)}>
        <label><span>Reporte</span><select value={reportType} onChange={(event) => setReportType(event.target.value as ReportType)}>{reportCatalog.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label><span>Tienda</span><select value={storeId} onChange={(event) => setStoreId(event.target.value)}><option value="">Todas las tiendas</option>{report?.availableStores.map((store) => <option key={store.id} value={store.id}>{store.name} · {store.code}</option>)}</select></label>
        <label><span>Desde</span><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
        <label><span>Hasta</span><input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
        <button className="admin-primary report-generator-submit" disabled={isLoading} type="submit"><RefreshCcw size={17} /> {isLoading ? 'Consultando...' : 'Consultar'}</button>
      </form>
      {message ? <div className={`form-${message.type} report-generator-message`}>{message.text}</div> : null}
    </section>

    {report ? <section className="reports-phase-one">
      <div className="report-context"><div><BarChart3 size={20} /><span>{reportCatalog.find((item) => item.value === reportType)?.label}</span></div><small>{report.range.label}</small></div>
      <div className="report-metrics-grid">
        <Metric label="Ventas" value={formatMoney(report.totals.salesAmount)} detail={`${formatNumber(report.totals.purchases)} compras`} />
        <Metric label="Ticket promedio" value={formatMoney(report.totals.averageTicket)} />
        <Metric label="Clientes compradores" value={formatNumber(report.totals.activeCustomers)} detail={`${formatNumber(report.totals.customersRegistered)} nuevos`} />
        <Metric label="Puntos emitidos" value={formatNumber(report.totals.pointsIssued)} />
        <Metric label="Canjes solicitados" value={formatNumber(report.totals.redemptions)} detail={`${formatNumber(report.totals.pointsReserved)} puntos`} />
      </div>

      <div className="report-preview-panel">
        {reportType === 'summary' ? <div className="report-summary-grid"><div><h3>Ventas por tienda</h3><BarList rows={report.byStore.slice(0, 10).map((row) => ({ label: row.storeName, value: Number(row.salesAmount), display: formatMoney(row.salesAmount) }))} /></div><div><h3>Estado de compras</h3><BarList rows={report.purchaseStatusBreakdown.map((row) => ({ label: labelStatus(row.status), value: row.purchases ?? 0, display: formatNumber(row.purchases ?? 0) }))} /></div></div> : null}
        {reportType === 'daily-activity' ? <DataTable headers={['Fecha', 'Compras', 'Ventas', 'Clientes nuevos', 'Puntos', 'Canjes']}>{report.dailySales.map((row) => <tr key={row.date}><td>{row.date}</td><td>{formatNumber(row.purchases)}</td><td>{formatMoney(row.salesAmount)}</td><td>{formatNumber(row.newCustomers)}</td><td>{formatNumber(row.points)}</td><td>{formatNumber(row.redemptions)}</td></tr>)}</DataTable> : null}
        {reportType === 'store-performance' ? <DataTable headers={['Tienda', 'Compras', 'Ventas', 'Ticket', 'Clientes nuevos', 'Puntos', 'Canjes']}>{report.byStore.map((row) => <tr key={row.storeId}><td><strong>{row.storeName}</strong><small>{row.storeCode}</small></td><td>{formatNumber(row.purchases)}</td><td>{formatMoney(row.salesAmount)}</td><td>{formatMoney(row.averageTicket)}</td><td>{formatNumber(row.customersRegistered)}</td><td>{formatNumber(row.pointsIssued)}</td><td>{formatNumber(row.redemptions)}</td></tr>)}</DataTable> : null}
        {reportType === 'customer-activity' ? <><div className="report-inline-breakdown">{report.customerStatusBreakdown.map((row) => <Metric key={row.status} label={labelStatus(row.status)} value={formatNumber(row.customers ?? 0)} />)}</div><DataTable headers={['Cliente', 'Código', 'Teléfono', 'Compras', 'Monto', 'Puntos']}>{report.topCustomers.map((row) => <tr key={row.customerId}><td>{row.fullName}</td><td>{row.customerCode}</td><td>{row.phone || '—'}</td><td>{formatNumber(row.purchases)}</td><td>{formatMoney(row.salesAmount)}</td><td>{formatNumber(row.pointsIssued)}</td></tr>)}</DataTable></> : null}
        {reportType === 'point-movements' ? <BarList rows={report.pointBreakdown.map((row) => ({ label: movementLabels[row.type] ?? row.type, value: row.points, display: `${formatNumber(row.points)} pts · ${formatNumber(row.movements)} mov.` }))} /> : null}
        {reportType === 'redemptions' ? <DataTable headers={['Estado', 'Solicitudes', 'Puntos reservados']}>{report.redemptionBreakdown.map((row) => <tr key={row.status}><td>{labelStatus(row.status)}</td><td>{formatNumber(row.requests ?? 0)}</td><td>{formatNumber(row.pointsReserved ?? 0)}</td></tr>)}</DataTable> : null}
      </div>
    </section> : null}
  </AdminRoutedShell>;
}
