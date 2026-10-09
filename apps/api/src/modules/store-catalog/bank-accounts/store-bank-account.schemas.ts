import { z } from 'zod';

export const createBankAccountSchema = z
  .object({
    bankName: z.string().trim().min(1, 'El banco es obligatorio.').max(120),
    accountHolder: z.string().trim().min(1, 'El titular es obligatorio.').max(160),
    accountNumber: z.string().trim().min(1, 'El número de cuenta es obligatorio.').max(60),
    accountType: z.string().trim().min(1, 'El tipo de cuenta es obligatorio.').max(60),
    isActive: z.boolean().optional(),
    sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
  })
  .strict();

export const updateBankAccountSchema = createBankAccountSchema.partial();

export type CreateBankAccountInput = z.infer<typeof createBankAccountSchema>;
export type UpdateBankAccountInput = z.infer<typeof updateBankAccountSchema>;
