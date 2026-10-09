import type { LucideIcon } from 'lucide-react';

export type DashboardTone = 'blue' | 'green' | 'orange' | 'violet' | 'red' | 'slate';

export type MetricItem = {
  label: string;
  value: string;
  tone: DashboardTone;
  icon: LucideIcon;
};

export type ChartSeries = {
  label: string;
  color: string;
  values: number[];
};

export type DonutItem = {
  label: string;
  value: number;
  color: string;
};

export type PaginatedResponse<T> = {
  data?: T[];
  meta?: { page: number; limit: number; total: number; totalPages: number };
};

export type StoreSaleRow = {
  orderId: string;
  orderNumber: string;
  createdAt: string;
  customer?: { fullName?: string | null };
  paymentMethodRequested?: string | null;
  orderStatus?: string | null;
  clientPaymentStatus?: string | null;
  deliveryStatus?: string | null;
  totalAmount: number | string;
};

export type StoreSalesResponse = PaginatedResponse<StoreSaleRow> & {
  metrics?: {
    totalVendido?: number;
    cantidadPedidos?: number;
    pedidosSolicitados?: number;
    pedidosConfirmados?: number;
    pedidosEntregados?: number;
    pedidosCancelados?: number;
    pedidosNoEntregados?: number;
  };
};

export type StorePaymentsResponse = PaginatedResponse<unknown> & {
  metrics?: {
    pendienteDePago?: number;
    pendienteDeConfirmacion?: number;
    rechazadosNoPagados?: number;
    conIncidencia?: number;
  };
};

export type StoreDeliveriesResponse = PaginatedResponse<unknown> & {
  metrics?: {
    programadas?: number;
    asignadas?: number;
    enRuta?: number;
    entregadas?: number;
    noEntregadas?: number;
    reprogramadas?: number;
    canceladas?: number;
  };
};

export type StoreProductsResponse = PaginatedResponse<unknown> & {
  metrics?: { productosBajoStock?: number };
};

export type SummaryResponse = {
  totals?: { customers?: number };
  recentPurchases?: Array<{
    id: string;
    invoiceNumber?: string;
    pointsCalculated?: number;
    purchasedAt?: string;
    customer?: { fullName?: string };
    store?: { code?: string; name?: string };
  }>;
  levelDistribution?: Array<{ level: string; count: number }>;
};

export type DailyPoint = {
  date: string;
  purchases: number;
  points: number;
  newCustomers: number;
  redeemedPoints: number;
};

export type MonthlySummaryResponse = {
  month: string;
  pointsIssued: number;
  redemptionsCount: number;
  pointsRedeemed: number;
  dailySales: DailyPoint[];
};

export type RedemptionRow = {
  id: string;
  requestCode?: string;
  requestedAt?: string;
  status?: string;
  pointsReserved?: number;
  productNameSnapshot?: string;
  customer?: { fullName?: string };
};

export type RedemptionsResponse = PaginatedResponse<RedemptionRow>;

export type PointPromotionRow = {
  id: string;
  name: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'ENDED';
  startsAt?: string;
  endsAt?: string | null;
};
