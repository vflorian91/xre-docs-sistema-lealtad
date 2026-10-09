'use client';

import { CheckCircle2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { clientStoreApiRequest, formatStoreMoney, getErrorText } from '../../lib/clientStoreApi';

type OrderDetail = {
  id: string;
  orderNumber: string;
  totalAmount: number;
  paymentMethodRequested: string;
  clientVisibleLabel: string;
};

const PAYMENT_LABELS: Record<string, string> = {
  EFECTIVO_CONTRA_ENTREGA: 'Efectivo contra entrega',
  VISA_LINK_MANUAL: 'Visa Link',
  TRANSFERENCIA_BANCARIA: 'Transferencia bancaria',
  DEPOSITO_BANCARIO: 'Depósito bancario',
};

export default function PagoPlaceholderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setIsLoading(false);
      return;
    }
    clientStoreApiRequest<OrderDetail>(`/pwa-client/store/orders/${orderId}`)
      .then(setOrder)
      .catch((err) => setError(getErrorText(err, 'No se pudo cargar el pedido.')))
      .finally(() => setIsLoading(false));
  }, [orderId]);

  return (
    <div className="store-screen">
      <header className="store-header">
        <h1>Pedido creado</h1>
      </header>
      <div className="store-content">
        {isLoading ? <div className="store-loading">Cargando...</div> : null}
        {error ? <div className="store-message error">{error}</div> : null}

        {order ? (
          <div className="store-summary-card" style={{ alignItems: 'center', textAlign: 'center', gap: 12 }}>
            <span className="store-success-icon"><CheckCircle2 size={40} /></span>
            <strong>Pedido {order.orderNumber}</strong>
            <p>Total: <strong>Q{formatStoreMoney(order.totalAmount)}</strong></p>
            <p>Método de pago: <strong>{PAYMENT_LABELS[order.paymentMethodRequested] ?? order.paymentMethodRequested}</strong></p>
            <p>Estado: <strong>{order.clientVisibleLabel}</strong></p>
            <p className="store-delivery-note">El siguiente paso (reportar/completar el pago) se habilitará en la pantalla de pago. Por ahora puedes seguir tu pedido desde Mis pedidos.</p>
            <button className="store-button-primary" onClick={() => router.push(`/tienda-online/mis-pedidos/${order.id}`)} type="button">Ver mi pedido</button>
            <button className="store-button-secondary" onClick={() => router.push('/tienda-online')} type="button">Seguir comprando</button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
