import { z } from 'zod';
import { STORE_GENDER_TARGET_CODES, STORE_PRODUCT_TYPE_CODES } from '../store-catalog/products/product-classification.constants';

const imageUrlSchema = z
  .string()
  .trim()
  .max(500)
  .refine((value) => {
    if (value.startsWith('/')) return true;

    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }, 'La URL de imagen debe ser una URL valida o una ruta interna.');

export const createRewardSchema = z
  .object({
    code: z.string().trim().min(2).max(40).transform((value) => value.toUpperCase()),
    name: z.string().trim().min(2).max(140),
    description: z.string().trim().max(500).optional(),
    pointsValue: z.coerce.number().int().positive().max(9999999),
    stock: z.coerce.number().int().min(0).max(999999).nullable().optional(),
    imageUrl: imageUrlSchema.nullable().optional(),
    categoryItemId: z.string().trim().min(1).nullable().optional(),
    brandItemId: z.string().trim().min(1).nullable().optional(),
    productType: z.enum(STORE_PRODUCT_TYPE_CODES).nullable().optional(),
    genderTarget: z.enum(STORE_GENDER_TARGET_CODES).nullable().optional(),
    isActive: z.boolean().default(true),
    isFeatured: z.boolean().default(false),
    requiresApproval: z.boolean().default(true),
    isGiftCard: z.boolean().default(false),
    displayOrder: z.coerce.number().int().min(0).default(0),
    isPublished: z.boolean().default(true),
    publishStartDate: z.coerce.date().nullable().optional(),
    publishEndDate: z.coerce.date().nullable().optional(),
    redemptionLimitPerCustomer: z.coerce.number().int().positive().max(999).nullable().optional(),
    termsConditions: z.string().trim().max(2000).nullable().optional(),
  })
  .strict()
  .refine(
    (value) => !value.publishStartDate || !value.publishEndDate || value.publishStartDate <= value.publishEndDate,
    { message: 'La fecha de inicio de vigencia debe ser anterior a la fecha de fin.', path: ['publishEndDate'] },
  );

export const updateRewardSchema = z
  .object({
    code: z.string().trim().min(2).max(40).transform((value) => value.toUpperCase()),
    name: z.string().trim().min(2).max(140),
    description: z.string().trim().max(500).optional(),
    pointsValue: z.coerce.number().int().positive().max(9999999),
    stock: z.coerce.number().int().min(0).max(999999).nullable().optional(),
    imageUrl: imageUrlSchema.nullable().optional(),
    categoryItemId: z.string().trim().min(1).nullable().optional(),
    brandItemId: z.string().trim().min(1).nullable().optional(),
    productType: z.enum(STORE_PRODUCT_TYPE_CODES).nullable().optional(),
    genderTarget: z.enum(STORE_GENDER_TARGET_CODES).nullable().optional(),
    isActive: z.boolean(),
    isFeatured: z.boolean(),
    requiresApproval: z.boolean(),
    isGiftCard: z.boolean(),
    displayOrder: z.coerce.number().int().min(0),
    isPublished: z.boolean(),
    publishStartDate: z.coerce.date().nullable().optional(),
    publishEndDate: z.coerce.date().nullable().optional(),
    redemptionLimitPerCustomer: z.coerce.number().int().positive().max(999).nullable().optional(),
    termsConditions: z.string().trim().max(2000).nullable().optional(),
  })
  .partial()
  .strict();

export type CreateRewardInput = z.infer<typeof createRewardSchema>;
export type UpdateRewardInput = z.infer<typeof updateRewardSchema>;
