import { z } from 'zod';

export const registerStoreOrderVisaLinkSchema = z
  .object({
    visaLinkUrl: z
      .string()
      .trim()
      .min(8)
      .max(500)
      .refine((value) => {
        try {
          const url = new URL(value);
          return url.protocol === 'http:' || url.protocol === 'https:';
        } catch {
          return false;
        }
      }, 'El enlace de pago debe ser una URL valida.'),
    comment: z.string().trim().max(500).nullable().optional(),
  })
  .strict();

export const confirmStoreOrderPaymentSchema = z
  .object({
    amount: z.coerce.number().positive(),
    paidAt: z.coerce.date(),
    authorizationCode: z.string().trim().min(1).max(120).nullable().optional(),
    voucherNumber: z.string().trim().min(1).max(120).nullable().optional(),
    referenceNumber: z.string().trim().min(1).max(120).nullable().optional(),
    receiptFileUrl: z.string().trim().min(1).max(500).nullable().optional(),
    receiptFileName: z.string().trim().min(1).max(200).nullable().optional(),
    notes: z.string().trim().max(500).nullable().optional(),
  })
  .strict();

export const rejectStoreOrderPaymentSchema = z
  .object({
    reason: z.string().trim().min(3).max(300),
    comment: z.string().trim().max(500).nullable().optional(),
  })
  .strict();

export const markStoreOrderPaymentNoPaidSchema = z
  .object({
    reason: z.string().trim().min(3).max(300),
    comment: z.string().trim().max(500).nullable().optional(),
  })
  .strict();

export type RegisterStoreOrderVisaLinkInput = z.infer<typeof registerStoreOrderVisaLinkSchema>;
export type ConfirmStoreOrderPaymentInput = z.infer<typeof confirmStoreOrderPaymentSchema>;
export type RejectStoreOrderPaymentInput = z.infer<typeof rejectStoreOrderPaymentSchema>;
export type MarkStoreOrderPaymentNoPaidInput = z.infer<typeof markStoreOrderPaymentNoPaidSchema>;
