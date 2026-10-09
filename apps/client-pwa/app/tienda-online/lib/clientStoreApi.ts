const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

function getCsrfCookie() {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|; )client_csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

let refreshPromise: Promise<void> | null = null;

async function refreshClientSession() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const response = await fetch(`${API_BASE}/auth/customer/refresh`, { method: 'POST', credentials: 'include' });
    if (!response.ok) {
      throw new Error('Sesion expirada. Ingresa nuevamente.');
    }
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

export async function clientStoreApiRequest<T>(path: string, options: RequestInit = {}, skipAuthRetry = false): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const buildHeaders = () => {
    const csrfToken = getCsrfCookie();
    return {
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && csrfToken ? { 'x-csrf-token': csrfToken } : {}),
      ...options.headers,
    };
  };

  let response = await fetch(`${API_BASE}${path}`, { ...options, credentials: 'include', cache: 'no-store', headers: buildHeaders() });

  if (response.status === 401 && !skipAuthRetry) {
    await refreshClientSession();
    response = await fetch(`${API_BASE}${path}`, { ...options, credentials: 'include', cache: 'no-store', headers: buildHeaders() });
  }

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const issueText = body?.issues?.map((issue: { message: string }) => issue.message).join(' ');
    throw new Error(issueText || body?.message || 'No se pudo completar la operacion.');
  }

  return body as T;
}

