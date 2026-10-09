import { z } from 'zod';

const numericAmountSchema = z.coerce
  .number()
  .positive('El monto debe ser mayor a cero.')
  .max(999999.99, 'El monto excede el limite permitido.');

const taxIdSchema = z
  .string()
  .trim()
  .min(2)
  .max(30)
  .transform((value) => value.toUpperCase().replace(/[^0-9A-Z-]/g, ''));

export const invoiceNumberSchema = z
  .string()
  .trim()
  .regex(/^\d+$/, 'El No. de factura debe contener solo numeros.')
  .min(6, 'El No. de factura debe tener al menos 6 digitos.')
  .max(15, 'El No. de factura debe tener como maximo 15 digitos.');

export const purchaseEntrySchema = z
  .object({
    customerId: z.string().cuid('Cliente invalido.'),
    customerTaxId: taxIdSchema,
    invoiceNumber: invoiceNumberSchema,
    externalSource: z.string().trim().min(2).max(80).optional(),
    externalInvoiceId: z.string().trim().min(2).max(120).optional(),
    amount: numericAmountSchema,
    shoeTypeId: z.string().cuid('Tipo de producto invalido.'),
    categoryId: z.string().cuid('Categoria invalida.').optional(),
    brandId: z.string().cuid('Marca invalida.').optional(),
  })
  .strict()
  .refine((value) => Boolean(value.externalSource) === Boolean(value.externalInvoiceId), {
    message: 'La fuente externa y el ID externo de factura deben enviarse juntos.',
    path: ['externalInvoiceId'],
  });

export const purchaseSearchSchema = z
  .object({
    customerId: z.string().cuid().optional(),
    search: z.string().trim().max(120).optional().or(z.literal('').transform(() => undefined)),
    invoiceNumber: z.string().trim().max(30).optional().or(z.literal('').transform(() => undefined)),
    status: z.enum(['APPROVED', 'PENDING_REVIEW', 'REJECTED', 'REVERSED']).optional().or(z.literal('').transform(() => undefined)),
    shoeTypeId: z.string().cuid().optional().or(z.literal('').transform(() => undefined)),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    scope: z.enum(['ACTIVE_STORE', 'ALL_ASSIGNED', 'ALL']).default('ACTIVE_STORE'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  })
  .strict();

export const reversePurchaseSchema = z
  .object({
    reason: z.string().trim().min(8, 'La razon debe tener al menos 8 caracteres.').max(240),
  })
  .strict();

export const approvePurchaseSchema = z
  .object({
    reason: z.string().trim().min(4).max(240).optional(),
  })
  .strict();

export const rejectPurchaseSchema = z
  .object({
    reason: z.string().trim().min(8, 'La razon debe tener al menos 8 caracteres.').max(240),
  })
  .strict();

export type PurchaseEntryInput = z.infer<typeof purchaseEntrySchema>;
export type PurchaseSearchInput = z.infer<typeof purchaseSearchSchema>;
export type ReversePurchaseInput = z.infer<typeof reversePurchaseSchema>;
export type ApprovePurchaseInput = z.infer<typeof approvePurchaseSchema>;
export type RejectPurchaseInput = z.infer<typeof rejectPurchaseSchema>;
