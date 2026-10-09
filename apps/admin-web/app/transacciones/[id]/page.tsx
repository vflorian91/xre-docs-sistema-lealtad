'use client';

import { ArrowLeft, Calendar, Receipt, RefreshCcw, Store, User, WalletCards } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import AdminRoutedShell from '../../AdminRoutedShell';
import { ReasonModal, ReasonModalState } from '../../components/ReasonModal';
import { adminApiRequest, getErrorText } from '../../lib/adminApi';
import { formatDate, formatMoney, formatNumber, formatTime } from '../../lib/format';

type PurchaseStatus = 'APPROVED' | 'PENDING_REVIEW' | 'REJECTED' | 'REVERSED' | string;

type PointMovement = {
  id: string;
  type: string;
  status: string;
  points: number;
  description?: string | null;
  createdAt: string;
};

type PurchaseDetail = {
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
    phone?: string;
    taxId?: string | null;
  };
  store: {
    id: string;
    code: string;
    name: string;
  };
  internalUser?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  pointMovements: PointMovement[];
};

function purchaseStatusLabel(status?: PurchaseStatus) {
  if (status === 'PENDING_REVIEW') return 'Pendiente revision';
  if (status === 'REJECTED') return 'Rechazada';
  if (status === 'REVERSED') return 'Reversada';
  return 'Aprobada';
}

function purchaseStatusClass(status?: PurchaseStatus) {
  if (status === 'PENDING_REVIEW') return 'badge amber';
  if (status === 'REJECTED' || status === 'REVERSED') return 'badge red';
  return 'badge green';
}

export default function TransaccionDetallePage() {
  const params = useParams<{ id: string }>();
  const purchaseId = params.id;
  const [purchase, setPurchase] = useState<PurchaseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [reasonState, setReasonState] = useState<ReasonModalState | null>(null);

  useEffect(() => {
    void loadPurchase();
  }, [purchaseId]);

  async function loadPurchase() {
    setIsLoading(true);
    setMessage(null);

    try {
      const result = await adminApiRequest<PurchaseDetail>(`/purchases/${purchaseId}`);
      setPurchase(result);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo cargar la transaccion.') });
    } finally {
      setIsLoading(false);
    }
  }

  function reversePurchase() {
    if (!purchase) return;
    setReasonState({
      title: `Reversar factura No. ${purchase.invoiceNumber}`,
      description: 'Indica la razon de la reversa. Esta accion revertira los puntos acreditados.',
      confirmLabel: 'Reversar',
      initialValue: 'Reversa administrativa de compra.',
      onConfirm: (reason) => applyReversePurchase(reason),
    });
  }

  async function applyReversePurchase(reason: string) {
    if (!purchase) return;
    setReasonState(null);
    setIsSubmitting(true);
    setMessage(null);

    try {
      await adminApiRequest(`/purchases/${purchase.id}/reverse`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      await loadPurchase();
      setMessage({ type: 'success', text: `Compra No. ${purchase.invoiceNumber} reversada correctamente.` });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo reversar la compra.') });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AdminRoutedShell title="Transacciones">
      <section className="customer-profile-page">
        <div className="customer-profile-page-header">
          <div>
            <a aria-label="Volver a transacciones" className="customer-back-button" href="/transacciones">
              <ArrowLeft size={22} />
            </a>
            <div>
              <h2>Detalle de transaccion</h2>
              <p>Consulta factura, cliente, tienda, puntos y movimientos asociados.</p>
            </div>
          </div>
          {purchase && purchase.status !== 'REVERSED' ? (
            <div className="customer-profile-actions">
              <button className="admin-secondary" disabled={isSubmitting} onClick={() => void reversePurchase()} type="button"><RefreshCcw size={16} /> Reversar</button>
            </div>
          ) : null}
        </div>

        {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}
        {isLoading ? <div className="form-success">Cargando transaccion...</div> : null}

        {purchase ? (
          <>
            <section className="customer-profile-hero">
              <div className="customer-avatar-large"><Receipt size={64} /></div>
              <div>
                <div className="customer-profile-name-row">
                  <h3>Factura No. {purchase.invoiceNumber}</h3>
                  <span className={purchaseStatusClass(purchase.status)}>{purchaseStatusLabel(purchase.status)}</span>
                </div>
                <div className="customer-profile-info-grid">
                  <span><Calendar size={16} /> {formatDate(purchase.purchasedAt)} · {formatTime(purchase.purchasedAt)}</span>
                  <span><User size={16} /> {purchase.customer.fullName} · {purchase.customer.code}</span>
                  <span><WalletCards size={16} /> NIT {purchase.customer.taxId ?? 'Sin NIT'}</span>
                  <span><Store size={16} /> {purchase.store.name} · {purchase.store.code}</span>
                  <span><WalletCards size={16} /> Q{formatMoney(purchase.amount)}</span>
                </div>
              </div>
            </section>

            <section className="customer-history-layout">
              <article className="customer-history-panel">
                <h3>Movimientos de puntos</h3>
                <table>
                  <thead><tr><th>Fecha</th><th>Tipo</th><th>Puntos</th><th>Estado</th><th>Descripcion</th></tr></thead>
                  <tbody>
                    {purchase.pointMovements.map((movement) => (
                      <tr key={movement.id}>
                        <td>{formatDate(movement.createdAt)}</td>
                        <td>{movement.type}</td>
                        <td>{formatNumber(movement.points)}</td>
                        <td><span className={movement.status === 'AVAILABLE' ? 'badge green' : 'badge red'}>{movement.status}</span></td>
                        <td>{movement.description || '-'}</td>
                      </tr>
                    ))}
                    {purchase.pointMovements.length === 0 ? <tr><td colSpan={5}>No hay movimientos asociados.</td></tr> : null}
                  </tbody>
                </table>
              </article>
            </section>
          </>
        ) : null}
      </section>
      {reasonState ? (
        <ReasonModal state={reasonState} onClose={() => setReasonState(null)} isSubmitting={isSubmitting} />
      ) : null}
    </AdminRoutedShell>
  );
}
