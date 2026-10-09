import { z } from 'zod';

export const promotionTypeSchema = z.enum([
  'DOUBLE_POINTS',
  'TRIPLE_POINTS',
  'CUSTOM_MULTIPLIER',
  'FIXED_BONUS',
  'SPECIAL_AMOUNT',
  'SHOE_TYPE_RULE',
]);

export const createPointPromotionSchema = z
  .object({
    name: z.string().trim().min(2).max(140),
    type: promotionTypeSchema,
    multiplier: z.coerce.number().positive().max(100).nullable().optional(),
    bonusPoints: z.coerce.number().int().positive().max(999999).nullable().optional(),
    minimumAmount: z.coerce.number().min(0).max(999999.99).nullable().optional(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    targetLevels: z.array(z.string().trim().min(1)).max(10).optional().default([]),
    storeId: z.string().cuid().nullable().optional(),
    brandItemId: z.string().cuid().nullable().optional(),
    zoneId: z.string().cuid().nullable().optional(),
    departmentId: z.string().cuid().nullable().optional(),
    municipalityId: z.string().cuid().nullable().optional(),
    shoeTypeId: z.string().cuid().nullable().optional(),
  })
  .strict()
  .refine((value) => value.endsAt > value.startsAt, {
    message: 'La fecha final debe ser posterior a la fecha inicial.',
    path: ['endsAt'],
  })
  .refine((value) => {
    if (['DOUBLE_POINTS', 'TRIPLE_POINTS', 'CUSTOM_MULTIPLIER', 'SPECIAL_AMOUNT', 'SHOE_TYPE_RULE'].includes(value.type)) {
      return value.multiplier !== null && value.multiplier !== undefined;
    }

    return true;
  }, {
    message: 'El multiplicador es obligatorio para este tipo de promocion.',
    path: ['multiplier'],
  })
  .refine((value) => value.type !== 'FIXED_BONUS' || Boolean(value.bonusPoints), {
    message: 'Los puntos adicionales son obligatorios para este tipo de promocion.',
    path: ['bonusPoints'],
  });

export const listPointPromotionsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(120).optional().or(z.literal('').transform(() => undefined)),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ENDED']).optional().or(z.literal('').transform(() => undefined)),
});

export type CreatePointPromotionInput = z.output<typeof createPointPromotionSchema>;
export type ListPointPromotionsInput = z.output<typeof listPointPromotionsSchema>;
