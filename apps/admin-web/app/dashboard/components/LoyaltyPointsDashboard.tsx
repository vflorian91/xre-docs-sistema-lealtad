import { Clock, Coins, Gift, Megaphone, RefreshCcw, UsersRound } from 'lucide-react';
import { formatDate, formatNumber, formatTime } from '../../lib/format';
import { AlertsCard, DashboardDonutChart, DashboardLineChart, DashboardMetricCard, DashboardTable, StatusBadge } from './DashboardWidgets';
import type { ChartSeries, DonutItem, MetricItem, MonthlySummaryResponse, PointPromotionRow, RedemptionsResponse, SummaryResponse } from './types';

type Props = {
  data: {
    summary: SummaryResponse | null;
    monthly: MonthlySummaryResponse | null;
    redemptions: RedemptionsResponse | null;
    pendingRedemptions: RedemptionsResponse | null;
    promotions: PointPromotionRow[];
  };
  isLoading: boolean;
  selectedMonth: string;
  onMonthChange: (value: string) => void;
};

const levelColors = ['#0f6fff', '#f97316', '#a8b3c7', '#f4b000', '#6d28d9'];

export default function LoyaltyPointsDashboard({ data, isLoading, selectedMonth, onMonthChange }: Props) {
  const monthly = data.monthly;
  const pendingRedemptions = data.pendingRedemptions?.meta?.total ?? 0;
  const expiringCampaigns = countExpiringCampaigns(data.promotions);
  const metrics: MetricItem[] = [
    { label: 'Puntos otorgados del mes', value: formatNumber(monthly?.pointsIssued ?? 0), tone: 'blue', icon: Coins },
    { label: 'Puntos canjeados del mes', value: formatNumber(monthly?.pointsRedeemed ?? 0), tone: 'violet', icon: Gift },
    { label: 'Clientes activos', value: formatNumber(data.summary?.totals?.customers ?? 0), tone: 'green', icon: UsersRound },
    { label: 'Canjes realizados', value: formatNumber(monthly?.redemptionsCount ?? 0), tone: 'orange', icon: RefreshCcw },
    { label: 'Puntos por vencer', value: formatNumber(0), tone: 'red', icon: Clock },
  ];
  const daily = buildLoyaltySeries(monthly);
  const levels = buildLevelItems(data.summary?.levelDistribution ?? []);
  const redemptionRows = data.redemptions?.data ?? [];

  return (
    <>
      <div className="split-metric-grid">{metrics.map((item) => <DashboardMetricCard item={item} key={item.label} />)}</div>
      <div className="split-dashboard-grid">
        <DashboardLineChart title="Rendimiento de lealtad" labels={daily.labels} series={daily.series} selectedMonth={selectedMonth} onMonthChange={onMonthChange} isLoading={isLoading} />
        <DashboardDonutChart title="Distribucion por nivel" items={levels} />
        <DashboardTable
          title="Movimientos recientes"
          href="/canjes"
          columns={['Fecha', 'Cliente', 'Tipo', 'Referencia', 'Puntos', 'Canal', 'Estado']}
          rows={redemptionRows.map((redemption) => [
            `${formatDate(redemption.requestedAt)}, ${formatTime(redemption.requestedAt)}`,
            redemption.customer?.fullName ?? 'Cliente no disponible',
            'Canje',
            redemption.requestCode ?? redemption.productNameSnapshot ?? 'Solicitud',
            <span className="split-negative" key="points">-{formatNumber(redemption.pointsReserved ?? 0)}</span>,
            'PWA cliente',
            <StatusBadge key="status" tone={redemptionTone(redemption.status)}>{redemptionStatusLabel(redemption.status)}</StatusBadge>,
          ])}
        />
        <AlertsCard
          title="Alertas de lealtad"
          href="/canjes"
          alerts={[
            {
              label: 'Canjes pendientes de aprobacion',
              detail: `${formatNumber(pendingRedemptions)} solicitudes requieren revision del administrador.`,
              value: `${formatNumber(pendingRedemptions)} canjes`,
              tone: 'red',
              icon: Gift,
            },
            {
              label: 'Puntos proximos a vencer',
              detail: 'No hay endpoint operativo para vencimientos futuros; se muestra cero hasta contar con esa fuente.',
              value: '0 clientes',
              tone: 'orange',
              icon: Clock,
            },
            {
              label: 'Campanas por vencer',
              detail: `${formatNumber(expiringCampaigns)} promociones de puntos finalizan en los proximos 7 dias.`,
              value: `${formatNumber(expiringCampaigns)} campanas`,
              tone: 'violet',
              icon: Megaphone,
            },
            {
              label: 'Clientes sin movimiento',
              detail: 'Pendiente de endpoint de inactividad; no se estiman datos artificiales.',
              value: '0 clientes',
              tone: 'blue',
              icon: UsersRound,
            },
          ]}
        />
      </div>
    </>
  );
}

function buildLoyaltySeries(monthly: MonthlySummaryResponse | null): { labels: string[]; series: ChartSeries[] } {
  const rows = monthly?.dailySales ?? [];
  const labels = rows.map((row) => String(new Date(row.date).getUTCDate()));
  return {
    labels,
    series: [
      { label: 'Puntos otorgados', color: '#0f6fff', values: rows.map((row) => row.points) },
      { label: 'Puntos canjeados', color: '#6d28d9', values: rows.map((row) => row.redeemedPoints) },
      { label: 'Clientes activos', color: '#16a34a', values: rows.map((row) => row.newCustomers) },
    ],
  };
}

function buildLevelItems(rows: Array<{ level: string; count: number }>): DonutItem[] {
  const items = rows.map((row, index) => ({
    label: levelLabel(row.level),
    value: row.count,
    color: levelColors[index % levelColors.length],
  }));
  return items.length ? items : [{ label: 'Sin niveles', value: 1, color: '#e2e8f0' }];
}

function countExpiringCampaigns(promotions: PointPromotionRow[]) {
  const now = new Date();
  const limit = new Date(now);
  limit.setDate(limit.getDate() + 7);
  return promotions.filter((promotion) => {
    if (!promotion.endsAt) return false;
    const endsAt = new Date(promotion.endsAt);
    return endsAt >= now && endsAt <= limit;
  }).length;
}

function levelLabel(value: string) {
  const labels: Record<string, string> = {
    BASIC: 'Basico',
    BRONZE: 'Bronce',
    SILVER: 'Plata',
    GOLD: 'Oro',
  };
  return labels[value] ?? value;
}

function redemptionStatusLabel(value?: string | null) {
  const labels: Record<string, string> = {
    PENDING_APPROVAL: 'Pendiente',
    APPROVED: 'Aprobado',
    SENT_TO_STORE: 'En preparacion',
    READY: 'Listo',
    DELIVERED: 'Completado',
    REJECTED: 'Rechazado',
    CANCELLED: 'Cancelado',
    EXPIRED: 'Vencido',
  };
  return value ? labels[value] ?? value.replaceAll('_', ' ') : 'Sin estado';
}

function redemptionTone(value?: string | null) {
  if (value === 'DELIVERED' || value === 'APPROVED' || value === 'READY') return 'green';
  if (value === 'REJECTED' || value === 'CANCELLED' || value === 'EXPIRED') return 'red';
  if (value === 'SENT_TO_STORE') return 'blue';
  return 'orange';
}
