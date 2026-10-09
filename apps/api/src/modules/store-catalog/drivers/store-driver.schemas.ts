import { z } from 'zod';

function normalizeCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const phoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\s+/g, ''))
  .refine((value) => /^\d{8}$/.test(value), 'El telefono del mensajero debe tener 8 digitos.');

const optionalEmailSchema = z
  .string()
  .trim()
  .email()
  .nullable()
  .optional()
  .transform((value) => (value ? value.toLowerCase() : null));

const optionalCodeSchema = z
  .string()
  .trim()
  .max(60)
  .nullable()
  .optional()
  .transform((value) => {
    const normalized = value ? normalizeCode(value) : '';
    return normalized || null;
  });

export const createStoreDriverSchema = z
  .object({
    fullName: z.string().trim().min(2).max(140),
    phone: phoneSchema,
    email: optionalEmailSchema,
    code: optionalCodeSchema,
    type: z.string().trim().min(2).max(40).default('INTERNO'),
    notes: z.string().trim().max(500).nullable().optional(),
    vehiclePlate: z.string().trim().max(40).nullable().optional(),
    vehicleType: z.string().trim().max(40).nullable().optional(),
    vehicleBrand: z.string().trim().max(60).nullable().optional(),
    vehicleModel: z.string().trim().max(60).nullable().optional(),
    isActive: z.boolean().default(true),
  })
  .strict();

export const updateStoreDriverSchema = z
  .object({
    fullName: z.string().trim().min(2).max(140),
    phone: phoneSchema,
    email: optionalEmailSchema,
    code: optionalCodeSchema,
    type: z.string().trim().min(2).max(40),
    notes: z.string().trim().max(500).nullable().optional(),
    vehiclePlate: z.string().trim().max(40).nullable().optional(),
    vehicleType: z.string().trim().max(40).nullable().optional(),
    vehicleBrand: z.string().trim().max(60).nullable().optional(),
    vehicleModel: z.string().trim().max(60).nullable().optional(),
  })
  .partial()
  .strict();

export const updateStoreDriverStatusSchema = z
  .object({
    isActive: z.boolean(),
  })
  .strict();

export const upsertStoreDriverAccessSchema = z
  .object({
    email: z.string().trim().email().transform((value) => value.toLowerCase()),
    temporaryPassword: z.string().min(8, 'La contrasena temporal debe tener al menos 8 caracteres.'),
  })
  .strict();

export const resetStoreDriverPasswordSchema = z
  .object({
    temporaryPassword: z.string().min(8, 'La contrasena temporal debe tener al menos 8 caracteres.'),
  })
  .strict();

export const updateStoreDriverAccessStatusSchema = z
  .object({
    accessStatus: z.enum(['ACTIVO', 'BLOQUEADO', 'PENDIENTE_PRIMER_INGRESO', 'INACTIVO']),
  })
  .strict();

export type CreateStoreDriverInput = z.infer<typeof createStoreDriverSchema>;
export type UpdateStoreDriverInput = z.infer<typeof updateStoreDriverSchema>;
export type UpdateStoreDriverStatusInput = z.infer<typeof updateStoreDriverStatusSchema>;
export type UpsertStoreDriverAccessInput = z.infer<typeof upsertStoreDriverAccessSchema>;
export type ResetStoreDriverPasswordInput = z.infer<typeof resetStoreDriverPasswordSchema>;
export type UpdateStoreDriverAccessStatusInput = z.infer<typeof updateStoreDriverAccessStatusSchema>;
