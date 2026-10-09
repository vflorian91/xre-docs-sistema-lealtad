import { z } from 'zod';
import { STORE_SETTLEMENT_INCIDENT_REASONS } from './store-payment-settlement.constants';

export const createStorePaymentSettlementSchema = z
  .object({
    paymentIds: z.array(z.string().trim().min(1)).min(1, 'Debes seleccionar al menos un pago.'),
    settlementDate: z.coerce.date(),
    reference: z.string().trim().max(120).nullable().optional(),
    comment: z.string().trim().max(500).nullable().optional(),
  })
  .strict();

export const annulStorePaymentSettlementSchema = z
  .object({
    annulmentReason: z.string().trim().min(3).max(300),
  })
  .strict();

export const markStorePaymentSettlementIncidentSchema = z
  .object({
    reasonCode: z.enum(STORE_SETTLEMENT_INCIDENT_REASONS),
    comment: z.string().trim().max(500).nullable().optional(),
  })
  .strict()
  .refine((value) => value.reasonCode !== 'OTRO' || Boolean(value.comment?.trim()), {
    message: 'El comentario es obligatorio cuando el motivo es Otro.',
    path: ['comment'],
  });

export const releaseStorePaymentSettlementIncidentSchema = z
  .object({
    comment: z.string().trim().max(500).nullable().optional(),
  })
  .strict();

export type CreateStorePaymentSettlementInput = z.infer<typeof createStorePaymentSettlementSchema>;
export type AnnulStorePaymentSettlementInput = z.infer<typeof annulStorePaymentSettlementSchema>;
export type MarkStorePaymentSettlementIncidentInput = z.infer<typeof markStorePaymentSettlementIncidentSchema>;
export type ReleaseStorePaymentSettlementIncidentInput = z.infer<typeof releaseStorePaymentSettlementIncidentSchema>;
