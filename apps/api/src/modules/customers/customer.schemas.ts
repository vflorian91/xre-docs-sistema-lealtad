import { z } from 'zod';

const phoneSchema = z
  .string()
  .trim()
  .min(8)
  .max(20)
  .transform((value) => value.replace(/\D/g, ''))
  .refine((value) => value.length >= 8 && value.length <= 15, 'El telefono debe tener entre 8 y 15 digitos.');

export const createCustomerSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: phoneSchema,
  taxId: z
    .string()
    .trim()
    .min(2)
    .max(30)
    .transform((value) => value.toUpperCase().replace(/[^0-9A-Z-]/g, ''))
    .optional()
    .or(z.literal('').transform(() => undefined)),
  password: z.string().min(8).max(120).optional(),
  email: z
    .string()
    .trim()
    .email()
    .transform((value) => value.toLowerCase())
    .optional()
    .or(z.literal('').transform(() => undefined)),
  birthDate: z.coerce.date().optional(),
  address: z.string().trim().min(2).max(240).optional(),
  zone: z.string().trim().max(80).optional().or(z.literal('').transform(() => undefined)),
  city: z.string().trim().max(120).optional().or(z.literal('').transform(() => undefined)),
  department: z.string().trim().max(120).optional().or(z.literal('').transform(() => undefined)),
  country: z.string().trim().max(120).optional().or(z.literal('').transform(() => undefined)),
  brand: z.string().trim().max(120).optional().or(z.literal('').transform(() => undefined)),
  brandItemId: z.string().cuid().optional().or(z.literal('').transform(() => undefined)),
  reference: z.string().trim().max(240).optional().or(z.literal('').transform(() => undefined)),
});

export const updateCustomerSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  phone: phoneSchema.optional(),
  taxId: z
    .string()
    .trim()
    .min(2)
    .max(30)
    .transform((value) => value.toUpperCase().replace(/[^0-9A-Z-]/g, ''))
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
  password: z.string().min(8).max(120).optional(),
  mustChangePassword: z.boolean().optional(),
  email: z
    .string()
    .trim()
    .email()
    .transform((value) => value.toLowerCase())
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
  birthDate: z.coerce.date().nullable().optional(),
  address: z.string().trim().min(2).max(240).nullable().optional(),
  zone: z.string().trim().max(80).nullable().optional().or(z.literal('').transform(() => null)),
  city: z.string().trim().max(120).nullable().optional().or(z.literal('').transform(() => null)),
  department: z.string().trim().max(120).nullable().optional().or(z.literal('').transform(() => null)),
  country: z.string().trim().max(120).nullable().optional().or(z.literal('').transform(() => null)),
  brand: z.string().trim().max(120).nullable().optional().or(z.literal('').transform(() => null)),
  brandItemId: z.string().cuid().nullable().optional().or(z.literal('').transform(() => null)),
  reference: z.string().trim().max(240).nullable().optional().or(z.literal('').transform(() => null)),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const searchCustomersSchema = z.object({
  q: z.string().trim().min(1).max(120).optional(),
  phone: phoneSchema.optional(),
  taxId: z
    .string()
    .trim()
    .min(2)
    .max(30)
    .transform((value) => value.toUpperCase().replace(/[^0-9A-Z-]/g, ''))
    .optional(),
  code: z.string().trim().min(1).max(30).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const listCustomersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(10),
  search: z.string().trim().max(120).optional().or(z.literal('').transform(() => undefined)),
  code: z.string().trim().max(30).optional().or(z.literal('').transform(() => undefined)),
  name: z.string().trim().max(120).optional().or(z.literal('').transform(() => undefined)),
  taxId: z.string().trim().max(30).optional().or(z.literal('').transform(() => undefined)),
  email: z.string().trim().max(160).optional().or(z.literal('').transform(() => undefined)),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional().or(z.literal('').transform(() => undefined)),
  level: z.enum(['Oro', 'Plata', 'Bronce', 'Básico']).optional().or(z.literal('').transform(() => undefined)),
  origin: z.string().trim().max(80).optional().or(z.literal('').transform(() => undefined)),
  exportAll: z
    .union([z.boolean(), z.enum(['true', 'false']).transform((value) => value === 'true')])
    .optional()
    .default(false),
});

export type CreateCustomerInput = z.output<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.output<typeof updateCustomerSchema>;
export type SearchCustomersInput = z.output<typeof searchCustomersSchema>;
export type ListCustomersInput = z.output<typeof listCustomersSchema>;
