import { z } from 'zod';

export const createPointAdjustmentSchema = z
  .object({
    customerId: z.string().cuid('Cliente invalido.'),
    points: z.coerce.number().int().min(-999999).max(999999).refine((value) => value !== 0, 'Los puntos no pueden ser cero.'),
    description: z.string().trim().min(4).max(240),
  })
  .strict();

export type CreatePointAdjustmentInput = z.infer<typeof createPointAdjustmentSchema>;
