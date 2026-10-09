'use client';

import { ArrowLeft, Eye, FileText } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import AdminRoutedShell from '../../../AdminRoutedShell';
import { ReasonModal, ReasonModalState } from '../../../components/ReasonModal';
import { absoluteMediaUrl, adminApiRequest, getErrorText, getStoredAdminUser } from '../../../lib/adminApi';
import { formatDate, formatMoney } from '../../../lib/format';
import { hasPermission } from '../../../lib/permissions';
import '../../pedidos/pedidos.css';
import { PAYMENT_METHOD_LABELS, SettlementStatusBadge } from '../components/SettlementStatusBadges';

type SettlementItem = {
  id: string;
  orderId: string;
  orderNumber: string;
  customer: { id: string; fullName: string; phone: string };
  driver?: { id: string; fullName: string } | null;
  amount: number;
  paymentMethod: string;
  authorizationCode?: string | null;
  voucherNumber?: string | null;
  referenceNumber?: string | null;
  paidAt?: string | null;
  receiptFileUrl?: string | null;
  receiptFileName?: string | null;
};

type SettlementDetail = {
  id: string;
  settlementNumber: string;
  settlementDate: string;
  paymentMethod: string | null;
  totalPayments: number;
  totalAmount: number;
  status: string;
  reference?: string | null;
  comment?: string | null;
  createdByName?: string | null;
  annulledByName?: string | null;
  annulledAt?: string | null;
  annulmentReason?: string | null;
  createdAt: string;
  items: SettlementItem[];
};

export default function LiquidacionDetallePage() {
  const params = useParams<{ liquidacionId: string }>();
  const settlementId = params.liquidacionId;
  const canAnnul = hasPermission(getStoredAdminUser()?.permissions, 'store_payment_settlements.annul');

  const [settlement, setSettlement] = useState<SettlementDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showAnnulModal, setShowAnnulModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void loadSettlement();
  }, [settlementId]);

  async function loadSettlement() {
    setIsLoading(true);
    setMessage(null);
    try {
      const result = await adminApiRequest<SettlementDetail>(`/admin/store/payment-settlements/${settlementId}`);
      setSettlement(result);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo cargar la liquidacion.') });
    } finally {
      setIsLoading(false);
    }
  }

  async function annul(annulmentReason: string) {
    setSubmitting(true);
    setMessage(null);
    try {
      await adminApiRequest(`/admin/store/payment-settlements/${settlementId}/annul`, {
        method: 'POST',
        body: JSON.stringify({ annulmentReason }),
      });
      setShowAnnulModal(false);
      await loadSettlement();
      setMessage({ type: 'success', text: 'Liquidacion anulada correctamente.' });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo anular la liquidacion.') });
    } finally {
      setSubmitting(false);
    }
  }

  const annulModalState: ReasonModalState = {
    title: 'Anular liquidación',
    description: 'Los pagos incluidos volveran a quedar pendientes de liquidar. Esta accion queda registrada para auditoria.',
    confirmLabel: 'Anular liquidación',
    onConfirm: annul,
  };

  return (
    <AdminRoutedShell title="Tienda Online">
      <div className="customer-profile-page">
        <div className="customer-profile-page-header">
          <div>
            <a aria-label="Volver a liquidaciones" className="customer-back-button" href="/tienda-online/liquidaciones-cobros">
              <ArrowLeft size={22} />
            </a>
            <div>
              <h2>Detalle de liquidación</h2>
              {settlement ? <p>{settlement.settlementNumber}</p> : null}
            </div>
          </div>
          {settlement && canAnnul && settlement.status === 'ACTIVA' ? (
            <div className="order-actions-row">
              <button className="order-action-button danger" onClick={() => setShowAnnulModal(true)} type="button">Anular liquidación</button>
            </div>
          ) : null}
        </div>

        {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}
        {isLoading ? <div className="form-success">Cargando liquidacion...</div> : null}

        {settlement ? (
          <>
            <section className="order-detail-card full-width">
              <div className="order-detail-row"><span>No. liquidacion</span><strong>{settlement.settlementNumber}</strong></div>
              <div className="order-detail-row"><span>Fecha</span><strong>{formatDate(settlement.settlementDate)}</strong></div>
              <div className="order-detail-row"><span>Estado</span><SettlementStatusBadge status={settlement.status} /></div>
              <div className="order-detail-row"><span>Monto total</span><strong>Q{formatMoney(settlement.totalAmount)}</strong></div>
              <div className="order-detail-row"><span>Cantidad de pagos</span><strong>{settlement.totalPayments}</strong></div>
              <div className="order-detail-row"><span>Referencia</span><strong>{settlement.reference || '-'}</strong></div>
              <div className="order-detail-row"><span>Comentario</span><strong>{settlement.comment || '-'}</strong></div>
              <div className="order-detail-row"><span>Creado por</span><strong>{settlement.createdByName ?? '-'}</strong></div>
              <div className="order-detail-row"><span>Fecha de creacion</span><strong>{formatDate(settlement.createdAt)}</strong></div>
              {settlement.status === 'ANULADA' ? (
                <>
                  <div className="order-detail-row"><span>Anulado por</span><strong>{settlement.annulledByName ?? '-'}</strong></div>
                  <div className="order-detail-row"><span>Fecha de anulacion</span><strong>{settlement.annulledAt ? formatDate(settlement.annulledAt) : '-'}</strong></div>
                  <div className="order-detail-row"><span>Motivo de anulacion</span><strong>{settlement.annulmentReason ?? '-'}</strong></div>
                </>
              ) : null}
            </section>

            <section className="order-detail-card full-width">
              <h3>Pagos incluidos</h3>
              <table className="order-items-table">
                <thead>
                  <tr>
                    <th>No. pedido</th>
                    <th>Cliente</th>
                    <th>Metodo</th>
                    <th>Monto</th>
                    <th>Referencia</th>
                    <th>Autorizacion</th>
                    <th>Comprobante</th>
                    <th>Fecha pago</th>
                    <th>Mensajero</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {settlement.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.orderNumber}</td>
                      <td>{item.customer.fullName}</td>
                      <td>{PAYMENT_METHOD_LABELS[item.paymentMethod] ?? item.paymentMethod}</td>
                      <td>Q{formatMoney(item.amount)}</td>
                      <td>{item.referenceNumber || '-'}</td>
                      <td>{item.authorizationCode || '-'}</td>
                      <td>
                        {item.receiptFileUrl ? (
                          <a href={absoluteMediaUrl(item.receiptFileUrl)} rel="noreferrer" target="_blank">
                            <FileText size={14} /> {item.receiptFileName ?? 'Ver'}
                          </a>
                        ) : '-'}
                      </td>
                      <td>{item.paidAt ? formatDate(item.paidAt) : '-'}</td>
                      <td>{item.paymentMethod === 'EFECTIVO_CONTRA_ENTREGA' ? item.driver?.fullName ?? 'Sin asignar' : '-'}</td>
                      <td>
                        <a aria-label={`Ver pedido ${item.orderNumber}`} className="customer-icon-action" href={`/tienda-online/pedidos/${item.orderId}`}>
                          <Eye size={16} />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        ) : null}
      </div>

      {showAnnulModal ? <ReasonModal isSubmitting={submitting} minLength={3} onClose={() => setShowAnnulModal(false)} state={annulModalState} /> : null}
    </AdminRoutedShell>
  );
}
