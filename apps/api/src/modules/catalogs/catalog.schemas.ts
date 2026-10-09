import { z } from 'zod';

const codeSchema = z
  .string()
  .trim()
  .min(2)
  .max(50)
  .transform((value) => value.toUpperCase().replace(/\s+/g, '_'));

const cardTextColorSchema = z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/, 'Color de texto invalido.');

const socialNetworkSchema = z.object({
  url: z
    .string()
    .trim()
    .max(500)
    .refine((value) => !value || isValidExternalUrl(value), 'URL invalida.')
    .default(''),
  active: z.boolean().default(false),
});

export const brandSocialLinksSchema = z.object({
  facebook: socialNetworkSchema.optional(),
  instagram: socialNetworkSchema.optional(),
  tiktok: socialNetworkSchema.optional(),
  x: socialNetworkSchema.optional(),
  whatsapp: socialNetworkSchema.optional(),
  website: socialNetworkSchema.optional(),
});

export const createCatalogSchema = z.object({
  code: codeSchema,
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(250).optional(),
});

export const updateCatalogSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(250).nullable().optional(),
  isActive: z.boolean().optional(),
});

export const createCatalogItemSchema = z.object({
  code: codeSchema,
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(250).nullable().optional(),
  cardTextColor: cardTextColorSchema.optional(),
  socialLinks: brandSocialLinksSchema.optional(),
  allowsSubcatalog: z.boolean().optional(),
  parentItemId: z.string().cuid().optional().or(z.literal('').transform(() => undefined)),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
});

export const updateCatalogItemSchema = z.object({
  code: codeSchema.optional(),
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(250).nullable().optional(),
  cardTextColor: cardTextColorSchema.nullable().optional(),
  socialLinks: brandSocialLinksSchema.nullable().optional(),
  allowsSubcatalog: z.boolean().optional(),
  parentItemId: z.string().cuid().nullable().optional().or(z.literal('').transform(() => null)),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
});

export type CreateCatalogInput = z.output<typeof createCatalogSchema>;
export type UpdateCatalogInput = z.output<typeof updateCatalogSchema>;
export type CreateCatalogItemInput = z.output<typeof createCatalogItemSchema>;
export type UpdateCatalogItemInput = z.output<typeof updateCatalogItemSchema>;

function isValidExternalUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
