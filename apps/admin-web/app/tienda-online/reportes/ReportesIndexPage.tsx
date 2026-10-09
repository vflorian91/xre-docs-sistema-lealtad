'use client';

import { BarChart3 } from 'lucide-react';
import { useEffect, useState } from 'react';
import AdminRoutedShell from '../../AdminRoutedShell';
import { adminApiRequest, getErrorText, getStoredAdminUser } from '../../lib/adminApi';
import { formatMoney, formatNumber } from '../../lib/format';
import { DELIVERY_STATUS_LABELS, ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS } from '../pedidos/components/OrderStatusBadges';
import { SettlementStatusBadge } from '../liquidaciones-cobros/components/SettlementStatusBadges';
import ReportNav from './components/ReportNav';

type Summary = {
  totalVendido: number;
  pedidosTotales: number;
  pedidosEntregados: number;
  pedidosPendientes: number;
  pagosConfirmados: number;
  pendienteLiquidar: number;
  liquidadoEsteMes: number;
  incidenciasCobro: number;
  productosVendidos: number;
  clientesCompradores: number;
  ventasPorMetodoPago: Array<{ paymentMethod: string; amount: number }>;
  pedidosPorEstado: Array<{ status: string; count: number }>;
  entregasPorEstado: Array<{ status: string; count: number }>;
  topProductos: Array<{ productId: string; name: string; unitsSold: number; amount: number }>;
  topClientes: Array<{ customerId: string; fullName: string; orders: number; amount: number }>;
  liquidacionesRecientes: Array<{ id: string; settlementNumber: string; settlementDate: string; status: string; totalAmount: number }>;
};

function BarList({ rows }: { rows: Array<{ label: string; value: number; display: string }> }) {
  const max = Math.max(...rows.map((row) => Math.abs(row.value)), 1);
  return (
    <div className="report-bar-list">
      {rows.map((row) => (
        <div className="report-bar-row" key={row.label}>
          <div><span>{row.label}</span><strong>{row.display}</strong></div>
          <div className="report-bar-track"><span style={{ width: `${Math.max(2, (Math.abs(row.value) / max) * 100)}%` }} /></div>
        </div>
      ))}
      {rows.length === 0 ? <p className="muted-copy">Sin datos en este período.</p> : null}
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <article className="report-metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </article>
  );
}

export default function ReportesIndexPage() {
  const permissions = getStoredAdminUser()?.permissions;
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    adminApiRequest<Summary>('/admin/store/reports/summary')
      .then(setSummary)
      .catch((error) => setMessage({ type: 'error', text: getErrorText(error, 'No se pudo cargar el resumen de reportes.') }))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <AdminRoutedShell title="Tienda Online">
      <section className="report-generator-panel">
        <div className="panel-header">
          <h2><BarChart3 size={20} /> Reportes de Tienda Online</h2>
        </div>
        <ReportNav permissions={permissions} />
      </section>

      {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}
      {isLoading ? <div className="form-success">Cargando resumen...</div> : null}

      {summary ? (
        <section className="reports-phase-one">
          <div className="report-metrics-grid">
            <Metric label="Total vendido" value={`Q${formatMoney(summary.totalVendido)}`} />
            <Metric label="Pedidos totales" value={formatNumber(summary.pedidosTotales)} />
            <Metric label="Pedidos entregados" value={formatNumber(summary.pedidosEntregados)} />
            <Metric label="Pedidos pendientes" value={formatNumber(summary.pedidosPendientes)} />
            <Metric label="Pagos confirmados" value={formatNumber(summary.pagosConfirmados)} />
            <Metric label="Pendiente de liquidar" value={`Q${formatMoney(summary.pendienteLiquidar)}`} />
            <Metric label="Liquidado este mes" value={`Q${formatMoney(summary.liquidadoEsteMes)}`} />
            <Metric label="Incidencias de cobro" value={formatNumber(summary.incidenciasCobro)} />
            <Metric label="Productos vendidos" value={formatNumber(summary.productosVendidos)} />
            <Metric label="Clientes compradores" value={formatNumber(summary.clientesCompradores)} />
          </div>

          <div className="report-preview-panel">
            <div className="report-summary-grid-2">
              <div>
                <h3>Ventas por método de pago</h3>
                <BarList rows={summary.ventasPorMetodoPago.map((row) => ({ label: PAYMENT_METHOD_LABELS[row.paymentMethod] ?? row.paymentMethod, value: row.amount, display: `Q${formatMoney(row.amount)}` }))} />
              </div>
              <div>
                <h3>Pedidos por estado</h3>
                <BarList rows={summary.pedidosPorEstado.map((row) => ({ label: ORDER_STATUS_LABELS[row.status] ?? row.status, value: row.count, display: formatNumber(row.count) }))} />
              </div>
              <div>
                <h3>Entregas por estado</h3>
                <BarList rows={summary.entregasPorEstado.map((row) => ({ label: DELIVERY_STATUS_LABELS[row.status] ?? row.status, value: row.count, display: formatNumber(row.count) }))} />
              </div>
              <div>
                <h3>Top productos vendidos</h3>
                <BarList rows={summary.topProductos.map((row) => ({ label: row.name, value: row.unitsSold, display: `${formatNumber(row.unitsSold)} u.` }))} />
              </div>
              <div>
                <h3>Top clientes compradores</h3>
                <BarList rows={summary.topClientes.map((row) => ({ label: row.fullName, value: row.amount, display: `Q${formatMoney(row.amount)}` }))} />
              </div>
              <div>
                <h3>Liquidaciones recientes</h3>
                <div className="report-table-scroll">
                  <table className="report-preview-table">
                    <thead><tr><th>No.</th><th>Fecha</th><th>Estado</th><th>Monto</th></tr></thead>
                    <tbody>
                      {summary.liquidacionesRecientes.map((row) => (
                        <tr key={row.id}>
                          <td><a href={`/tienda-online/liquidaciones-cobros/${row.id}`}>{row.settlementNumber}</a></td>
                          <td>{new Date(row.settlementDate).toLocaleDateString('es-GT')}</td>
                          <td><SettlementStatusBadge status={row.status} /></td>
                          <td>Q{formatMoney(row.totalAmount)}</td>
                        </tr>
                      ))}
                      {summary.liquidacionesRecientes.length === 0 ? <tr><td colSpan={4}>Sin liquidaciones recientes.</td></tr> : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </AdminRoutedShell>
  );
}
