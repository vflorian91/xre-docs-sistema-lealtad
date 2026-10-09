export const INTERNAL_USER_STATUSES = ['ACTIVE', 'INACTIVE', 'BLOCKED'] as const;
export const CUSTOMER_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export const STORE_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export const PURCHASE_STATUSES = ['APPROVED', 'PENDING_REVIEW', 'REJECTED', 'REVERSED'] as const;
export const POINT_MOVEMENT_TYPES = [
  'PURCHASE_EARNED',
  'PURCHASE_REVERSED',
  'ADMIN_ADJUSTMENT_POSITIVE',
  'ADMIN_ADJUSTMENT_NEGATIVE',
  'REDEMPTION_RESERVED',
  'REDEMPTION_USED',
  'REDEMPTION_RELEASED',
  'EXPIRED',
] as const;
export const POINT_MOVEMENT_STATUSES = ['AVAILABLE', 'PENDING', 'REVERSED', 'USED', 'EXPIRED'] as const;

export type InternalUserStatus = (typeof INTERNAL_USER_STATUSES)[number];
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];
export type StoreStatus = (typeof STORE_STATUSES)[number];
export type PurchaseStatus = (typeof PURCHASE_STATUSES)[number];
export type PointMovementType = (typeof POINT_MOVEMENT_TYPES)[number];
export type PointMovementStatus = (typeof POINT_MOVEMENT_STATUSES)[number];

export interface AuthenticatedActor {
  id: string;
  type: 'INTERNAL_USER' | 'CUSTOMER' | 'SYSTEM';
}
