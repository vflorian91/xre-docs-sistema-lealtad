'use client';

import { Download, Eye, Receipt, RefreshCcw, Search } from 'lucide-react';
import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import AdminRoutedShell from '../../AdminRoutedShell';
import { ReasonModal, ReasonModalState } from '../../components/ReasonModal';
import { adminApiRequest, getErrorText, getStoredAdminUser, StoredAdminUser } from '../../lib/adminApi';
import { exportRowsToXlsx } from '../../lib/exportExcel';
import { formatDate, formatMoney, formatNumber, formatTime } from '../../lib/format';

type CatalogItem = {
  id: string;
  name: string;
  isActive: boolean;
};

type CatalogResponse = {
  items: CatalogItem[];
};

type PurchaseRow = {
  id: string;
  invoiceNumber: string;
  amount: string;
  shoeTypeId?: string | null;
  pointsCalculated: number;
  status?: 'APPROVED' | 'REVERSED' | 'REJECTED' | 'PENDING_REVIEW' | string;
  purchasedAt: string;
  appliedPromotionName?: string | null;
  customer: {
    code: string;
    fullName: string;
    taxId?: string | null;
  };
  store: {
    name: string;
    brandName?: string | null;
  };
  internalUser?: {
    fullName?: string | null;
    email?: string | null;
  } | null;
};