export function getErrorText(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function absoluteStoreMediaUrl(value?: string | null) {
  if (!value) return null;
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  return `${API_BASE.replace(/\/api$/, '')}${value}`;
}

export function formatStoreMoney(value: number) {
  return new Intl.NumberFormat('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

export function formatStoreDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

// ── Libreta de direcciones del cliente (base funcional para checkout y pantallas) ──
export type CustomerAddress = {
  id: string;
  label: string;
  addressType?: 'CASA' | 'TRABAJO' | 'OFICINA' | 'FAMILIA' | 'OTRO';
  department: string;
  municipality: string;
  zone?: string | null;
  addressLine: string;
  reference?: string | null;
  postalCode?: string | null;
  recipientName?: string | null;
  contactPhone: string;
  latitude?: number | null;
  longitude?: number | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CustomerAddressInput = {
  label?: string | null;
  addressType?: 'CASA' | 'TRABAJO' | 'OFICINA' | 'FAMILIA' | 'OTRO';
  department: string;
  municipality: string;
  zone?: string | null;
  addressLine: string;
  reference?: string | null;
  postalCode?: string | null;
  recipientName?: string | null;
  contactPhone: string;
  latitude?: number | null;
  longitude?: number | null;
  isDefault?: boolean;
};

const ADDRESSES_PATH = '/pwa-client/customer/addresses';

export function listCustomerAddresses() {
  return clientStoreApiRequest<CustomerAddress[]>(ADDRESSES_PATH);
}

export function getCustomerAddress(id: string) {
  return clientStoreApiRequest<CustomerAddress>(`${ADDRESSES_PATH}/${id}`);
}

export function createCustomerAddress(input: CustomerAddressInput) {
  return clientStoreApiRequest<CustomerAddress>(ADDRESSES_PATH, { method: 'POST', body: JSON.stringify(input) });
}

export function updateCustomerAddress(id: string, input: Partial<CustomerAddressInput>) {
  return clientStoreApiRequest<CustomerAddress>(`${ADDRESSES_PATH}/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function setDefaultCustomerAddress(id: string) {
  return clientStoreApiRequest<CustomerAddress>(`${ADDRESSES_PATH}/${id}/default`, { method: 'PATCH' });
}

export function inactivateCustomerAddress(id: string) {
  return clientStoreApiRequest<CustomerAddress>(`${ADDRESSES_PATH}/${id}/inactivate`, { method: 'PATCH' });
}

// ── Pago reportado por el cliente (Fase 4) ──
export type StorePaymentMethodOption = {
  value: string;
  label: string;
  requiresBankAccount: boolean;
  requiresProof: boolean;
};

export type StoreBankAccount = {
  id: string;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  accountType: string;
};

export function getPaymentMethods() {
  return clientStoreApiRequest<StorePaymentMethodOption[]>('/pwa-client/store/payment-methods');
}

export function getBankAccounts() {
  return clientStoreApiRequest<StoreBankAccount[]>('/pwa-client/store/bank-accounts');
}

export function reportDepositPayment(
  orderId: string,
  input: { selectedBankAccountId: string; receiptFileUrl: string; receiptFileName?: string; depositSlipNumber: string; notes?: string },
) {
  return clientStoreApiRequest(`/pwa-client/store/orders/${orderId}/payment/deposit`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function reportTransferPayment(
  orderId: string,
  input: { selectedBankAccountId: string; receiptFileUrl: string; receiptFileName?: string; authorizationNumber: string; notes?: string },
) {
  return clientStoreApiRequest(`/pwa-client/store/orders/${orderId}/payment/transfer`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export type VisaLinkInfo = {
  paymentStatus: string;
  visaLinkUrl: string | null;
  visaLinkSentAt: string | null;
  visaLinkRequestedAt: string | null;
  clientVisibleStatus: string;
  clientVisibleLabel: string;
};

export function requestVisaLink(orderId: string) {
  return clientStoreApiRequest(`/pwa-client/store/orders/${orderId}/payment/visa-link/request`, { method: 'POST' });
}

export function getVisaLink(orderId: string) {
  return clientStoreApiRequest<VisaLinkInfo>(`/pwa-client/store/orders/${orderId}/payment/visa-link`);
}

export function reportVisaLinkPayment(
  orderId: string,
  input: { receiptFileUrl: string; receiptFileName?: string; authorizationNumber: string; notes?: string },
) {
  return clientStoreApiRequest(`/pwa-client/store/orders/${orderId}/payment/visa-link/report`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

// Efectivo contra entrega: el cliente reporta cuánto efectivo tendrá disponible (no es pago recibido).
export function registerCashPayment(orderId: string, input: { cashAvailableAmount: number; notes?: string }) {
  return clientStoreApiRequest(`/pwa-client/store/orders/${orderId}/payment/cash`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

// ── Fase 5/6: pedido maestro multi-marca / agrupación por marca ──
export type StoreCartItem = {
  id: string;
  productId: string;
  variantId?: string | null;
  brandId: string;
  brandName: string;
  brandLogoUrl?: string | null;
  productName: string;
  variantLabel?: string | null;
  sku?: string | null;
  imageUrl?: string | null;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  availableStock: number;
  isAvailable: boolean;
};

export type StoreBrandGroupItem = StoreCartItem;

export type StoreBrandGroup<TItem = StoreCartItem> = {
  brandId: string;
  brandName: string;
  brandLogoUrl: string | null;
  subtotal: number;
  totalItems: number;
  items: TItem[];
  hasUnavailableItems?: boolean;
};

export type StoreCart = {
  id: string | null;
  items: StoreCartItem[];
  brandGroups: StoreBrandGroup[];
  subtotal: number;
  shippingAmount: number;
  total: number;
};

export type CheckoutPreview = {
  cartId: string;
  isBrandSelection: boolean;
  brandGroups: StoreBrandGroup[];
  items: StoreCartItem[];
  totalItems: number;
  subtotal: number;
  shippingAmount: number;
  total: number;
  hasUnavailableItems: boolean;
  selectedAddress: CustomerAddress | null;
};

export function getCart() {
  return clientStoreApiRequest<StoreCart>('/pwa-client/store/cart');
}

// Vista previa antes de crear el pedido (no crea nada). Sin selectedBrandIds = todo el carrito.
export function buildCheckoutPreview(input: { selectedBrandIds?: string[]; customerAddressId?: string } = {}) {
  return clientStoreApiRequest<CheckoutPreview>('/pwa-client/store/checkout/preview', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

// Crea el pedido maestro. Si se envían selectedBrandIds, solo esas marcas; el resto queda en el carrito.
export function createStoreOrder(input: {
  paymentMethodRequested: string;
  selectedBrandIds?: string[];
  customerAddressId?: string;
  deliveryAddress?: string;
  deliveryReference?: string | null;
  deliveryPhone?: string;
  receiverName?: string | null;
}) {
  return clientStoreApiRequest<{ id: string }>('/pwa-client/store/orders', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
