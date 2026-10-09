import { z } from 'zod';

export const createPointRuleSchema = z.object({
  name: z.string().trim().min(2).max(120),
  amountPerPoint: z.coerce.number().positive().max(999999.99),
  pointValueAmount: z.coerce.number().positive().max(9999999999999.99999).multipleOf(0.00001),
  minimumAmount: z.coerce.number().min(0).max(999999.99).default(0),
  maxPointsPerPurchase: z.coerce.number().int().positive().max(2147483647).nullable().optional(),
  pointsExpirationDays: z.coerce.number().int().positive().max(3650).nullable().optional(),
  roundingMode: z.enum(['FLOOR']).default('FLOOR'),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date().nullable().optional(),
  activateNow: z.boolean().default(true),
  brandItemId: z.string().trim().min(1),
});

export const listPointRulesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(120).optional().or(z.literal('').transform(() => undefined)),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional().or(z.literal('').transform(() => undefined)),
});

export type CreatePointRuleInput = z.output<typeof createPointRuleSchema>;
export type ListPointRulesInput = z.output<typeof listPointRulesSchema>;
