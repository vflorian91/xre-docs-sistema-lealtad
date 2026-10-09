'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import AdminRoutedShell from '../AdminRoutedShell';
import { adminApiRequest, getErrorText, hasAdminSession } from '../lib/adminApi';
import DashboardTabs, { DashboardTab } from './components/DashboardTabs';
import LoyaltyPointsDashboard from './components/LoyaltyPointsDashboard';
import OnlineStoreDashboard from './components/OnlineStoreDashboard';
import type {
  MonthlySummaryResponse,
  PaginatedResponse,
  PointPromotionRow,
  RedemptionsResponse,
  StoreDeliveriesResponse,
  StorePaymentsResponse,
  StoreProductsResponse,
  StoreSalesResponse,
  SummaryResponse,
} from './components/types';

const validTabs: DashboardTab[] = ['tienda-online', 'lealtad-puntos'];

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function monthRange(month: string) {
  const [year, monthIndex] = month.split('-').map(Number);
  const from = new Date(Date.UTC(year, monthIndex - 1, 1));
  const to = new Date(Date.UTC(year, monthIndex, 0));
  return {
    dateFrom: from.toISOString().slice(0, 10),
    dateTo: to.toISOString().slice(0, 10),
  };
}

function asArray<T>(value: T[] | PaginatedResponse<T>): T[] {
  return Array.isArray(value) ? value : value.data ?? [];
}

export default function DashboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedMonth, setSelectedMonth] = useState(currentMonthValue);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [storeData, setStoreData] = useState<{
    sales: StoreSalesResponse | null;
    salesAll: StoreSalesResponse | null;
    payments: StorePaymentsResponse | null;
    deliveries: StoreDeliveriesResponse | null;
    products: StoreProductsResponse | null;
  }>({ sales: null, salesAll: null, payments: null, deliveries: null, products: null });
  const [loyaltyData, setLoyaltyData] = useState<{
    summary: SummaryResponse | null;
    monthly: MonthlySummaryResponse | null;
    redemptions: RedemptionsResponse | null;
    pendingRedemptions: RedemptionsResponse | null;
    promotions: PointPromotionRow[];
  }>({ summary: null, monthly: null, redemptions: null, pendingRedemptions: null, promotions: [] });

  const activeTab = useMemo<DashboardTab>(() => {
    const tab = searchParams.get('tab');
    return validTabs.includes(tab as DashboardTab) ? (tab as DashboardTab) : 'tienda-online';
  }, [searchParams]);

  useEffect(() => {
    if (!searchParams.get('tab')) {
      router.replace('/dashboard?tab=tienda-online', { scroll: false });
    }
  }, [router, searchParams]);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      if (!hasAdminSession()) return;
      setIsLoading(true);
      const { dateFrom, dateTo } = monthRange(selectedMonth);
      const range = `dateFrom=${dateFrom}&dateTo=${dateTo}`;

      try {
        const [
          sales,
          salesAll,
          payments,
          deliveries,
          products,
          summary,
          monthly,
          redemptions,
          pendingRedemptions,
          promotions,
        ] = await Promise.all([
          adminApiRequest<StoreSalesResponse>(`/admin/store/reports/sales?page=1&pageSize=5&${range}`),
          adminApiRequest<StoreSalesResponse>(`/admin/store/reports/sales?page=1&pageSize=100&${range}`),
          adminApiRequest<StorePaymentsResponse>(`/admin/store/reports/payments?page=1&pageSize=5`),
          adminApiRequest<StoreDeliveriesResponse>(`/admin/store/reports/deliveries?page=1&pageSize=5&${range}`),
          adminApiRequest<StoreProductsResponse>(`/admin/store/reports/products?page=1&pageSize=1&${range}`),
          adminApiRequest<SummaryResponse>('/admin/summary'),
          adminApiRequest<MonthlySummaryResponse>(`/admin/dashboard-summary?month=${selectedMonth}`),
          adminApiRequest<RedemptionsResponse>('/redemptions?page=1&take=5'),
          adminApiRequest<RedemptionsResponse>('/redemptions?page=1&take=1&status=PENDING_APPROVAL'),
          adminApiRequest<PointPromotionRow[] | PaginatedResponse<PointPromotionRow>>('/points/promotions?status=ACTIVE&limit=100'),
        ]);

        if (!isMounted) return;
        setStoreData({ sales, salesAll, payments, deliveries, products });
        setLoyaltyData({ summary, monthly, redemptions, pendingRedemptions, promotions: asArray(promotions) });
        setMessage(null);
      } catch (error) {
        if (isMounted) setMessage(getErrorText(error, 'No se pudo cargar la informacion del dashboard.'));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadDashboard();
    return () => {
      isMounted = false;
    };
  }, [selectedMonth]);

  function changeTab(tab: DashboardTab) {
    router.replace(`/dashboard?tab=${tab}`, { scroll: false });
  }

  return (
    <AdminRoutedShell title="Dashboard">
      <section className="split-dashboard">
        <DashboardTabs activeTab={activeTab} onChange={changeTab} />
        {message ? <div className="admin-status error">{message}</div> : null}
        {activeTab === 'tienda-online' ? (
          <OnlineStoreDashboard
            data={storeData}
            isLoading={isLoading}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
          />
        ) : (
          <LoyaltyPointsDashboard
            data={loyaltyData}
            isLoading={isLoading}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
          />
        )}
      </section>
    </AdminRoutedShell>
  );
}
