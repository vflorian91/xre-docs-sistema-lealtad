import { z } from 'zod';

export const requestRedemptionSchema = z
  .object({
    productId: z.string().trim().min(1, 'Selecciona un producto.'),
    pickupStoreId: z.string().trim().min(1).optional(),
  })
  .strict();

export const redeemPointsByAmountSchema = z
  .object({
    customerId: z.string().trim().min(1, 'Selecciona un cliente.'),
    points: z.coerce.number().int().positive('Ingresa una cantidad de puntos mayor a cero.').max(99999999),
    description: z.string().trim().max(240).optional(),
  })
  .strict();

export const listRedemptionsSchema = z
  .object({
    status: z.enum(['PENDING_APPROVAL', 'APPROVED', 'SENT_TO_STORE', 'READY', 'DELIVERED', 'REJECTED', 'CANCELLED', 'EXPIRED']).optional(),
    workflow: z.enum(['STORE_ACTIVE']).optional(),
    requestCode: z.string().trim().max(40).optional(),
    customerId: z.string().trim().optional(),
    customer: z.string().trim().max(120).optional(),
    product: z.string().trim().max(160).optional(),
    store: z.string().trim().max(120).optional(),
    requestedAt: z.string().trim().max(10).optional(),
    deliveredAt: z.string().trim().max(10).optional(),
    take: z.coerce.number().int().min(1).max(100).default(10),
    page: z.coerce.number().int().min(1).default(1),
  })
  .strict();

export const reasonSchema = z
  .object({
    reason: z.string().trim().min(8, 'La razon debe tener al menos 8 caracteres.').max(240),
  })
  .strict();

export const transitionCommentSchema = z
  .object({
    comment: z.string().trim().max(500).optional(),
  })
  .strict();

export const deliverRedemptionSchema = z
  .object({
    deliveredToName: z.string().trim().min(2, 'Ingresa quien recibe el canje.').max(160).optional(),
    observation: z.string().trim().max(500).optional(),
    validationCode: z.string().trim().max(80).optional(),
    evidenceUrl: z.string().trim().max(500).optional(),
  })
  .strict();

export const confirmDeliverySchema = z
  .object({
    code: z.string().trim().min(1, 'Código de canje requerido.').max(160),
  })
  .strict();

export const cancelRedemptionSchema = reasonSchema;
export const rejectRedemptionSchema = reasonSchema;

export type RequestRedemptionInput = z.infer<typeof requestRedemptionSchema>;
export type RedeemPointsByAmountInput = z.infer<typeof redeemPointsByAmountSchema>;
export type ListRedemptionsInput = z.infer<typeof listRedemptionsSchema>;
export type CancelRedemptionInput = z.infer<typeof cancelRedemptionSchema>;
export type RejectRedemptionInput = z.infer<typeof rejectRedemptionSchema>;
export type TransitionCommentInput = z.infer<typeof transitionCommentSchema>;
export type DeliverRedemptionInput = z.infer<typeof deliverRedemptionSchema>;
export type ConfirmDeliveryInput = z.infer<typeof confirmDeliverySchema>;
