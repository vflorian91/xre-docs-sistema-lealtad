import { z } from 'zod';

const taxIdSchema = z
  .string()
  .trim()
  .min(2, 'Ingresa un NIT valido.')
  .max(32)
  .transform((value) => value.toUpperCase().replace(/[^0-9A-Z-]/g, ''));

export const createPromotionalCreditSchema = z
  .object({
    customerId: z.string().cuid('Cliente invalido.'),
    amount: z.coerce.number().positive('El monto debe ser mayor a cero.').max(999999.99, 'El monto excede el limite permitido.'),
    description: z.string().trim().min(4).max(240),
    expiresAt: z.coerce.date().optional(),
  })
  .strict();

export const convertPointsToBalanceSchema = z
  .object({
    customerId: z.string().cuid('Cliente invalido.'),
    points: z.coerce.number().int().positive('Los puntos deben ser mayores a cero.').max(999999, 'Los puntos exceden el limite permitido.'),
    description: z.string().trim().min(4).max(240).optional(),
    expiresAt: z.coerce.date().optional(),
  })
  .strict();

export const usePromotionalBalanceSchema = z
  .object({
    customerId: z.string().cuid('Cliente invalido.'),
    customerTaxId: taxIdSchema,
    amount: z.coerce.number().positive('El monto debe ser mayor a cero.').max(999999.99, 'El monto excede el limite permitido.'),
    description: z.string().trim().min(4).max(240).optional(),
    invoiceNumber: z
      .string()
      .trim()
      .regex(/^\d+$/, 'El No. de factura debe contener solo numeros.')
      .min(6)
      .max(15)
      .optional(),
  })
  .strict();

export type CreatePromotionalCreditInput = z.infer<typeof createPromotionalCreditSchema>;
export type ConvertPointsToBalanceInput = z.infer<typeof convertPointsToBalanceSchema>;
export type UsePromotionalBalanceInput = z.infer<typeof usePromotionalBalanceSchema>;
