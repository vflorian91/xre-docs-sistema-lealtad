'use client';

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export type DriverUser = {
  id: string;
  fullName: string;
  phone: string;
  email?: string | null;
  code?: string | null;
  accessStatus: string;
  isActive: boolean;
  mustChangePassword: boolean;
  type?: string | null;
  profilePhotoUrl?: string | null;
  operationalStatus?: string;
  activeDelivery?: { id: string; orderNumber: string } | null;
  metrics?: {
    deliveredToday: number;
    pendingDeliveries: number;
    pendingSettlementAmount: number;
    pendingSettlementCount: number;
  };
  vehicle?: {
    type?: string | null;
    plate?: string | null;
    brand?: string | null;
    model?: string | null;
    color?: string | null;
    status?: string | null;
  } | null;
  assignedZone?: string | null;
  assignedStore?: { id: string; code?: string | null; name: string } | null;
};

export type DeliverySummary = {
  id: string;
  orderNumber: string;
  customer: { id: string; fullName: string; phone: string };
  deliveryAddress: string;
  deliveryReference?: string | null;
  deliveryPhone: string;
  confirmedDeliveryDate?: string | null;
  deliveryTimeRange?: string | null;
  deliveryStatus: string;
  orderStatus: string;
  paymentMethodRequested: string;
  clientPaymentStatus: string;
  totalAmount: number;
  subtotalAmount?: number;
  itemsTotal?: number;
  itemsPicked?: number;
  payment?: { paymentMethod: string; paymentStatus: string } | null;
};

export type DeliveryDetail = DeliverySummary & {
  receiverName?: string | null;
  items: Array<{ id: string; brandName: string; productName: string; imageUrl?: string | null; unitPrice: number; quantity: number; subtotal: number }>;
  timeline: Array<{ statusType: string; previousStatus?: string | null; newStatus: string; comment?: string | null; createdByRole: string; createdAt: string }>;
  // FRD 08 — flujo lineal compartido (el motorista ve solo su sub-flujo).
  flow: DriverFlowStage[];
  flowCurrentStage: string | null;
  flowTerminal: 'DELIVERED' | 'CANCELLED' | null;
  flowIncident?: boolean;
  nextAction: DriverNextAction;
  deliveryLatitude?: number | null;
  deliveryLongitude?: number | null;
  deliveryZone?: string | null;
  deliveryCity?: string | null;
  cashAvailableAmount?: number | null;
  deliveryCodeStatus?: string | null;
  deliveryCodeGeneratedAt?: string | null;
  deliveryCodeValidatedAt?: string | null;
  deliveryCodeFailedAttempts?: number;
};

export type DriverFlowStage = {
  key: string;
  label: string;
  actor: 'CLIENT' | 'ADMIN' | 'DRIVER';
  status: 'COMPLETED' | 'CURRENT' | 'BLOCKED';
  action: string | null;
};

export type DriverNextAction = { stageKey: string; action: string; label: string } | null;

type DriverAuthResponse = { driver: DriverUser };

function getCookieValue(name: string) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function getStoredDriverUser() {
  if (typeof window === 'undefined') return null;
  const storedUser = window.sessionStorage.getItem('driverUser') ?? window.localStorage.getItem('driverUser');
  if (!storedUser) return null;
  try {
    return JSON.parse(storedUser) as DriverUser;
  } catch {
    return null;
  }
}

export function setDriverSession(result: DriverAuthResponse, rememberMe = true) {
  if (typeof window === 'undefined') return;
  const storage = rememberMe ? window.localStorage : window.sessionStorage;
  window.localStorage.removeItem('driverUser');
  window.sessionStorage.removeItem('driverUser');
  storage.setItem('driverUser', JSON.stringify(result.driver));
}

export function clearDriverSession() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem('driverUser');
  window.sessionStorage.removeItem('driverUser');
}

export async function driverApiRequest<T>(path: string, options: RequestInit = {}) {
  let response: Response;
  let body: unknown;

  try {
    response = await fetchDriver(path, options);
    body = await readJsonResponse(response);
  } catch (networkError) {
    throw new Error(translateNetworkError(networkError));
  }

  if (response.status === 401) {
    clearDriverSession();
  }

  if (!response.ok) {
    throw new Error(getApiErrorText(body, 'No se pudo completar la acción.'));
  }

  return body as T;
}

