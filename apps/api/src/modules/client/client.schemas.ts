import { z } from 'zod';

export const updateClientProfileSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120).optional(),
    firstName: z.string().trim().min(2).max(80).optional(),
    lastName: z.string().trim().min(2).max(80).optional(),
    phone: z
      .string()
      .trim()
      .min(8)
      .max(20)
      .transform((value) => value.replace(/\D/g, ''))
      .refine((value) => value.length === 8, 'El telefono debe tener exactamente 8 digitos.')
      .optional(),
    email: z.string().trim().email().transform((value) => value.toLowerCase()).optional(),
    address: z.string().trim().min(2).max(240).optional().or(z.literal('').transform(() => null)),
    zone: z.string().trim().max(80).nullable().optional().or(z.literal('').transform(() => null)),
    city: z.string().trim().max(120).optional().or(z.literal('').transform(() => null)),
    department: z.string().trim().max(120).optional().or(z.literal('').transform(() => null)),
    country: z.string().trim().max(120).optional().or(z.literal('').transform(() => null)),
    reference: z.string().trim().max(240).optional().or(z.literal('').transform(() => null)),
  })
  .strict();

export const scanInvoiceQrSchema = z
  .object({
    rawValue: z.string().trim().min(4, 'El QR no contiene informacion suficiente.').max(3000),
  })
  .strict();

export type UpdateClientProfileInput = z.output<typeof updateClientProfileSchema>;
export type ScanInvoiceQrInput = z.output<typeof scanInvoiceQrSchema>;
