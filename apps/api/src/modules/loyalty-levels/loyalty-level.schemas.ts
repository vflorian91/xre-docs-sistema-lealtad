import { z } from 'zod';

export const createLoyaltyLevelTierSchema = z
  .object({
    code: z.string().trim().min(2).max(40).transform((value) => value.toUpperCase().replace(/\s+/g, '_')),
    name: z.string().trim().min(2).max(60),
    minPurchases: z.coerce.number().int().min(0),
    maxPurchases: z.coerce.number().int().min(0).nullable().optional(),
    sortOrder: z.coerce.number().int().min(0).optional(),
  })
  .strict()
  .refine((value) => value.maxPurchases == null || value.maxPurchases >= value.minPurchases, {
    message: 'El maximo de compras debe ser mayor o igual al minimo.',
    path: ['maxPurchases'],
  });

export const updateLoyaltyLevelTierSchema = z
  .object({
    name: z.string().trim().min(2).max(60).optional(),
    minPurchases: z.coerce.number().int().min(0).optional(),
    maxPurchases: z.coerce.number().int().min(0).nullable().optional(),
    sortOrder: z.coerce.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export type CreateLoyaltyLevelTierInput = z.infer<typeof createLoyaltyLevelTierSchema>;
export type UpdateLoyaltyLevelTierInput = z.infer<typeof updateLoyaltyLevelTierSchema>;
