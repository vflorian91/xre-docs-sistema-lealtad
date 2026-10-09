'use client';

import { CheckCircle2, Download, Eye, RefreshCcw, Search, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import AdminRoutedShell from '../AdminRoutedShell';
import { ReasonModal, ReasonModalState } from '../components/ReasonModal';
import { adminApiRequest, getErrorText, getStoredAdminUser } from '../lib/adminApi';
import { exportRowsToXlsx } from '../lib/exportExcel';
import { formatDate, formatMoney, formatNumber, formatTime } from '../lib/format';

type PurchaseStatus = 'APPROVED' | 'PENDING_REVIEW' | 'REJECTED' | 'REVERSED';

type PurchaseRow = {
  id: string;
  invoiceNumber: string;
  amount: string;
  pointsCalculated: number;
  status?: PurchaseStatus;
  purchasedAt: string;
  customer: {
    id: string;
    code: string;
    fullName: string;
    taxId?: string | null;
  };
  store: {
    id: string;
    code: string;
    name: string;
  };
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

function purchaseStatusLabel(status?: PurchaseStatus) {
  if (status === 'PENDING_REVIEW') return 'Pendiente revision';
  if (status === 'REJECTED') return 'Rechazada';
  if (status === 'REVERSED') return 'Reversada';
  return 'Aprobada';
}

function purchaseStatusClass(status?: PurchaseStatus) {
  if (status === 'PENDING_REVIEW') return 'badge amber';
  if (status === 'REJECTED') return 'badge red';
  return status === 'REVERSED' ? 'badge red' : 'badge green';
}

export default function TransaccionesPage() {
  const canReadAllPurchases = Boolean(getStoredAdminUser()?.permissions.includes('purchases.read_all'));
  const purchaseScope = canReadAllPurchases ? 'ALL' : 'ALL_ASSIGNED';
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: pageSize, total: 0, totalPages: 1 });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | PurchaseStatus>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [reasonState, setReasonState] = useState<ReasonModalState | null>(null);

  const queryString = useMemo(() => {
    const query = new URLSearchParams({
      scope: purchaseScope,
      page: String(currentPage),
      limit: String(pageSize),
    });
    if (statusFilter !== 'ALL') query.set('status', statusFilter);
    if (searchTerm.trim()) query.set('search', searchTerm.trim());
    return query.toString();
  }, [currentPage, statusFilter, searchTerm, purchaseScope]);

  useEffect(() => {
    void loadPurchases();
  }, [queryString]);

  async function loadPurchases() {
    setIsLoading(true);
    setMessage(null);

    try {
      const result = await adminApiRequest<PaginatedPurchases>(`/purchases?${queryString}`);
      setPurchases(result.data);
      setMeta(result.meta);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudieron cargar las transacciones.') });
    } finally {
      setIsLoading(false);
    }
  }

  function setFilter(update: () => void) {
    update();
    setCurrentPage(1);
  }

  function reversePurchase(purchase: PurchaseRow) {
    setReasonState({
      title: `Reversar factura No. ${purchase.invoiceNumber}`,
      description: 'Indica la razon de la reversa. Esta accion revertira los puntos acreditados.',
      confirmLabel: 'Reversar',
      initialValue: 'Reversa administrativa de compra.',
      onConfirm: (reason) => applyReversePurchase(purchase, reason),
    });
  }

  async function applyReversePurchase(purchase: PurchaseRow, reason: string) {
    setReasonState(null);
    setIsSubmitting(true);
    setMessage(null);

    try {
      await adminApiRequest(`/purchases/${purchase.id}/reverse`, { method: 'POST', body: JSON.stringify({ reason }) });
      await loadPurchases();
      setMessage({ type: 'success', text: `Compra No. ${purchase.invoiceNumber} reversada correctamente.` });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo reversar la compra.') });
    } finally {
      setIsSubmitting(false);
    }
  }

  function approvePurchase(purchase: PurchaseRow) {
    setReasonState({
      title: `Aprobar factura No. ${purchase.invoiceNumber}`,
      description: 'Indica el motivo de la aprobacion. Se acreditaran los puntos al cliente.',
      confirmLabel: 'Aprobar',
      initialValue: 'Compra revisada y aprobada.',
      onConfirm: (reason) => applyApprovePurchase(purchase, reason),
    });
  }

  async function applyApprovePurchase(purchase: PurchaseRow, reason: string) {
    setReasonState(null);
    setIsSubmitting(true);
    setMessage(null);

    try {
      await adminApiRequest(`/purchases/${purchase.id}/approve`, { method: 'POST', body: JSON.stringify({ reason: reason.trim() || undefined }) });
      await loadPurchases();
      setMessage({ type: 'success', text: `Compra No. ${purchase.invoiceNumber} aprobada y puntos acreditados.` });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo aprobar la compra.') });
    } finally {
      setIsSubmitting(false);
    }
  }

  function rejectPurchase(purchase: PurchaseRow) {
    setReasonState({
      title: `Rechazar factura No. ${purchase.invoiceNumber}`,
      description: 'Indica la razon del rechazo. La compra no acreditara puntos.',
      confirmLabel: 'Rechazar',
      initialValue: 'Compra no valida para acreditacion de puntos.',
      onConfirm: (reason) => applyRejectPurchase(purchase, reason),
    });
  }

  async function applyRejectPurchase(purchase: PurchaseRow, reason: string) {
    setReasonState(null);
    setIsSubmitting(true);
    setMessage(null);

    try {
      await adminApiRequest(`/purchases/${purchase.id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) });
      await loadPurchases();
      setMessage({ type: 'success', text: `Compra No. ${purchase.invoiceNumber} rechazada correctamente.` });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo rechazar la compra.') });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function exportPurchases() {
    const query = new URLSearchParams({ scope: purchaseScope, page: '1', limit: '1000' });
    if (statusFilter !== 'ALL') query.set('status', statusFilter);
    if (searchTerm.trim()) query.set('search', searchTerm.trim());
    const exportResult = await adminApiRequest<PaginatedPurchases>(`/purchases?${query.toString()}`);
    const rows = [
      ['Fecha', 'Hora', 'Cliente', 'NIT', 'Tienda', 'Factura', 'Monto', 'Puntos', 'Estado'],
      ...exportResult.data.map((purchase) => [
        formatDate(purchase.purchasedAt),
        formatTime(purchase.purchasedAt),
        `${purchase.customer.fullName} (${purchase.customer.code})`,
        purchase.customer.taxId ?? '',
        purchase.store.name,
        purchase.invoiceNumber,
        Number(purchase.amount),
        purchase.pointsCalculated,
        purchaseStatusLabel(purchase.status),
      ]),
    ];
    await exportRowsToXlsx(`transacciones-${new Date().toISOString().slice(0, 10)}.xlsx`, 'Transacciones', rows);
  }

  return (
    <AdminRoutedShell title="Transacciones">
      <section className="customer-dashboard-toolbar">
        <span />
      </section>

      {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}

      <article className="panel table-panel wide-panel customer-table-panel">
        <div className="panel-header customer-table-header">
          <div><h2>Tabla de transacciones</h2></div>
          <span className="count-pill">{formatNumber(meta.total)}</span>
        </div>

        <div className="customer-table-toolbar">
          <label className="customer-search">
            <Search size={18} />
            <input value={searchTerm} onChange={(event) => setFilter(() => setSearchTerm(event.target.value))} placeholder="Buscar factura, cliente, NIT o tienda..." />
          </label>
          <select value={statusFilter} onChange={(event) => setFilter(() => setStatusFilter(event.target.value as typeof statusFilter))}>
            <option value="ALL">Estado: Todos</option>
            <option value="APPROVED">Aprobadas</option>
            <option value="PENDING_REVIEW">Pendientes</option>
            <option value="REJECTED">Rechazadas</option>
            <option value="REVERSED">Reversadas</option>
          </select>
          <button className="admin-secondary customer-export-button" onClick={exportPurchases} type="button">
            <Download size={16} />
            Exportar
          </button>
        </div>

        <table className="customer-records-table transactions-records-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>NIT</th>
              <th>Tienda</th>
              <th>Monto</th>
              <th>Puntos</th>
              <th>Factura</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((purchase) => (
              <tr key={purchase.id}>
                <td>
                  {formatDate(purchase.purchasedAt)}
                  <p className="table-subtitle">{formatTime(purchase.purchasedAt)}</p>
                </td>
                <td>
                  <strong>{purchase.customer.fullName}</strong>
                  <p className="table-subtitle">{purchase.customer.code}</p>
                </td>
                <td>{purchase.customer.taxId ?? '-'}</td>
                <td>
                  {purchase.store.name}
                  <p className="table-subtitle">{purchase.store.code}</p>
                </td>
                <td>Q{formatMoney(purchase.amount)}</td>
                <td className="customer-points-cell">+{formatNumber(purchase.pointsCalculated)}</td>
                <td>No. {purchase.invoiceNumber}</td>
                <td><span className={purchaseStatusClass(purchase.status)}>{purchaseStatusLabel(purchase.status)}</span></td>
                <td>
                  <div className="customer-actions">
                    <a aria-label={`Ver transaccion ${purchase.invoiceNumber}`} className="customer-icon-action" href={`/transacciones/${purchase.id}`}><Eye size={16} /></a>
                    {purchase.status === 'PENDING_REVIEW' ? (
                      <>
                        <button aria-label={`Aprobar transaccion ${purchase.invoiceNumber}`} className="customer-icon-action" disabled={isSubmitting} onClick={() => void approvePurchase(purchase)} type="button"><CheckCircle2 size={16} /></button>
                        <button aria-label={`Rechazar transaccion ${purchase.invoiceNumber}`} className="customer-icon-action" disabled={isSubmitting} onClick={() => void rejectPurchase(purchase)} type="button"><XCircle size={16} /></button>
                      </>
                    ) : purchase.status === 'REVERSED' || purchase.status === 'REJECTED' ? null : (
                      <button aria-label={`Reversar transaccion ${purchase.invoiceNumber}`} className="customer-icon-action" disabled={isSubmitting} onClick={() => void reversePurchase(purchase)} type="button"><RefreshCcw size={16} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && purchases.length === 0 ? <tr><td colSpan={9}>No hay transacciones con esos filtros.</td></tr> : null}
            {isLoading ? <tr><td colSpan={9}>Cargando transacciones...</td></tr> : null}
          </tbody>
        </table>

        <div className="customer-table-footer">
          <span>Mostrando página {formatNumber(meta.page)} de {formatNumber(meta.totalPages)} · {formatNumber(meta.total)} transacciones</span>
          <div className="customer-pagination">
            <button disabled={meta.page === 1 || isLoading} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} type="button">‹</button>
            {pageWindow(meta.page, meta.totalPages).map((p) => (
              <button className={p === meta.page ? 'active' : ''} key={p} onClick={() => setCurrentPage(p)} type="button">{p}</button>
            ))}
            <button disabled={meta.page === meta.totalPages || isLoading} onClick={() => setCurrentPage((p) => Math.min(meta.totalPages, p + 1))} type="button">›</button>
          </div>
        </div>
      </article>
      {reasonState ? (
        <ReasonModal state={reasonState} onClose={() => setReasonState(null)} isSubmitting={isSubmitting} />
      ) : null}
    </AdminRoutedShell>
  );
}

function pageWindow(page: number, totalPages: number) {
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}