function fetchDriver(path: string, options: RequestInit) {
  const method = (options.method ?? 'GET').toUpperCase();
  const csrfToken = getCookieValue('driver_csrf');
  return fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    cache: 'no-store',
    headers: {
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(MUTATING_METHODS.has(method) && csrfToken ? { 'x-csrf-token': csrfToken } : {}),
      ...options.headers,
    },
  });
}

async function readJsonResponse(response: Response) {
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function getApiErrorText(body: unknown, fallback: string) {
  const candidate = body as { issues?: Array<{ message: string }>; message?: string } | null;
  const issueText = candidate?.issues?.map((issue) => issue.message).join(' ');
  return issueText || candidate?.message || fallback;
}

function translateNetworkError(error: unknown): string {
  if (!(error instanceof Error)) return 'No se pudo completar la acción.';
  const msg = error.message.toLowerCase();
  if (msg.includes('failed to fetch') || msg.includes('network request failed') || msg.includes('networkerror') || msg.includes('unable to connect')) {
    return 'No se pudo conectar con el servidor. Verifica tu conexión o intenta nuevamente.';
  }
  return error.message;
}

// Resuelve una URL de media (publicUrl relativo "/api/media/...") a absoluta para <img>.
export function mediaUrl(path?: string | null) {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const origin = API_BASE.replace(/\/api$/, '');
  return `${origin}${path.startsWith('/') ? '' : '/'}${path}`;
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.readAsDataURL(file);
  });
}

export async function uploadDriverPhoto(file: File) {
  const dataBase64 = await fileToBase64(file);
  return driverApiRequest<{ asset: { publicUrl: string }; driver: { id: string; profilePhotoUrl: string | null } }>(
    '/driver/profile/photo',
    {
      method: 'POST',
      body: JSON.stringify({ purpose: 'PROFILE_PHOTO', filename: file.name, mimeType: file.type, dataBase64 }),
    },
  );
}

// ── Liquidaciones ──
export type SettlementItem = { orderNumber: string; amount: number; status: string; paidAt: string | null };
export type SettlementDay = { date: string; total: number; count: number; pendingTotal: number; items: SettlementItem[] };
export type DriverSettlements = { pendingTotal: number; settledTotal: number; pendingCount: number; days: SettlementDay[] };

export function getSettlements() {
  return driverApiRequest<DriverSettlements>('/driver/settlements');
}

// ── Notificaciones ──
export type DriverNotification = {
  id: string;
  title: string;
  body: string;
  type: string;
  createdAt: string;
  isRead: boolean;
  readAt?: string | null;
};

export function getDriverNotifications() {
  return driverApiRequest<DriverNotification[]>('/driver/notifications');
}

export function getDriverUnreadCount() {
  return driverApiRequest<{ count: number }>('/driver/notifications/unread-count');
}

export function markDriverNotificationRead(id: string) {
  return driverApiRequest(`/driver/notifications/${id}/read`, { method: 'POST' });
}

export function markAllDriverNotificationsRead() {
  return driverApiRequest<{ updated: number }>('/driver/notifications/read-all', { method: 'POST' });
}

export function formatDate(value?: string | null) {
  if (!value) return 'Pendiente';
  return new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium' }).format(new Date(value));
}

// ── Recolección por producto (Fase 3) ──
export type PickupItem = {
  id: string;
  productName: string;
  brandName: string;
  imageUrl?: string | null;
  quantity: number;
  pickupStatus: string;
  pickedUpAt?: string | null;
  originStore?: { id: string; code: string; name: string; address?: string | null } | null;
};

export type PickupDetail = {
  orderId: string;
  orderNumber: string;
  items: PickupItem[];
  summary: { total: number; pendienteTienda: number; pendienteRecoleccion: number; recolectados: number; incidencias: number; cancelados: number };
  readyForDelivery: boolean;
  readyReason?: string | null;
};

