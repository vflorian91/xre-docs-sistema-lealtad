'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import AddressFormModal from '../../components/AddressFormModal';
import AddressSelector from '../../components/AddressSelector';
import CheckoutBrandSummary from '../../components/CheckoutBrandSummary';
import {
  buildCheckoutPreview,
  CheckoutPreview,
  createStoreOrder,
  CustomerAddress,
  formatStoreMoney,
  getErrorText,
  listCustomerAddresses,
} from '../../lib/clientStoreApi';

type PaymentMethod = 'EFECTIVO_CONTRA_ENTREGA' | 'VISA_LINK_MANUAL' | 'TRANSFERENCIA_BANCARIA' | 'DEPOSITO_BANCARIO';

const PAYMENT_OPTIONS: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'EFECTIVO_CONTRA_ENTREGA', label: 'Efectivo contra entrega' },
  { value: 'VISA_LINK_MANUAL', label: 'Visa Link' },
  { value: 'TRANSFERENCIA_BANCARIA', label: 'Transferencia bancaria' },
  { value: 'DEPOSITO_BANCARIO', label: 'Depósito bancario' },
];

export default function ResumenPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedBrandIds = useMemo(() => {
    const raw = searchParams.get('brands');
    return raw ? raw.split(',').map((id) => id.trim()).filter(Boolean) : [];
  }, [searchParams]);

  const [preview, setPreview] = useState<CheckoutPreview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('EFECTIVO_CONTRA_ENTREGA');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (selectedBrandIds.length === 0) {
      setIsLoading(false);
      setMessage({ type: 'error', text: 'No seleccionaste marcas. Vuelve al carrito.' });
      return;
    }
    void loadPreview();
    void loadAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadPreview() {
    setIsLoading(true);
    setMessage(null);
    try {
      const result = await buildCheckoutPreview({ selectedBrandIds });
      setPreview(result);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo cargar el resumen de tu compra.') });
    } finally {
      setIsLoading(false);
    }
  }

  async function loadAddresses() {
    setAddressesLoading(true);
    try {
      const result = await listCustomerAddresses();
      setAddresses(result);
      const preferred = result.find((address) => address.isDefault) ?? result[0];
      if (preferred) setSelectedAddressId((prev) => prev ?? preferred.id);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudieron cargar tus direcciones.') });
    } finally {
      setAddressesLoading(false);
    }
  }

  function handleAddressCreated(address: CustomerAddress) {
    setAddresses((prev) => [address, ...prev.filter((a) => a.id !== address.id)]);
    setSelectedAddressId(address.id);
    setShowAddressForm(false);
  }

  async function confirmOrder() {
    if (!selectedAddressId) {
      setMessage({ type: 'error', text: 'Selecciona una dirección de entrega para continuar.' });
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const order = await createStoreOrder({
        paymentMethodRequested: paymentMethod,
        selectedBrandIds,
        customerAddressId: selectedAddressId,
      });
      router.push(`/tienda-online/checkout/pago?orderId=${order.id}`);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo crear tu pedido.') });
      setSubmitting(false);
    }
  }

  return (
    <div className="store-screen">
      <header className="store-header">
        <button aria-label="Volver al carrito" className="store-back-link" onClick={() => router.push('/tienda-online/carrito')} type="button">
          <ArrowLeft size={18} />
        </button>
        <h1>Resumen de compra</h1>
      </header>

      <div className="store-content">
        {message ? <div className={`store-message ${message.type}`}>{message.text}</div> : null}
        {isLoading ? <div className="store-loading">Cargando resumen...</div> : null}

        {!isLoading && preview ? (
          <>
            <CheckoutBrandSummary brandGroups={preview.brandGroups} />

            <div className="store-summary-card">
              <div className="store-summary-row"><span>Productos</span><span>{preview.totalItems}</span></div>
              <div className="store-summary-row"><span>Subtotal</span><span>Q{formatStoreMoney(preview.subtotal)}</span></div>
              <div className="store-summary-row"><span>Envío</span><span>Q{formatStoreMoney(preview.shippingAmount)}</span></div>
              <div className="store-summary-row is-total"><span>Total a pagar</span><span>Q{formatStoreMoney(preview.total)}</span></div>
            </div>

            <div className="store-summary-card">
              <strong>Dirección de entrega</strong>
              <AddressSelector
                addresses={addresses}
                loading={addressesLoading}
                onAddNew={() => setShowAddressForm(true)}
                onSelect={setSelectedAddressId}
                selectedId={selectedAddressId}
              />
            </div>

            <div className="store-summary-card">
              <strong>Método de pago</strong>
              <div className="store-payment-options">
                {PAYMENT_OPTIONS.map((option) => (
                  <label className={`store-payment-option${paymentMethod === option.value ? ' is-selected' : ''}`} key={option.value}>
                    <input
                      checked={paymentMethod === option.value}
                      name="paymentMethod"
                      onChange={() => setPaymentMethod(option.value)}
                      type="radio"
                    />
                    <span className="store-payment-option-text"><strong>{option.label}</strong></span>
                  </label>
                ))}
              </div>
              <p className="store-delivery-note">Completarás el pago en el siguiente paso. El equipo coordina y confirma la fecha de entrega.</p>
            </div>

            <button className="store-button-primary" disabled={submitting || !selectedAddressId} onClick={confirmOrder} type="button">
              {submitting ? 'Creando pedido...' : 'Confirmar pedido'}
            </button>
            <button className="store-button-secondary" onClick={() => router.push('/tienda-online/carrito')} type="button">Volver al carrito</button>
          </>
        ) : null}
      </div>

      {showAddressForm ? <AddressFormModal onClose={() => setShowAddressForm(false)} onCreated={handleAddressCreated} /> : null}
    </div>
  );
}
