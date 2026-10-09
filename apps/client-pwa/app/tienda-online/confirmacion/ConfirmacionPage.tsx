'use client';

import { CheckCircle2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { clientStoreApiRequest, formatStoreMoney, getErrorText } from '../lib/clientStoreApi';

type OrderDetail = {
  orderNumber: string;
  totalAmount: number;
  suggestedDeliveryDate: string;
  paymentMethodRequested: string;
};

const PAYMENT_LABELS: Record<string, string> = {
  EFECTIVO_CONTRA_ENTREGA: 'Efectivo contra entrega',
  VISA_LINK_MANUAL: 'Visa Link',
  TRANSFERENCIA_BANCARIA: 'Transferencia bancaria',
  DEPOSITO_BANCARIO: 'Deposito bancario',
};

const PAYMENT_FOLLOW_UP_MESSAGES: Record<string, string> = {
  EFECTIVO_CONTRA_ENTREGA: 'El pago se realizara en efectivo al momento de recibir tu pedido.',
  VISA_LINK_MANUAL: 'Nuestro equipo generara un enlace de pago y te lo compartira para completar tu compra.',
  TRANSFERENCIA_BANCARIA: 'Realiza la transferencia bancaria y comparte el comprobante para que nuestro equipo confirme tu pago.',
  DEPOSITO_BANCARIO: 'Realiza el deposito bancario y comparte el comprobante para que nuestro equipo confirme tu pago.',
};

export default function ConfirmacionPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!orderId) {
      setIsLoading(false);
      return;
    }
    clientStoreApiRequest<OrderDetail>(`/pwa-client/store/orders/${orderId}`)
      .then((result) => setOrder(result))
      .catch((error) => setMessage({ type: 'error', text: getErrorText(error, 'No se pudo cargar el pedido.') }))
      .finally(() => setIsLoading(false));
  }, [orderId]);

  return (
    <div className="store-screen">
      <header className="store-header">
        <h1>Pedido confirmado</h1>
      </header>

      <div className="store-content">
        {message ? <div className={`store-message ${message.type}`}>{message.text}</div> : null}
        {isLoading ? <div className="store-loading">Cargando...</div> : null}

        {order ? (
          <div className="store-summary-card" style={{ alignItems: 'center', textAlign: 'center' }}>
            <div className="store-success-icon"><CheckCircle2 size={56} /></div>
            <h2>Tu pedido fue solicitado correctamente</h2>
            <p>Pedido: <strong>{order.orderNumber}</strong></p>
            <p>Total: <strong>Q{formatStoreMoney(order.totalAmount)}</strong></p>
            <p>Metodo de pago: <strong>{PAYMENT_LABELS[order.paymentMethodRequested] ?? order.paymentMethodRequested}</strong></p>
            <p>{PAYMENT_FOLLOW_UP_MESSAGES[order.paymentMethodRequested]}</p>
            <p>Nuestro equipo coordinara y confirmara la fecha de entrega segun disponibilidad.</p>
            <a className="store-button-primary" href={`/tienda-online/mis-pedidos/${orderId}`} style={{ textAlign: 'center' }}>Ver mi pedido</a>
            <a className="store-button-secondary" href="/tienda-online">Volver a tienda</a>
          </div>
        ) : null}
      </div>
    </div>
  );
}
