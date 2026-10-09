import { z } from 'zod';

export const invoiceNumberSchema = z
  .string()
  .trim()
  .regex(/^\d+$/, 'El No. de factura debe contener solo numeros.')
  .min(6, 'El No. de factura debe tener al menos 6 digitos.')
  .max(15, 'El No. de factura debe tener como maximo 15 digitos.');

export const moneyAmountSchema = z.coerce
  .number()
  .positive('El monto debe ser mayor a cero.')
  .max(999999.99, 'El monto excede el limite permitido.');

export function normalizeInvoiceNumber(value: string): string {
  return value.replace(/\D/g, '');
}
