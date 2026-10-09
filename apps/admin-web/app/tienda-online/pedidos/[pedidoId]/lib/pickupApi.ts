import { adminApiRequest } from '../../../../lib/adminApi';

export type AdminPickupItem = {
  id: string;
  productName: string;
  brandName: string;
  imageUrl?: string | null;
  quantity: number;
  pickupStatus: string;
  pickedUpAt?: string | null;
  pickupNote?: string | null;
  originStore?: { id: string; code: string; name: string } | null;
  pickedUpByDriver?: { id: string; fullName: string } | null;
};

export type AdminPickupSummary = {
  total: number;
  pendienteTienda: number;
  pendienteRecoleccion: number;
  recolectados: number;
  incidencias: number;
  cancelados: number;
};

export type AdminPickupDetail = {
  orderId: string;
  orderNumber: string;
  items: AdminPickupItem[];
  summary: AdminPickupSummary;
  readyForDelivery: boolean;
  readyReason?: string | null;
};

export function getOrderPickup(orderId: string) {
  return adminApiRequest<AdminPickupDetail>(`/admin/store/orders/${orderId}/pickup`);
}

export function getOrderPickupSummary(orderId: string) {
  return adminApiRequest<{ summary: AdminPickupSummary; readyForDelivery: boolean; readyReason?: string | null }>(
    `/admin/store/orders/${orderId}/pickup-summary`,
  );
}

export function assignOriginStore(orderId: string, itemId: string, storeId: string, note?: string) {
  return adminApiRequest<AdminPickupItem>(`/admin/store/orders/${orderId}/items/${itemId}/origin-store`, {
    method: 'PATCH',
    body: JSON.stringify({ storeId, note }),
  });
}

export function setItemPickupStatus(
  orderId: string,
  itemId: string,
  pickupStatus: 'PENDIENTE_RECOLECCION' | 'NO_DISPONIBLE' | 'SUSTITUCION_REQUERIDA' | 'CANCELADO',
  note?: string,
) {
  return adminApiRequest<AdminPickupItem>(`/admin/store/orders/${orderId}/items/${itemId}/pickup-status`, {
    method: 'PATCH',
    body: JSON.stringify({ pickupStatus, note }),
  });
}
