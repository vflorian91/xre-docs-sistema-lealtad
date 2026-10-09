import { z } from 'zod';

const phoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\s+/g, ''))
  .refine((value) => /^\d{8}$/.test(value), 'El telefono debe tener 8 digitos.');

export const createCustomerAddressSchema = z
  .object({
    label: z.string().trim().max(60).nullable().optional().or(z.literal('').transform(() => null)),
    addressType: z.enum(['CASA', 'TRABAJO', 'OFICINA', 'FAMILIA', 'OTRO']).default('CASA'),
    department: z.string().trim().min(1, 'El departamento es obligatorio.').max(120),
    municipality: z.string().trim().min(1, 'El municipio es obligatorio.').max(120),
    zone: z.string().trim().max(60).nullable().optional().or(z.literal('').transform(() => null)),
    addressLine: z.string().trim().min(5, 'La direccion exacta es obligatoria.').max(300),
    reference: z.string().trim().max(300).nullable().optional().or(z.literal('').transform(() => null)),
    postalCode: z.string().trim().max(20).nullable().optional().or(z.literal('').transform(() => null)),
    recipientName: z.string().trim().max(120).nullable().optional().or(z.literal('').transform(() => null)),
    contactPhone: phoneSchema,
    latitude: z.coerce.number().min(-90).max(90).nullable().optional(),
    longitude: z.coerce.number().min(-180).max(180).nullable().optional(),
    isDefault: z.boolean().optional(),
  })
  .strict();

export const updateCustomerAddressSchema = createCustomerAddressSchema.partial();

export type CreateCustomerAddressInput = z.infer<typeof createCustomerAddressSchema>;
export type UpdateCustomerAddressInput = z.infer<typeof updateCustomerAddressSchema>;
