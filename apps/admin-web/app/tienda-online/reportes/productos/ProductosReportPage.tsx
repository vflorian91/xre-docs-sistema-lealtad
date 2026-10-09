'use client';

import { Package } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import AdminRoutedShell from '../../../AdminRoutedShell';
import { adminApiRequest, getErrorText, getStoredAdminUser } from '../../../lib/adminApi';
import { exportRowsToXlsx } from '../../../lib/exportExcel';
import { formatMoney, formatNumber } from '../../../lib/format';
import { hasPermission } from '../../../lib/permissions';
import ReportFiltersBar from '../components/ReportFiltersBar';
import ReportNav from '../components/ReportNav';

type ProductRow = {
  productId: string;
  name: string;
  brand: string;
  sku: string | null;
  unitsSold: number;
  amountSold: number;
  ordersCount: number;
  stockQuantity: number;
  isActive: boolean;
  isVisibleInStore: boolean;
};

type ProductsResponse = {
  data: ProductRow[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  metrics: {
    productosVendidos: number;
    unidadesVendidas: number;
    montoVendido: number;
    productoMasVendido: { name: string; unitsSold: number } | null;
    productoMayorIngreso: { name: string; amountSold: number } | null;
    productosSinVenta: number;
    productosBajoStock: number;
  };
};

const emptyFilters = { dateFrom: '', dateTo: '', status: '', isVisible: '', search: '' };

function buildQuery(filters: typeof emptyFilters, page: number) {
  const params = new URLSearchParams({ page: String(page), pageSize: '10' });
  Object.entries(filters).forEach(([key, value]) => { if (value.trim()) params.set(key, value.trim()); });
  return params.toString();
}

export default function ProductosReportPage() {
  const canExport = hasPermission(getStoredAdminUser()?.permissions, 'store_reports.export');
  const [filters, setFilters] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [report, setReport] = useState<ProductsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setMessage(null);
    adminApiRequest<ProductsResponse>(`/admin/store/reports/products?${buildQuery(applied, page)}`)
      .then(setReport)
      .catch((error) => setMessage({ type: 'error', text: getErrorText(error, 'No se pudo cargar el reporte de productos.') }))
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
      const full = await adminApiRequest<ProductsResponse>(`/admin/store/reports/products?${buildQuery(applied, 1)}&pageSize=5000`);
      const rows = [
        ['Producto', 'Marca', 'SKU', 'Unidades vendidas', 'Monto vendido', 'Pedidos', 'Stock actual', 'Activo', 'Visible'],
        ...full.data.map((row) => [row.name, row.brand, row.sku ?? '', row.unitsSold, row.amountSold, row.ordersCount, row.stockQuantity, row.isActive ? 'Si' : 'No', row.isVisibleInStore ? 'Si' : 'No']),
      ];
      await exportRowsToXlsx('reporte-productos-tienda-online.xlsx', 'Productos', rows);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo exportar el reporte.') });
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <AdminRoutedShell title="Tienda Online">
      <ReportNav activeHref="/tienda-online/reportes/productos" permissions={getStoredAdminUser()?.permissions} />

      <section className="report-generator-panel">
        <div className="panel-header"><h2><Package size={20} /> Productos</h2></div>
        <ReportFiltersBar canExport={canExport} isExporting={isExporting} onExport={() => void exportReport()} onSubmit={submit}>
          <label><span>Desde</span><input onChange={(event) => setFilters({ ...filters, dateFrom: event.target.value })} type="date" value={filters.dateFrom} /></label>
          <label><span>Hasta</span><input onChange={(event) => setFilters({ ...filters, dateTo: event.target.value })} type="date" value={filters.dateTo} /></label>
          <label><span>Estado</span>
            <select onChange={(event) => setFilters({ ...filters, status: event.target.value })} value={filters.status}>
              <option value="">Todos</option>
              <option value="ACTIVO">Activo</option>
              <option value="INACTIVO">Inactivo</option>
            </select>
          </label>
          <label><span>Visible</span>
            <select onChange={(event) => setFilters({ ...filters, isVisible: event.target.value })} value={filters.isVisible}>
              <option value="">Todos</option>
              <option value="true">Visible en tienda</option>
              <option value="false">Oculto</option>
            </select>
          </label>
          <label><span>Buscar</span><input onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Producto, SKU o marca" value={filters.search} /></label>
        </ReportFiltersBar>
        {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}
      </section>

      {report ? (
        <section className="reports-phase-one">
          <div className="report-metrics-grid">
            <article className="report-metric-card"><span>Productos vendidos</span><strong>{formatNumber(report.metrics.productosVendidos)}</strong></article>
            <article className="report-metric-card"><span>Unidades vendidas</span><strong>{formatNumber(report.metrics.unidadesVendidas)}</strong></article>
            <article className="report-metric-card"><span>Monto vendido</span><strong>Q{formatMoney(report.metrics.montoVendido)}</strong></article>
            <article className="report-metric-card"><span>Más vendido</span><strong>{report.metrics.productoMasVendido?.name ?? '-'}</strong>{report.metrics.productoMasVendido ? <small>{formatNumber(report.metrics.productoMasVendido.unitsSold)} u.</small> : null}</article>
            <article className="report-metric-card"><span>Mayor ingreso</span><strong>{report.metrics.productoMayorIngreso?.name ?? '-'}</strong>{report.metrics.productoMayorIngreso ? <small>Q{formatMoney(report.metrics.productoMayorIngreso.amountSold)}</small> : null}</article>
            <article className="report-metric-card"><span>Sin venta</span><strong>{formatNumber(report.metrics.productosSinVenta)}</strong></article>
            <article className="report-metric-card"><span>Bajo stock</span><strong>{formatNumber(report.metrics.productosBajoStock)}</strong></article>
          </div>

          <div className="report-table-scroll">
            <table className="report-preview-table">
              <thead>
                <tr><th>Producto</th><th>Marca</th><th>SKU</th><th>Unidades vendidas</th><th>Monto vendido</th><th>Pedidos</th><th>Stock</th><th>Estado</th><th>Visible</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {report.data.map((row) => (
                  <tr key={row.productId}>
                    <td>{row.name}</td>
                    <td>{row.brand}</td>
                    <td>{row.sku ?? '-'}</td>
                    <td>{formatNumber(row.unitsSold)}</td>
                    <td>Q{formatMoney(row.amountSold)}</td>
                    <td>{formatNumber(row.ordersCount)}</td>
                    <td>{formatNumber(row.stockQuantity)}</td>
                    <td><span className={row.isActive ? 'badge green' : 'badge red'}>{row.isActive ? 'Activo' : 'Inactivo'}</span></td>
                    <td><span className={row.isVisibleInStore ? 'badge green' : 'badge amber'}>{row.isVisibleInStore ? 'Visible' : 'Oculto'}</span></td>
                    <td><a href={`/tienda-online/productos/${row.productId}`}>Ver producto</a></td>
                  </tr>
                ))}
                {!isLoading && report.data.length === 0 ? <tr><td colSpan={10}>No hay productos con esos filtros.</td></tr> : null}
              </tbody>
            </table>
          </div>

          <div className="customer-table-footer">
            <span>Página {formatNumber(report.meta.page)} de {formatNumber(report.meta.totalPages)} — {formatNumber(report.meta.total)} productos</span>
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
