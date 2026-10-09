import { z } from 'zod';

export const mediaPurposeSchema = z.enum([
  'PROFILE_PHOTO',
  'REWARD_IMAGE',
  'BANNER',
  'GENERAL',
  'BRAND_CARD_IMAGE',
  'REDEMPTION_EVIDENCE',
  'STORE_BRAND_LOGO',
  'STORE_PRODUCT_IMAGE',
  'STORE_PAYMENT_RECEIPT',
]);

export const uploadMediaSchema = z
  .object({
    purpose: mediaPurposeSchema,
    filename: z.string().trim().min(1).max(160),
    mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp'], {
      errorMap: () => ({ message: 'El archivo debe ser una imagen valida en formato JPG, JPEG, PNG o WEBP.' }),
    }),
    dataBase64: z.string().trim().min(16),
  })
  .strict();

export const uploadRewardImageSchema = uploadMediaSchema
  .extend({
    rewardId: z.string().trim().min(1),
  })
  .strict()
  .refine((value) => value.purpose === 'REWARD_IMAGE', {
    message: 'El proposito debe ser REWARD_IMAGE.',
    path: ['purpose'],
  });

export const uploadBannerImageSchema = uploadMediaSchema
  .refine((value) => value.purpose === 'BANNER', {
    message: 'El proposito debe ser BANNER.',
    path: ['purpose'],
  });

export const uploadCustomerProfilePhotoSchema = uploadMediaSchema
  .refine((value) => value.purpose === 'PROFILE_PHOTO', {
    message: 'El proposito debe ser PROFILE_PHOTO.',
    path: ['purpose'],
  });

export const uploadBrandCardImageSchema = uploadMediaSchema
  .extend({
    catalogItemId: z.string().trim().min(1),
  })
  .strict()
  .refine((value) => value.purpose === 'BRAND_CARD_IMAGE', {
    message: 'El proposito debe ser BRAND_CARD_IMAGE.',
    path: ['purpose'],
  });

export const uploadRedemptionEvidenceSchema = uploadMediaSchema
  .refine((value) => value.purpose === 'REDEMPTION_EVIDENCE', {
    message: 'El proposito debe ser REDEMPTION_EVIDENCE.',
    path: ['purpose'],
  });

export const uploadStoreBrandLogoSchema = uploadMediaSchema
  .extend({
    storeBrandId: z.string().trim().min(1),
  })
  .strict()
  .refine((value) => value.purpose === 'STORE_BRAND_LOGO', {
    message: 'El proposito debe ser STORE_BRAND_LOGO.',
    path: ['purpose'],
  });

export const uploadStoreProductImageSchema = uploadMediaSchema
  .extend({
    storeProductId: z.string().trim().min(1),
  })
  .strict()
  .refine((value) => value.purpose === 'STORE_PRODUCT_IMAGE', {
    message: 'El proposito debe ser STORE_PRODUCT_IMAGE.',
    path: ['purpose'],
  });

export const uploadStorePaymentReceiptSchema = z
  .object({
    purpose: mediaPurposeSchema,
    filename: z.string().trim().min(1).max(160),
    mimeType: z.enum(['application/pdf', 'image/jpeg', 'image/png'], {
      errorMap: () => ({ message: 'El comprobante debe ser un archivo PDF, JPG, JPEG o PNG valido.' }),
    }),
    dataBase64: z.string().trim().min(16),
    orderId: z.string().trim().min(1),
  })
  .strict()
  .refine((value) => value.purpose === 'STORE_PAYMENT_RECEIPT', {
    message: 'El proposito debe ser STORE_PAYMENT_RECEIPT.',
    path: ['purpose'],
  });

export type UploadMediaInput = z.infer<typeof uploadMediaSchema>;
export type UploadRewardImageInput = z.infer<typeof uploadRewardImageSchema>;
export type UploadBannerImageInput = z.infer<typeof uploadBannerImageSchema>;
export type UploadCustomerProfilePhotoInput = z.infer<typeof uploadCustomerProfilePhotoSchema>;
export type UploadBrandCardImageInput = z.infer<typeof uploadBrandCardImageSchema>;
export type UploadRedemptionEvidenceInput = z.infer<typeof uploadRedemptionEvidenceSchema>;
export type UploadStoreBrandLogoInput = z.infer<typeof uploadStoreBrandLogoSchema>;
export type UploadStoreProductImageInput = z.infer<typeof uploadStoreProductImageSchema>;
export type UploadStorePaymentReceiptInput = z.infer<typeof uploadStorePaymentReceiptSchema>;
