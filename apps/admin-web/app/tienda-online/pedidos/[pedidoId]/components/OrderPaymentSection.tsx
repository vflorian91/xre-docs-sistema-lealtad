import { FileText } from 'lucide-react';
import { absoluteMediaUrl } from '../../../../lib/adminApi';
import { formatDate, formatMoney } from '../../../../lib/format';
import { PAYMENT_METHOD_LABELS, PaymentStatusBadge } from '../../components/OrderStatusBadges';

export type OrderPayment = {
  paymentMethod: string;
  paymentStatus: string;
  amount: number;
  authorizationCode?: string | null;
  voucherNumber?: string | null;
  referenceNumber?: string | null;
  visaLinkUrl?: string | null;
  paidAt?: string | null;
  receiptFileUrl?: string | null;
  receiptFileName?: string | null;
  confirmedByName?: string | null;
  settlementStatus?: string | null;
};

export default function OrderPaymentSection({ payment }: { payment: OrderPayment | null }) {
  if (!payment) {
    return (
      <section className="order-detail-card">
        <h3>Pago</h3>
        <p className="muted-copy">Este pedido no tiene un registro de pago.</p>
      </section>
    );
  }

  return (
    <section className="order-detail-card">
      <h3>Pago</h3>
      <div className="order-detail-row"><span>Metodo solicitado</span><strong>{PAYMENT_METHOD_LABELS[payment.paymentMethod] ?? payment.paymentMethod}</strong></div>
      <div className="order-detail-row"><span>Estado de pago</span><PaymentStatusBadge status={payment.paymentStatus} /></div>
      <div className="order-detail-row"><span>Monto</span><strong>Q{formatMoney(payment.amount)}</strong></div>
      {payment.visaLinkUrl ? (
        <div className="order-detail-row">
          <span>Visa Link</span>
          <a href={payment.visaLinkUrl} rel="noreferrer" target="_blank">{payment.visaLinkUrl}</a>
        </div>
      ) : null}
      {payment.authorizationCode ? <div className="order-detail-row"><span>Autorizacion</span><strong>{payment.authorizationCode}</strong></div> : null}
      {payment.voucherNumber ? <div className="order-detail-row"><span>Voucher</span><strong>{payment.voucherNumber}</strong></div> : null}
      {payment.referenceNumber ? <div className="order-detail-row"><span>Referencia</span><strong>{payment.referenceNumber}</strong></div> : null}
      {payment.paidAt ? <div className="order-detail-row"><span>Fecha de pago</span><strong>{formatDate(payment.paidAt)}</strong></div> : null}
      {payment.receiptFileUrl ? (
        <div className="order-detail-row">
          <span>Comprobante</span>
          <a href={absoluteMediaUrl(payment.receiptFileUrl)} rel="noreferrer" target="_blank">
            <FileText size={14} /> {payment.receiptFileName ?? 'Ver comprobante'}
          </a>
        </div>
      ) : null}
      {payment.confirmedByName ? <div className="order-detail-row"><span>Confirmado por</span><strong>{payment.confirmedByName}</strong></div> : null}
      {payment.settlementStatus ? <div className="order-detail-row"><span>Estado de liquidacion</span><strong>{payment.settlementStatus}</strong></div> : null}
    </section>
  );
}
