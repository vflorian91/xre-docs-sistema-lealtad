import { z } from 'zod';
import { STORE_GENDER_TARGET_CODES, STORE_PRODUCT_TYPE_CODES } from './product-classification.constants';

const skuSchema = z
  .string()
  .trim()
  .max(60)
  .transform((value) => value.toUpperCase().replace(/\s+/g, ' ').trim())
  .nullable()
  .optional()
  .transform((value) => (value ? value : null));

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

const variantOptionSchema = z
  .object({
    name: z.string().trim().min(1).max(60),
    value: z.string().trim().min(1).max(80),
  })
  .strict();

const variantBaseSchema = z.object({
    id: z.string().trim().min(1).optional(),
    sku: skuSchema,
    optionValues: z.array(variantOptionSchema).max(8).optional(),
    size: z.string().trim().max(40).nullable().optional(),
    color: z.string().trim().max(40).nullable().optional(),
    genderTarget: z.enum(STORE_GENDER_TARGET_CODES).nullable().optional(),
    productType: z.enum(STORE_PRODUCT_TYPE_CODES).nullable().optional(),
    imageUrl: z.string().trim().max(500).nullable().optional(),
    price: z.coerce.number().positive().max(9999999),
    promotionalPrice: z.coerce.number().positive().max(9999999).nullable().optional(),
    stockQuantity: z.coerce.number().int().min(0).default(200),
    minimumStock: z.coerce.number().int().min(0).default(5).nullable().optional(),
    isActive: z.boolean().default(true),
    displayOrder: z.coerce.number().int().min(0).default(0),
  })
  .strict();

const variantSchema = variantBaseSchema
  .refine((variant) => variant.promotionalPrice == null || variant.promotionalPrice < variant.price, {
    message: 'El precio promocional debe ser menor al precio regular.',
    path: ['promotionalPrice'],
  });

const createVariantSchema = variantBaseSchema
  .omit({ id: true })
  .refine((variant) => variant.promotionalPrice == null || variant.promotionalPrice < variant.price, {
    message: 'El precio promocional debe ser menor al precio regular.',
    path: ['promotionalPrice'],
  });

export const createStoreProductSchema = z
  .object({
    brandId: z.string().trim().min(1),
    name: z.string().trim().min(2).max(160),
    sku: skuSchema,
    shortDescription: z.string().trim().max(500).nullable().optional(),
    fullDescription: z.string().trim().max(500).nullable().optional(),
    price: z.coerce.number().positive().max(9999999),
    stockQuantity: z.coerce.number().int().min(0).default(200),
    minimumStock: z.coerce.number().int().min(0).default(5).nullable().optional(),
    mainImageUrl: imageUrlSchema.nullable().optional(),
    isActive: z.boolean().default(true),
    isFeatured: z.boolean().default(false),
    generatesLoyaltyPoints: z.boolean().default(true),
    productType: z.enum(STORE_PRODUCT_TYPE_CODES).nullable().optional(),
    genderTarget: z.enum(STORE_GENDER_TARGET_CODES).nullable().optional(),
    variants: z.array(createVariantSchema).max(100).optional(),
  })
  .strict();

export const updateStoreProductSchema = z
  .object({
    brandId: z.string().trim().min(1),
    name: z.string().trim().min(2).max(160),
    sku: skuSchema,
    shortDescription: z.string().trim().max(500).nullable().optional(),
    fullDescription: z.string().trim().max(500).nullable().optional(),
    price: z.coerce.number().positive().max(9999999),
    stockQuantity: z.coerce.number().int().min(0),
    minimumStock: z.coerce.number().int().min(0).nullable().optional(),
    mainImageUrl: imageUrlSchema.nullable().optional(),
    isActive: z.boolean(),
    isFeatured: z.boolean(),
    generatesLoyaltyPoints: z.boolean(),
    productType: z.enum(STORE_PRODUCT_TYPE_CODES).nullable().optional(),
    genderTarget: z.enum(STORE_GENDER_TARGET_CODES).nullable().optional(),
    variants: z.array(variantSchema).max(100).optional(),
  })
  .partial()
  .strict();

export const updateStoreProductStatusSchema = z
  .object({
    isActive: z.boolean(),
  })
  .strict();

export const updateStoreProductStockSchema = z
  .object({
    newStock: z.coerce.number().int().min(0),
    comment: z.string().trim().max(300).nullable().optional(),
  })
  .strict();

export type CreateStoreProductInput = z.infer<typeof createStoreProductSchema>;
export type UpdateStoreProductInput = z.infer<typeof updateStoreProductSchema>;
export type UpdateStoreProductStatusInput = z.infer<typeof updateStoreProductStatusSchema>;
export type UpdateStoreProductStockInput = z.infer<typeof updateStoreProductStockSchema>;
