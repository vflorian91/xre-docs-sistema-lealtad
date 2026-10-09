'use client';

import { Gift, PackageCheck, Star, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import AdminRoutedShell from '../../AdminRoutedShell';
import { ReasonModal, ReasonModalState } from '../../components/ReasonModal';
import { adminApiRequest, getErrorText, getStoredAdminUser, StoredAdminUser } from '../../lib/adminApi';
import { formatDate, formatNumber } from '../../lib/format';

type RedemptionRequestStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'SENT_TO_STORE' | 'READY' | 'DELIVERED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';

type RedemptionRow = {
  id: string;
  requestCode: string;
  status: RedemptionRequestStatus;
  pointsReserved: number;
  productNameSnapshot: string;
  productIsGiftCardSnapshot?: boolean;
  requestedAt: string;
  expiresAt?: string | null;
  approvedAt?: string | null;
  readyAt?: string | null;
  customer: {
    id: string;
    code: string;
    fullName: string;
    phone: string;
  };
  product: {
    id: string;
    code: string;
    name: string;
    pointsValue: number;
    imageUrl?: string | null;
    isGiftCard?: boolean;
  };
  pickupStore?: {
    id: string;
    code: string;
    name: string;
  } | null;
};

type PaginatedRedemptions = {
  data: RedemptionRow[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

const STATUS_LABELS: Record<RedemptionRequestStatus, string> = {
  PENDING_APPROVAL: 'Pendiente de aprobación',
  APPROVED: 'Aprobado',
  SENT_TO_STORE: 'Enviado a tienda',
  READY: 'Listo para recoger',
  DELIVERED: 'Entregado',
  REJECTED: 'Rechazado',
  CANCELLED: 'Cancelado',
  EXPIRED: 'Vencido',
};

const pageSize = 10;

function redemptionStatusClass(status: RedemptionRequestStatus) {
  if (status === 'DELIVERED') return 'badge green';
  if (status === 'READY' || status === 'APPROVED' || status === 'SENT_TO_STORE') return 'badge blue';
  if (status === 'PENDING_APPROVAL') return 'badge amber';
  return 'badge red';
}

export default function CanjesTiendaPage() {
  const [user, setUser] = useState<StoredAdminUser | null>(null);
  const [redemptions, setRedemptions] = useState<RedemptionRow[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: pageSize, total: 0, totalPages: 1 });
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'ALL' | RedemptionRequestStatus>('ACTIVE');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [reasonModal, setReasonModal] = useState<ReasonModalState | null>(null);

  const canReject = Boolean(user?.permissions.includes('redemption_requests.reject'));
  const canMarkReady = Boolean(user?.permissions.includes('redemption_requests.mark_ready'));
  const canMarkDelivered = Boolean(user?.permissions.includes('redemption_requests.mark_delivered'));

  const queryString = useMemo(() => {
    const query = new URLSearchParams({ take: String(pageSize), page: String(currentPage) });
    if (statusFilter === 'ACTIVE') query.set('workflow', 'STORE_ACTIVE');
    if (statusFilter !== 'ALL' && statusFilter !== 'ACTIVE') query.set('status', statusFilter);
    return query.toString();
  }, [currentPage, statusFilter]);

  useEffect(() => {
    setUser(getStoredAdminUser());
  }, []);

  useEffect(() => {
    void loadRedemptions();
  }, [queryString]);

  async function loadRedemptions() {
    setIsLoading(true);
    setMessage(null);

    try {
      const result = await adminApiRequest<PaginatedRedemptions>(`/redemptions?${queryString}`);
      setRedemptions(result.data);
      setMeta(result.meta);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudieron cargar los canjes de la tienda.') });
    } finally {
      setIsLoading(false);
    }
  }

  function setFilter(update: () => void) {
    update();
    setCurrentPage(1);
  }

  function rejectRedemption(redemption: RedemptionRow) {
    setReasonModal({
      title: 'Rechazar canje',
      description: `Indica la razon para rechazar el canje ${redemption.requestCode}. El cliente sera notificado y sus puntos se liberaran automaticamente.`,
      confirmLabel: 'Rechazar canje',
      onConfirm: async (reason) => {
        setIsSubmitting(true);
        setMessage(null);

        try {
          await adminApiRequest(`/redemptions/${redemption.id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) });
          await loadRedemptions();
          setMessage({ type: 'success', text: `Canje ${redemption.requestCode} rechazado. Se notifico al cliente y se liberaron sus puntos.` });
          setReasonModal(null);
        } catch (error) {
          setMessage({ type: 'error', text: getErrorText(error, 'No se pudo rechazar el canje.') });
        } finally {
          setIsSubmitting(false);
        }
      },
    });
  }

  async function markReadyRedemption(redemption: RedemptionRow) {
    setIsSubmitting(true);
    setMessage(null);

    try {
      await adminApiRequest(`/redemptions/${redemption.id}/ready`, { method: 'POST' });
      await loadRedemptions();
      setMessage({ type: 'success', text: `Canje ${redemption.requestCode} listo para recoger.` });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo marcar como lista la solicitud.') });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function markDeliveredRedemption(redemption: RedemptionRow) {
    setIsSubmitting(true);
    setMessage(null);

    try {
      await adminApiRequest(`/redemptions/${redemption.id}/deliver`, { method: 'POST' });
      await loadRedemptions();
      setMessage({ type: 'success', text: `Canje ${redemption.requestCode} marcado como entregado.` });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo marcar como entregada la solicitud.') });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AdminRoutedShell title="Canjes de mi Tienda">
      <section className="customer-dashboard-toolbar">
        <div>
          <h2>Canjes de mi tienda</h2>
          <p>Recibe los canjes enviados a tu tienda, prepáralos y confirma su entrega al cliente.</p>
        </div>
      </section>

      {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}

      <article className="panel table-panel wide-panel customer-table-panel">
        <div className="panel-header customer-table-header">
          <div><h2><Gift size={22} /> Solicitudes de canje</h2></div>
          <span className="count-pill">{formatNumber(meta.total)}</span>
        </div>

        <div className="customer-table-toolbar">
          <select aria-label="Filtrar por estado" value={statusFilter} onChange={(event) => setFilter(() => setStatusFilter(event.target.value as typeof statusFilter))}>
            <option value="ACTIVE">Canjes por gestionar</option>
            <option value="ALL">Estado: Todos</option>
            <option value="SENT_TO_STORE">Enviados a tienda</option>
            <option value="APPROVED">Aprobados</option>
            <option value="READY">Listos para recoger</option>
            <option value="DELIVERED">Entregados</option>
            <option value="REJECTED">Rechazados</option>
            <option value="CANCELLED">Cancelados</option>
            <option value="EXPIRED">Vencidos</option>
          </select>
        </div>

        <table className="customer-records-table redemptions-records-table">
          <thead>
            <tr>
              <th>Canje</th>
              <th>Cliente</th>
              <th>Producto</th>
              <th>Estado</th>
              <th>Fechas</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {redemptions.map((redemption) => (
              <tr key={redemption.id}>
                <td>
                  <strong>{redemption.requestCode}</strong>
                  <p className="table-subtitle">{formatNumber(redemption.pointsReserved)} pts</p>
                </td>
                <td>
                  <strong>{redemption.customer.fullName}</strong>
                  <p className="table-subtitle">{redemption.customer.code} · {redemption.customer.phone}</p>
                </td>
                <td>
                  {redemption.productNameSnapshot || redemption.product.name}
                  {redemption.productIsGiftCardSnapshot || redemption.product.isGiftCard ? <p className="table-subtitle">Tarjeta de regalo</p> : null}
                </td>
                <td><span className={redemptionStatusClass(redemption.status)}>{STATUS_LABELS[redemption.status]}</span></td>
                <td>
                  {formatDate(redemption.requestedAt)}
                  <p className="table-subtitle">
                    {redemption.readyAt
                      ? `Listo ${formatDate(redemption.readyAt)}`
                      : redemption.approvedAt
                        ? `Aprobado ${formatDate(redemption.approvedAt)}`
                        : redemption.expiresAt
                          ? `Vence ${formatDate(redemption.expiresAt)}`
                          : 'Sin vencimiento'}
                  </p>
                </td>
                <td>
                  <div className="customer-actions">
                    {redemption.status === 'SENT_TO_STORE' ? (
                      <>
                        {canMarkReady ? <button aria-label={`Marcar lista la solicitud ${redemption.requestCode}`} className="customer-icon-action" disabled={isSubmitting} onClick={() => void markReadyRedemption(redemption)} type="button"><PackageCheck size={16} /></button> : null}
                        {canReject ? <button aria-label={`Rechazar canje ${redemption.requestCode}`} className="customer-icon-action" disabled={isSubmitting} onClick={() => void rejectRedemption(redemption)} type="button"><XCircle size={16} /></button> : null}
                      </>
                    ) : null}
                    {redemption.status === 'READY' ? (
                      canMarkDelivered ? <button aria-label={`Marcar entregada la solicitud ${redemption.requestCode}`} className="customer-icon-action" disabled={isSubmitting} onClick={() => void markDeliveredRedemption(redemption)} type="button"><Star size={16} /></button> : null
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && redemptions.length === 0 ? <tr><td colSpan={6}>No hay canjes con los filtros actuales.</td></tr> : null}
            {isLoading ? <tr><td colSpan={6}>Cargando canjes...</td></tr> : null}
          </tbody>
        </table>

        <div className="customer-table-footer">
          <span>Mostrando página {formatNumber(meta.page)} de {formatNumber(meta.totalPages)} · {formatNumber(meta.total)} solicitudes</span>
          <div className="customer-pagination">
            <button disabled={meta.page === 1 || isLoading} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} type="button">‹</button>
            <button className="active" type="button">{formatNumber(meta.page)}</button>
            <button disabled={meta.page === meta.totalPages || isLoading} onClick={() => setCurrentPage((p) => Math.min(meta.totalPages, p + 1))} type="button">›</button>
          </div>
        </div>
      </article>

      {reasonModal ? (
        <ReasonModal state={reasonModal} isSubmitting={isSubmitting} onClose={() => setReasonModal(null)} />
      ) : null}
    </AdminRoutedShell>
  );
}