type PaginatedPurchases = {
  data: PurchaseRow[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

const pageSize = 10;
const emptyMeta = { page: 1, limit: pageSize, total: 0, totalPages: 1 };


export default function RegistroFacturasPage() {
  const [user, setUser] = useState<StoredAdminUser | null>(null);
  const [shoeTypes, setShoeTypes] = useState<CatalogItem[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [meta, setMeta] = useState(emptyMeta);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [shoeTypeFilter, setShoeTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [reasonModal, setReasonModal] = useState<ReasonModalState | null>(null);

  const canRegister = Boolean(user?.permissions.includes('purchases.create'));
  const canReverse = Boolean(user?.permissions.includes('purchases.reverse'));
  useEffect(() => {
    setUser(getStoredAdminUser());
    void loadCatalogs();
  }, []);

  useEffect(() => {
    void loadPurchases();
  }, [currentPage]);

  async function loadCatalogs() {
    try {
      const result = await adminApiRequest<CatalogResponse>('/catalogs/SHOE_TYPES');
      setShoeTypes(result.items.filter((item) => item.isActive));
    } catch {
      setShoeTypes([]);
    }
  }

  async function loadPurchases(nextPage = currentPage) {
    setIsLoading(true);
    setMessage(null);

    const params = new URLSearchParams({
      scope: 'ACTIVE_STORE',
      page: String(nextPage),
      limit: String(pageSize),
    });

    if (searchTerm.trim()) params.set('search', searchTerm.trim());
    if (statusFilter) params.set('status', statusFilter);
    if (shoeTypeFilter) params.set('shoeTypeId', shoeTypeFilter);
    if (dateFrom) params.set('from', `${dateFrom}T00:00:00.000Z`);
    if (dateTo) params.set('to', `${dateTo}T23:59:59.999Z`);

    try {
      const result = await adminApiRequest<PaginatedPurchases>(`/purchases?${params.toString()}`);
      setPurchases(result.data);
      setMeta(result.meta);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo cargar el historico de facturas.') });
    } finally {
      setIsLoading(false);
    }
  }

  function setFilter(update: () => void) {
    update();
    setCurrentPage(1);
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCurrentPage(1);
    void loadPurchases(1);
  }

  async function exportPurchases() {
    const query = new URLSearchParams({ scope: 'ACTIVE_STORE', page: '1', limit: '1000' });
    if (searchTerm.trim()) query.set('search', searchTerm.trim());
    if (statusFilter) query.set('status', statusFilter);
    if (shoeTypeFilter) query.set('shoeTypeId', shoeTypeFilter);
    if (dateFrom) query.set('from', `${dateFrom}T00:00:00.000Z`);
    if (dateTo) query.set('to', `${dateTo}T23:59:59.999Z`);
    const exportResult = await adminApiRequest<PaginatedPurchases>(`/purchases?${query.toString()}`);
    const rows = [
      ['Fecha', 'Hora', 'Cliente', 'NIT', 'Factura', 'Monto', 'Marca', 'Puntos', 'Promocion', 'Usuario', 'Tienda'],
      ...exportResult.data.map((purchase) => [
        formatDate(purchase.purchasedAt),
        formatTime(purchase.purchasedAt),
        `${purchase.customer.fullName} (${purchase.customer.code})`,
        purchase.customer.taxId ?? '',
        purchase.invoiceNumber,
        Number(purchase.amount),
        purchase.store.brandName ?? 'Sin marca',
        purchase.pointsCalculated,
        purchase.appliedPromotionName ?? 'Regla general de puntos',
        purchase.internalUser?.fullName || purchase.internalUser?.email || '',
        purchase.store.name,
      ]),
    ];
    await exportRowsToXlsx(`facturas-${new Date().toISOString().slice(0, 10)}.xlsx`, 'Facturas', rows);
  }

  function reversePurchase(purchase: PurchaseRow) {
    setReasonModal({
      title: 'Anular factura',
      description: `Indica el motivo para anular la factura No. ${purchase.invoiceNumber}.`,
      confirmLabel: 'Anular factura',
      onConfirm: async (reason) => {
        setIsSubmitting(true);
        setMessage(null);

        try {
          await adminApiRequest(`/purchases/${purchase.id}/reverse`, {
            method: 'POST',
            body: JSON.stringify({ reason }),
          });
          await loadPurchases();
          setMessage({ type: 'success', text: `Factura No. ${purchase.invoiceNumber} anulada correctamente.` });
          setReasonModal(null);
        } catch (error) {
          setMessage({ type: 'error', text: getErrorText(error, 'No se pudo anular la factura.') });
        } finally {
          setIsSubmitting(false);
        }
      },
    });
  }

  return (
    <AdminRoutedShell title="Registro de Facturas">
      <section className="customer-dashboard-toolbar">
        <span />
        {canRegister ? <Link className="admin-primary" href="/tienda/registro-facturas/nuevo">Registrar factura</Link> : null}
      </section>

      {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}

      <article className="panel table-panel wide-panel customer-table-panel">
        <div className="panel-header customer-table-header">
          <div><h2><Receipt size={24} /> Tabla de facturas</h2></div>
          <span className="count-pill">{formatNumber(meta.total)}</span>
        </div>

        <form className="customer-table-toolbar invoice-filter-toolbar" onSubmit={applyFilters}>
          <label className="customer-search">
            <input aria-label="Buscar facturas" value={searchTerm} onChange={(event) => setFilter(() => setSearchTerm(event.target.value))} placeholder="Buscar factura, cliente o NIT..." />
            <Search size={18} />
          </label>
          <select aria-label="Filtrar por estado" value={statusFilter} onChange={(event) => setFilter(() => setStatusFilter(event.target.value))}>
            <option value="">Estado: Todos</option>
            <option value="APPROVED">Registrada</option>
            <option value="REVERSED">Anulada</option>
            <option value="REJECTED">Rechazada</option>
          </select>
          <select aria-label="Filtrar por tipo de calzado" value={shoeTypeFilter} onChange={(event) => setFilter(() => setShoeTypeFilter(event.target.value))}>
            <option value="">Tipo: Todos</option>
            {shoeTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <input aria-label="Fecha desde" value={dateFrom} onChange={(event) => setFilter(() => setDateFrom(event.target.value))} type="date" />
          <input aria-label="Fecha hasta" value={dateTo} onChange={(event) => setFilter(() => setDateTo(event.target.value))} type="date" />
          <button className="admin-secondary invoice-filter-button" type="submit">Filtrar</button>
          <button className="admin-secondary customer-export-button" onClick={() => void exportPurchases()} type="button">
            <Download size={16} />
            Exportar
          </button>
        </form>

        <table className="customer-records-table transactions-records-table">
          <thead>
            <tr>
              <th>No. factura</th>
              <th>Cliente</th>
              <th>NIT</th>
              <th>Monto</th>
              <th>Marca</th>
              <th>Puntos</th>
              <th>Promocion</th>
              <th>Fecha</th>
              <th>Usuario</th>
              <th>Tienda</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((purchase) => (
              <tr key={purchase.id}>
                <td><span className="store-code-pill">No. {purchase.invoiceNumber}</span></td>
                <td>
                  <span className="table-main-text">{purchase.customer.fullName}</span>
                  <p className="table-subtitle">{purchase.customer.code}</p>
                </td>
                <td>{purchase.customer.taxId || '-'}</td>
                <td>Q{formatMoney(purchase.amount)}</td>
                <td>{purchase.store.brandName ?? 'Sin marca'}</td>
                <td className="customer-points-cell">+{formatNumber(purchase.pointsCalculated)}</td>
                <td>{purchase.appliedPromotionName ?? 'Regla general de puntos'}</td>
                <td>
                  {formatDate(purchase.purchasedAt)}
                  <p className="table-subtitle">{formatTime(purchase.purchasedAt)}</p>
                </td>
                <td>{purchase.internalUser?.fullName || purchase.internalUser?.email || '-'}</td>
                <td>{purchase.store.name}</td>
                <td>
                  <div className="customer-actions">
                    <Link aria-label={`Ver factura ${purchase.invoiceNumber}`} className="customer-icon-action" href={`/transacciones/${purchase.id}`}><Eye size={16} /></Link>
                    {canReverse && purchase.status !== 'REVERSED' ? (
                      <button aria-label={`Anular factura ${purchase.invoiceNumber}`} className="customer-icon-action" disabled={isSubmitting} onClick={() => void reversePurchase(purchase)} type="button"><RefreshCcw size={16} /></button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && purchases.length === 0 ? <tr><td colSpan={11}>No hay facturas con esos filtros.</td></tr> : null}
            {isLoading ? <tr><td colSpan={11}>Cargando facturas...</td></tr> : null}
          </tbody>
        </table>

        <div className="customer-table-footer">
          <span>Mostrando página {formatNumber(meta.page)} de {formatNumber(meta.totalPages)} · {formatNumber(meta.total)} facturas</span>
          <div className="customer-pagination">
            <button disabled={meta.page <= 1 || isLoading} onClick={() => setCurrentPage((value) => Math.max(1, value - 1))} type="button">‹</button>
            {pageWindow(meta.page, meta.totalPages).map((p) => (
              <button className={p === meta.page ? 'active' : ''} key={p} onClick={() => setCurrentPage(p)} type="button">{p}</button>
            ))}
            <button disabled={meta.page >= meta.totalPages || isLoading} onClick={() => setCurrentPage((value) => Math.min(meta.totalPages, value + 1))} type="button">›</button>
          </div>
        </div>
      </article>

      {reasonModal ? (
        <ReasonModal state={reasonModal} isSubmitting={isSubmitting} onClose={() => setReasonModal(null)} />
      ) : null}
    </AdminRoutedShell>
  );
}

function pageWindow(page: number, totalPages: number) {
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}
