import { z } from 'zod';
import { SETTING_KEYS } from './settings.defaults';

export const settingKeySchema = z.enum([
  SETTING_KEYS.points,
  SETTING_KEYS.pointsToBalanceConversion,
  SETTING_KEYS.purchaseReview,
  SETTING_KEYS.redemptions,
  SETTING_KEYS.promotionalBalance,
]);

export const updateSettingSchema = z.discriminatedUnion('key', [
  z.object({
    key: z.literal(SETTING_KEYS.points),
    value: z.object({
      pointsPerCurrencyUnit: z.coerce.number().positive().max(999999.99),
      pointValueAmount: z.coerce.number().positive().max(999999.99),
      minimumPurchaseAmount: z.coerce.number().min(0).max(999999.99).default(0),
      maxPointsPerPurchase: z.coerce.number().int().positive().max(9999999).nullable(),
      pointsExpirationDays: z.coerce.number().int().positive().max(3650).nullable(),
      isEnabled: z.boolean().default(true),
    }),
  }),
  z.object({
    key: z.literal(SETTING_KEYS.pointsToBalanceConversion),
    value: z.object({
      points: z.coerce.number().int().positive().max(999999),
      amount: z.coerce.number().positive().max(999999.99),
      minimumPoints: z.coerce.number().int().positive().max(999999),
      isEnabled: z.boolean().default(true),
    }),
  }),
  z.object({
    key: z.literal(SETTING_KEYS.purchaseReview),
    value: z.object({
      isEnabled: z.boolean().default(true),
      amountThreshold: z.coerce.number().positive().max(999999.99).nullable(),
      pointsThreshold: z.coerce.number().int().positive().max(9999999).nullable(),
    }),
  }),
  z.object({
    key: z.literal(SETTING_KEYS.redemptions),
    value: z.object({
      expirationDays: z.coerce.number().int().min(1).max(365),
    }),
  }),
  z.object({
    key: z.literal(SETTING_KEYS.promotionalBalance),
    value: z.object({
      maxUsePerPurchase: z.coerce.number().positive().max(999999.99).nullable(),
    }),
  }),
]);

export type SettingKeyInput = z.output<typeof settingKeySchema>;
export type UpdateSettingInput = z.output<typeof updateSettingSchema>;
