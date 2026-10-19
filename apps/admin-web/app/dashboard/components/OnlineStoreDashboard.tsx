import { AlertCircle, Box, CheckSquare, Coins, CreditCard, Package, Truck } from 'lucide-react';
import { formatDate, formatMoney, formatNumber, formatTime } from '../../lib/format';
import { AlertsCard, DashboardDonutChart, DashboardLineChart, DashboardMetricCard, DashboardTable, StatusBadge } from './DashboardWidgets';
import type { ChartSeries, DonutItem, MetricItem, StoreDeliveriesResponse, StorePaymentsResponse, StoreProductsResponse, StoreSaleRow, StoreSalesResponse } from './types';

type Props = {
  data: {
    sales: StoreSalesResponse | null;
    salesAll: StoreSalesResponse | null;
    payments: StorePaymentsResponse | null;
    deliveries: StoreDeliveriesResponse | null;
    products: StoreProductsResponse | null;
  };
  isLoading: boolean;
  selectedMonth: string;
  onMonthChange: (value: string) => void;
};

const paymentColors = ['#855b38', '#16a34a', '#657650', '#f97316', '#94a3b8'];

export default function OnlineStoreDashboard({ data, isLoading, selectedMonth, onMonthChange }: Props) {
  const salesMetrics = data.sales?.metrics ?? {};
  const paymentMetrics = data.payments?.metrics ?? {};
  const deliveryMetrics = data.deliveries?.metrics ?? {};
  const productMetrics = data.products?.metrics ?? {};
  const rows = data.sales?.data ?? [];
  const allRows = data.salesAll?.data ?? rows;

  const metrics: MetricItem[] = [
    { label: 'Total ventas del mes', value: `Q${formatMoney(salesMetrics.totalVendido ?? 0)}`, tone: 'blue', icon: Coins },
    { label: 'Pendientes de pago', value: formatNumber(paymentMetrics.pendienteDePago ?? 0), tone: 'blue', icon: CreditCard },
    { label: 'En preparacion', value: formatNumber(countStatus(allRows, 'PREPARANDO_PEDIDO')), tone: 'orange', icon: Box },
    { label: 'Listos para recoger', value: formatNumber(deliveryMetrics.asignadas ?? 0), tone: 'green', icon: CheckSquare },
    { label: 'Envios en ruta', value: formatNumber(deliveryMetrics.enRuta ?? 0), tone: 'violet', icon: Truck },
  ];

  const daily = buildDailyStoreSeries(allRows, selectedMonth);
  const paymentItems = buildPaymentDonut(allRows);

  return (
    <>
      <div className="split-metric-grid">{metrics.map((item) => <DashboardMetricCard item={item} key={item.label} />)}</div>
      <div className="split-dashboard-grid">
        <DashboardLineChart title="Rendimiento de tienda online" labels={daily.labels} series={daily.series} selectedMonth={selectedMonth} onMonthChange={onMonthChange} isLoading={isLoading} />
        <DashboardDonutChart title="Metodos de pago" items={paymentItems} />
        <DashboardTable
          title="Pedidos recientes"
          href="/tienda-online/pedidos"
          columns={['Fecha', 'Cliente', 'Pedido', 'Estado', 'Monto', 'Entrega', 'Pago']}
          rows={rows.map((order) => [
            `${formatDate(order.createdAt)}, ${formatTime(order.createdAt)}`,
            order.customer?.fullName ?? 'Cliente no disponible',
            order.orderNumber,
            <StatusBadge key="status" tone={orderTone(order.orderStatus)}>{orderStatusLabel(order.orderStatus)}</StatusBadge>,
            `Q${formatMoney(order.totalAmount)}`,
            deliveryStatusLabel(order.deliveryStatus),
            paymentMethodLabel(order.paymentMethodRequested),
          ])}
        />
        <AlertsCard
          title="Alertas operativas"
          href="/tienda-online/reportes"
          alerts={[
            {
              label: 'Pedidos sin confirmar',
              detail: `${formatNumber(salesMetrics.pedidosSolicitados ?? 0)} pedidos con solicitud pendiente de revision.`,
              value: `${formatNumber(salesMetrics.pedidosSolicitados ?? 0)} pedidos`,
              tone: 'red',
              icon: AlertCircle,
            },
            {
              label: 'Retrasos de despacho',
              detail: `${formatNumber((deliveryMetrics.reprogramadas ?? 0) + (deliveryMetrics.noEntregadas ?? 0))} entregas requieren seguimiento.`,
              value: `${formatNumber((deliveryMetrics.reprogramadas ?? 0) + (deliveryMetrics.noEntregadas ?? 0))} envios`,
              tone: 'orange',
              icon: Truck,
            },
            {
              label: 'Productos con bajo stock',
              detail: `${formatNumber(productMetrics.productosBajoStock ?? 0)} productos estan bajo el umbral minimo.`,
              value: `${formatNumber(productMetrics.productosBajoStock ?? 0)} productos`,
              tone: 'orange',
              icon: Package,
            },
            {
              label: 'Problemas de pago',
              detail: `${formatNumber((paymentMetrics.pendienteDeConfirmacion ?? 0) + (paymentMetrics.rechazadosNoPagados ?? 0) + (paymentMetrics.conIncidencia ?? 0))} pagos requieren verificacion.`,
              value: `${formatNumber((paymentMetrics.pendienteDeConfirmacion ?? 0) + (paymentMetrics.rechazadosNoPagados ?? 0) + (paymentMetrics.conIncidencia ?? 0))} pagos`,
              tone: 'blue',
              icon: CreditCard,
            },
          ]}
        />
      </div>
    </>
  );
}

