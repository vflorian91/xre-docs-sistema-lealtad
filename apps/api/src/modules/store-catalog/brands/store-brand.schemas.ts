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

const codeSchema = z
  .string()
  .trim()
  .min(2)
  .max(60)
  .transform(normalizeCode)
  .refine((value) => value.length >= 2, 'El codigo de la marca no es valido.');

export const createStoreBrandSchema = z
  .object({
    name: z.string().trim().min(2).max(140),
    code: codeSchema,
    description: z.string().trim().max(500).nullable().optional(),
    logoUrl: z.string().trim().max(500).nullable().optional(),
    websiteUrl: z.string().trim().max(300).nullable().optional(),
    isActive: z.boolean().default(true),
    isFeatured: z.boolean().optional(),
  })
  .strict();

export const updateStoreBrandSchema = z
  .object({
    name: z.string().trim().min(2).max(140),
    code: codeSchema,
    description: z.string().trim().max(500).nullable().optional(),
    logoUrl: z.string().trim().max(500).nullable().optional(),
    websiteUrl: z.string().trim().max(300).nullable().optional(),
    isFeatured: z.boolean().optional(),
  })
  .partial()
  .strict();

export const updateStoreBrandStatusSchema = z
  .object({
    isActive: z.boolean(),
  })
  .strict();

export type CreateStoreBrandInput = z.infer<typeof createStoreBrandSchema>;
export type UpdateStoreBrandInput = z.infer<typeof updateStoreBrandSchema>;
export type UpdateStoreBrandStatusInput = z.infer<typeof updateStoreBrandStatusSchema>;