export type PickupStop = {
  store: { id: string; code?: string | null; name: string; address?: string | null };
  orderCount: number;
  productCount: number;
  orders: Array<{
    id: string;
    orderNumber: string;
    customer: { id: string; fullName: string; phone: string };
    deliveryAddress: string;
    confirmedDeliveryDate?: string | null;
    deliveryTimeRange?: string | null;
    deliveryStatus: string;
    totalAmount: number;
    itemsTotal: number;
    itemsPicked: number;
    pendingItems: Array<{ id: string; productName: string; brandName: string; quantity: number; pickupStatus: string }>;
  }>;
};

export function getDeliveryPickup(orderId: string) {
  return driverApiRequest<PickupDetail>(`/driver/deliveries/${orderId}/pickup`);
}

export function getPickupStops() {
  return driverApiRequest<PickupStop[]>('/driver/pickup-stops');
}

export function markItemPickedUp(orderId: string, itemId: string, input: { note?: string; evidenceUrl?: string } = {}) {
  return driverApiRequest<PickupDetail>(`/driver/deliveries/${orderId}/items/${itemId}/mark-picked-up`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function completeDeliveryPickup(orderId: string) {
  return driverApiRequest<DeliveryDetail>(`/driver/deliveries/${orderId}/complete-pickup`, { method: 'POST' });
}

export function startDeliveryRoute(orderId: string) {
  return driverApiRequest<DeliveryDetail>(`/driver/deliveries/${orderId}/start-route`, { method: 'POST' });
}

// ── Incidencias (Slice B) ──
export type IncidentType = {
  code: string;
  label: string;
  description: string;
  requiresComment: boolean;
  recommendsPhoto: boolean;
  recommendsLocation: boolean;
};

export type ReportIncidentInput = {
  incidentType: string;
  affectedStoreId?: string;
  affectedOrderItemId?: string;
  comment?: string;
  evidencePhotoUrl?: string;
  latitude?: number;
  longitude?: number;
  addressText?: string;
};

export function getIncidentTypes() {
  return driverApiRequest<IncidentType[]>('/driver/incident-types');
}

export function reportIncident(orderId: string, input: ReportIncidentInput) {
  return driverApiRequest<DeliveryDetail>(`/driver/deliveries/${orderId}/incident`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(value);
}

// ── Navegación externa (Google Maps / Waze) ──
export type RouteTarget = { lat?: number | null; lng?: number | null; address?: string | null };

export function googleMapsUrl(target: RouteTarget) {
  if (target.lat != null && target.lng != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${target.lat},${target.lng}`;
  }
  const q = encodeURIComponent(target.address ?? '');
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

export function wazeUrl(target: RouteTarget) {
  if (target.lat != null && target.lng != null) {
    return `https://waze.com/ul?ll=${target.lat},${target.lng}&navigate=yes`;
  }
  const q = encodeURIComponent(target.address ?? '');
  return `https://waze.com/ul?q=${q}&navigate=yes`;
}

export function statusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDIENTE_PROGRAMACION: 'Pendiente programacion',
    PROGRAMADA: 'Programada',
    REPROGRAMADA: 'Reprogramada',
    PREPARANDO_PEDIDO: 'Preparando',
    ASIGNADA: 'Asignada',
    EN_RUTA: 'En ruta',
    ENTREGADA: 'Entregada',
    NO_ENTREGADA: 'No entregada',
    FALLIDA: 'Incidencia reportada',
    PENDIENTE_REPROGRAMACION: 'Pendiente reprogramación',
    CLIENTE_NO_LOCALIZADO: 'Cliente no localizado',
    ENTREGA_FALLIDA: 'Entrega fallida',
    CANCELADA: 'Cancelada',
    PAGO_CONFIRMADO: 'Pago confirmado',
    PENDIENTE_PAGO: 'Pendiente pago',
    PENDIENTE_LINK: 'Pendiente link',
    LINK_ENVIADO: 'Link enviado',
    NO_PAGADO: 'No pagado',
  };
  return labels[status] ?? status.replaceAll('_', ' ');
}