function buildDailyStoreSeries(rows: StoreSaleRow[], month: string): { labels: string[]; series: ChartSeries[] } {
  const [year, monthNumber] = month.split('-').map(Number);
  const dayCount = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const days = Array.from({ length: dayCount }, (_, index) => String(index + 1));
  const sales = new Array(dayCount).fill(0);
  const orders = new Array(dayCount).fill(0);
  const delivered = new Array(dayCount).fill(0);
  for (const row of rows) {
    const day = new Date(row.createdAt).getUTCDate() - 1;
    if (day < 0 || day >= dayCount) continue;
    if (row.clientPaymentStatus === 'PAGO_CONFIRMADO') sales[day] += Number(row.totalAmount ?? 0);
    orders[day] += 1;
    if (row.orderStatus === 'ENTREGADO') delivered[day] += 1;
  }
  return {
    labels: days.map((day) => `${day}`),
    series: [
      { label: 'Ventas online', color: '#855b38', values: sales },
      { label: 'Pedidos online', color: '#657650', values: orders },
      { label: 'Entregas completadas', color: '#16a34a', values: delivered },
    ],
  };
}

function buildPaymentDonut(rows: StoreSaleRow[]): DonutItem[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const label = paymentMethodLabel(row.paymentMethodRequested);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  const items = Array.from(counts.entries()).map(([label, value], index) => ({ label, value, color: paymentColors[index % paymentColors.length] }));
  return items.length ? items : [{ label: 'Sin pagos', value: 1, color: '#e5dcd0' }];
}

function countStatus(rows: StoreSaleRow[], status: string) {
  return rows.filter((row) => row.orderStatus === status).length;
}

function paymentMethodLabel(value?: string | null) {
  const labels: Record<string, string> = {
    VISA_LINK: 'Visa Link',
    TRANSFERENCIA: 'Transferencia',
    DEPOSITO: 'Deposito',
    EFECTIVO: 'Efectivo',
    VISA_LINK_MANUAL: 'Visa Link',
    TRANSFERENCIA_BANCARIA: 'Transferencia',
    DEPOSITO_BANCARIO: 'Deposito',
    EFECTIVO_CONTRA_ENTREGA: 'Contra entrega',
  };
  return value ? labels[value] ?? value.replaceAll('_', ' ') : 'Sin metodo';
}

function orderStatusLabel(value?: string | null) {
  const labels: Record<string, string> = {
    PEDIDO_SOLICITADO: 'Pendiente',
    CONFIRMADO_ADMIN: 'Confirmado',
    PREPARANDO_PEDIDO: 'En preparacion',
    EN_RUTA: 'En ruta',
    ENTREGADO: 'Entregado',
    CANCELADO: 'Cancelado',
  };
  return value ? labels[value] ?? value.replaceAll('_', ' ') : 'Sin estado';
}

function deliveryStatusLabel(value?: string | null) {
  const labels: Record<string, string> = {
    PROGRAMADA: 'Envio a domicilio',
    ASIGNADA: 'Recoger / asignada',
    EN_RUTA: 'Envio en ruta',
    ENTREGADA: 'Entregado',
    REPROGRAMADA: 'Reprogramado',
  };
  return value ? labels[value] ?? value.replaceAll('_', ' ') : 'Sin entrega';
}

function orderTone(value?: string | null) {
  if (value === 'ENTREGADO') return 'green';
  if (value === 'PREPARANDO_PEDIDO' || value === 'CONFIRMADO_ADMIN') return 'blue';
  if (value === 'CANCELADO' || value === 'NO_ENTREGADO') return 'red';
  return 'orange';
}
