import { z } from 'zod';
import { STORE_DELIVERY_TIME_RANGES } from './store-order.constants';

const deliveryTimeRangeSchema = z.enum(STORE_DELIVERY_TIME_RANGES);

export const reviewStoreOrderSchema = z
  .object({
    comment: z.string().trim().max(500).nullable().optional(),
  })
  .strict();

export const confirmStoreOrderSchema = z
  .object({
    confirmedDeliveryDate: z.coerce.date(),
    deliveryTimeRange: deliveryTimeRangeSchema,
    internalComment: z.string().trim().max(500).nullable().optional(),
  })
  .strict();

export const rescheduleStoreOrderSchema = z
  .object({
    newConfirmedDeliveryDate: z.coerce.date(),
    newDeliveryTimeRange: deliveryTimeRangeSchema,
    reason: z.string().trim().min(3).max(300),
    comment: z.string().trim().max(500).nullable().optional(),
  })
  .strict();

export const cancelStoreOrderSchema = z
  .object({
    reason: z.string().trim().min(3).max(300),
    comment: z.string().trim().max(500).nullable().optional(),
  })
  .strict();

const optionalCommentSchema = z.string().trim().max(700).nullable().optional();

export const reviewDeliveryIncidentSchema = z
  .object({
    adminResolution: z.string().trim().min(3).max(700),
    adminComment: optionalCommentSchema,
  })
  .strict();

export const rescheduleDeliveryIncidentSchema = z
  .object({
    scheduledDeliveryDate: z.coerce.date(),
    deliveryTimeRange: deliveryTimeRangeSchema,
    deliveryFee: z.coerce.number().nonnegative().optional(),
    adminComment: optionalCommentSchema,
    customerVisibleComment: z.string().trim().max(300).nullable().optional(),
  })
  .strict();

export const changeAddressDeliveryIncidentSchema = z
  .object({
    customerAddressId: z.string().trim().min(1).optional(),
    deliveryAddress: z.string().trim().min(5).max(300).optional(),
    deliveryReference: z.string().trim().max(300).nullable().optional(),
    deliveryPhone: z.string().trim().min(8).max(20).optional(),
    receiverName: z.string().trim().max(120).nullable().optional(),
    scheduledDeliveryDate: z.coerce.date(),
    deliveryTimeRange: deliveryTimeRangeSchema,
    reason: z.string().trim().min(3).max(300),
    adminComment: optionalCommentSchema,
    customerVisibleComment: z.string().trim().max(300).nullable().optional(),
  })
  .strict()
  .refine((value) => Boolean(value.customerAddressId || value.deliveryAddress?.trim()), {
    message: 'Selecciona una direccion del cliente o ingresa una direccion manual.',
    path: ['deliveryAddress'],
  });

export const cancelAfterIncidentSchema = z
  .object({
    cancellationReason: z.string().trim().min(3).max(300),
    adminComment: optionalCommentSchema,
    customerVisibleComment: z.string().trim().max(300).nullable().optional(),
    refundRequired: z.boolean().optional(),
    returnRequired: z.boolean().optional(),
  })
  .strict();

export type ReviewStoreOrderInput = z.infer<typeof reviewStoreOrderSchema>;
export type ConfirmStoreOrderInput = z.infer<typeof confirmStoreOrderSchema>;
export type RescheduleStoreOrderInput = z.infer<typeof rescheduleStoreOrderSchema>;
export type CancelStoreOrderInput = z.infer<typeof cancelStoreOrderSchema>;
export type ReviewDeliveryIncidentInput = z.infer<typeof reviewDeliveryIncidentSchema>;
export type RescheduleDeliveryIncidentInput = z.infer<typeof rescheduleDeliveryIncidentSchema>;
export type ChangeAddressDeliveryIncidentInput = z.infer<typeof changeAddressDeliveryIncidentSchema>;
export type CancelAfterIncidentInput = z.infer<typeof cancelAfterIncidentSchema>;
