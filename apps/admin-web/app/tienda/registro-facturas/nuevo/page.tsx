'use client';

import { ArrowLeft, FilePlus2, Receipt, Search, UserCheck, WalletCards } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import AdminRoutedShell from '../../../AdminRoutedShell';
import { adminApiRequest, getErrorText, getStoredAdminUser, StoredAdminUser } from '../../../lib/adminApi';
import { formatMoney, formatNumber } from '../../../lib/format';

type CatalogItem = {
  id: string;
  name: string;
  isActive: boolean;
};

type CatalogResponse = {
  items: CatalogItem[];
};

type CustomerLookup = {
  id: string;
  code: string;
  fullName: string;
  taxId?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
  loyaltyLevel?: string;
  availablePoints?: number;
};

type PurchaseResult = {
  purchase: {
    invoiceNumber: string;
    amount: string;
    pointsCalculated: number;
    status?: 'APPROVED' | 'PENDING_REVIEW' | 'REJECTED' | 'REVERSED';
  };
};

function customerStatusLabel(status: CustomerLookup['status']) {
  if (status === 'ACTIVE') return 'Activo';
  if (status === 'INACTIVE') return 'Inactivo';
  return 'Bloqueado';
}

export default function NuevaFacturaPage() {
  const [user, setUser] = useState<StoredAdminUser | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [taxId, setTaxId] = useState('');
  const [amount, setAmount] = useState('');
  const [shoeTypeId, setShoeTypeId] = useState('');
  const [shoeTypes, setShoeTypes] = useState<CatalogItem[]>([]);
  const [customer, setCustomer] = useState<CustomerLookup | null>(null);
  const [customerMessage, setCustomerMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLookingUpCustomer, setIsLookingUpCustomer] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const activeStore = user?.stores?.find((store) => store.id === user.activeStoreId) ?? user?.stores?.[0];
  const numericAmount = Number(amount || 0);

  useEffect(() => {
    setUser(getStoredAdminUser());
    void loadCatalogs();
  }, []);

  async function loadCatalogs() {
    try {
      const result = await adminApiRequest<CatalogResponse>('/catalogs/SHOE_TYPES');
      setShoeTypes(result.items.filter((item) => item.isActive));
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo cargar el catalogo de tipos de calzado.') });
    }
  }

  async function lookupCustomer() {
    const normalizedTaxId = normalizeTaxId(taxId);
    setCustomer(null);
    setCustomerMessage(null);

    if (!normalizedTaxId) {
      setCustomerMessage('Ingrese el NIT del cliente.');
      return;
    }

    setIsLookingUpCustomer(true);

    try {
      const params = new URLSearchParams({ taxId: normalizedTaxId });
      const result = await adminApiRequest<CustomerLookup[]>(`/customers?${params.toString()}`);
      const foundCustomer = result[0] ?? null;

      if (!foundCustomer) {
        setCustomerMessage('No se encontro un cliente registrado con este NIT. Verifique la informacion o registre primero al cliente.');
        return;
      }

      setCustomer(foundCustomer);
      if (foundCustomer.status !== 'ACTIVE') {
        setCustomerMessage('El cliente se encuentra inactivo y no puede acumular puntos.');
      }
    } catch (error) {
      setCustomerMessage(getErrorText(error, 'No se pudo buscar el cliente.'));
    } finally {
      setIsLookingUpCustomer(false);
    }
  }

  async function registerInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!user?.activeStoreId) {
      setMessage({ type: 'error', text: 'El usuario no tiene una tienda asignada. Comuniquese con el administrador.' });
      return;
    }

    if (!customer || customer.status !== 'ACTIVE') {
      setMessage({ type: 'error', text: 'Debe buscar y confirmar un cliente activo antes de registrar la factura.' });
      return;
    }

    if (!invoiceNumber.trim() || !taxId.trim() || !shoeTypeId || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      setMessage({ type: 'error', text: 'Complete No. de factura, NIT, monto mayor a cero y tipo de calzado.' });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await adminApiRequest<PurchaseResult>('/purchases', {
        method: 'POST',
        body: JSON.stringify({
          customerId: customer.id,
          customerTaxId: customer.taxId ?? normalizeTaxId(taxId),
          invoiceNumber: invoiceNumber.trim(),
          amount: numericAmount,
          shoeTypeId,
        }),
      });

      setMessage({
        type: 'success',
        text: result.purchase.status === 'PENDING_REVIEW'
          ? `Factura registrada para revision. Puntos estimados: ${formatNumber(result.purchase.pointsCalculated)}.`
          : `Factura registrada correctamente. Se acreditaron ${formatNumber(result.purchase.pointsCalculated)} puntos al cliente.`,
      });
      setTimeout(() => {
        window.location.href = '/tienda/registro-facturas';
      }, 700);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo registrar la factura.') });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AdminRoutedShell title="Registrar factura">
      <form className="customer-edit-page" onSubmit={registerInvoice}>
        <div className="customer-edit-header">
          <a aria-label="Regresar a registro de facturas" className="customer-back-button" href="/tienda/registro-facturas">
            <ArrowLeft size={20} />
          </a>
          <div>
            <h2>Registrar factura</h2>
            <p>Registra una compra de la tienda asignada y acredita puntos al cliente.</p>
          </div>
        </div>

        {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}

        <section className="panel customer-edit-hero">
          <div className="customer-edit-photo-block">
            <div className="customer-avatar-large">
              <Receipt size={64} />
            </div>
          </div>

          <div className="customer-edit-summary">
            <h3>Nueva factura</h3>
            <p>Tienda activa</p>
            <strong className="customer-code-inline">{activeStore ? `${activeStore.name} (${activeStore.code})` : 'Sin tienda asignada'}</strong>
            <div className="customer-edit-summary-grid">
              <div className="customer-edit-summary-item">
                <span>Estado</span>
                <strong className="summary-green">Registrada al guardar</strong>
              </div>
              <div className="customer-edit-summary-item">
                <span>Monto</span>
                <strong><WalletCards size={16} /> Q{formatMoney(numericAmount)}</strong>
              </div>
              <div className="customer-edit-summary-item">
                <span>Cliente</span>
                <strong>{customer?.fullName ?? 'Pendiente'}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="customer-edit-sections">
          <article className="panel customer-edit-card">
            <h3><Receipt size={18} /> Datos de factura</h3>
            <div className="customer-edit-fields two">
              <label>
                No. de factura <b>*</b>
                <input inputMode="numeric" placeholder="000001" required value={invoiceNumber} onChange={(event) => setInvoiceNumber(event.target.value)} />
              </label>
              <label>
                Monto de factura <b>*</b>
                <input inputMode="decimal" min="0.01" placeholder="Q 0.00" required step="0.01" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} />
              </label>
              <label>
                Tipo de calzado <b>*</b>
                <select required value={shoeTypeId} onChange={(event) => setShoeTypeId(event.target.value)}>
                  <option value="">Selecciona una opcion</option>
                  {shoeTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
            </div>
          </article>

          <article className="panel customer-edit-card">
            <h3><UserCheck size={18} /> Cliente</h3>
            <div className="customer-edit-fields two">
              <label>
                NIT del cliente <b>*</b>
                <span className="invoice-customer-search">
                  <input placeholder="NIT" required value={taxId} onBlur={() => void lookupCustomer()} onChange={(event) => setTaxId(normalizeTaxId(event.target.value))} />
                  <button aria-label="Buscar cliente" className="customer-icon-action" disabled={isLookingUpCustomer} onClick={() => void lookupCustomer()} type="button">
                    <Search size={16} />
                  </button>
                </span>
              </label>
            </div>

            {customer ? (
              <div className={customer.status === 'ACTIVE' ? 'form-success' : 'form-error'}>
                {customer.fullName} · {customer.code} · Nivel {customer.loyaltyLevel ?? 'Basico'} · {customerStatusLabel(customer.status)}
              </div>
            ) : null}
            {customerMessage ? <div className="form-error">{customerMessage}</div> : null}
          </article>
        </section>

        <div className="customer-edit-bottom-actions">
          <a className="admin-secondary" href="/tienda/registro-facturas">Cancelar</a>
          <button className="admin-primary" disabled={isSubmitting || isLookingUpCustomer} type="submit">
            <FilePlus2 size={16} />
            {isSubmitting ? 'Registrando...' : 'Registrar factura'}
          </button>
        </div>
      </form>
    </AdminRoutedShell>
  );
}

function normalizeTaxId(value: string) {
  return value.toUpperCase().replace(/[^0-9A-Z-]/g, '');
}
