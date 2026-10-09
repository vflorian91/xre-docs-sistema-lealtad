export type NotificationMetadata = {
  redemptionRequestId?: string;
  bannerId?: string;
  productId?: string;
  event?: string;
} | null | undefined;

export function resolveNotificationTarget(metadata: NotificationMetadata): string | null {
  if (!metadata) return null;
  if (metadata.redemptionRequestId) return `/canjes/${metadata.redemptionRequestId}`;
  if (metadata.bannerId) return `/banners/${metadata.bannerId}`;
  if (metadata.productId) return `/premios/${metadata.productId}`;
  return null;
}
