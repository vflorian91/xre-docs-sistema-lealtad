import { z } from 'zod';

export const addStoreCartItemSchema = z
  .object({
    productId: z.string().trim().min(1),
    variantId: z.string().trim().min(1).nullable().optional(),
    quantity: z.coerce.number().int().min(1).max(999).default(1),
  })
  .strict();

export const updateStoreCartItemSchema = z
  .object({
    quantity: z.coerce.number().int().min(1).max(999),
  })
  .strict();

export type AddStoreCartItemInput = z.infer<typeof addStoreCartItemSchema>;
export type UpdateStoreCartItemInput = z.infer<typeof updateStoreCartItemSchema>;
