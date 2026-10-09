import { z } from 'zod';

const baseReport = {
  selectedBankAccountId: z.string().trim().min(1, 'Selecciona una cuenta bancaria.'),
  receiptFileUrl: z.string().trim().min(1, 'El comprobante es obligatorio.').max(500),
  receiptFileName: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(300).optional(),
};

export const reportDepositSchema = z
  .object({
    ...baseReport,
    depositSlipNumber: z.string().trim().min(1, 'El número de boleta es obligatorio.').max(60),
  })
  .strict();

export const reportTransferSchema = z
  .object({
    ...baseReport,
    authorizationNumber: z.string().trim().min(1, 'El número de autorización es obligatorio.').max(60),
  })
  .strict();

export const reportVisaLinkSchema = z
  .object({
    receiptFileUrl: z.string().trim().min(1, 'El comprobante es obligatorio.').max(500),
    receiptFileName: z.string().trim().max(200).optional(),
    authorizationNumber: z.string().trim().min(1, 'El número de autorización es obligatorio.').max(60),
    notes: z.string().trim().max(300).optional(),
  })
  .strict();

export const registerCashSchema = z
  .object({
    cashAvailableAmount: z
      .number({ invalid_type_error: 'Ingresa el monto en efectivo.' })
      .positive('El monto en efectivo debe ser mayor a 0.')
      .max(1_000_000, 'El monto en efectivo no es válido.'),
    notes: z.string().trim().max(300).optional(),
  })
  .strict();

export type ReportDepositInput = z.infer<typeof reportDepositSchema>;
export type ReportTransferInput = z.infer<typeof reportTransferSchema>;
export type ReportVisaLinkInput = z.infer<typeof reportVisaLinkSchema>;
export type RegisterCashInput = z.infer<typeof registerCashSchema>;
