import { z } from 'zod';

export const internalLoginSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(20),
});

export const changeInternalPasswordSchema = z
  .object({
    currentPassword: z.string().min(8),
    newPassword: z.string().min(8).max(120),
  })
  .strict();

export const changeCustomerPasswordSchema = z
  .object({
    newPassword: z.string().min(8).max(120),
  })
  .strict();

export const requestPasswordResetSchema = z
  .object({
    email: z.string().trim().email().transform((value) => value.toLowerCase()),
    app: z.enum(['admin', 'client']).optional(),
  })
  .strict();

export const resetPasswordSchema = z
  .object({
    token: z.string().min(20),
    newPassword: z.string().min(8).max(120),
  })
  .strict();

export const customerLoginSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(120),
});

export const customerRegisterSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120).optional(),
    firstName: z.string().trim().min(2).max(80).optional(),
    lastName: z.string().trim().min(2).max(80).optional(),
    taxId: z
      .string()
      .trim()
      .min(2)
      .max(30)
      .transform((value) => value.toUpperCase().replace(/[^0-9A-Z-]/g, '')),
    phone: z
      .string()
      .trim()
      .min(8)
      .max(20)
      .transform((value) => value.replace(/\D/g, ''))
      .refine((value) => value.length === 8, 'El telefono debe tener exactamente 8 digitos.'),
    email: z.string().trim().email().transform((value) => value.toLowerCase()),
    password: z.string().min(8).max(120),
    brandItemId: z.string().cuid().optional(),
    registrationStoreId: z.string().cuid().optional(),
    brand: z.string().trim().max(80).optional(),
    storeName: z.string().trim().max(120).optional(),
  })
  .strict()
  .refine((value) => value.fullName || (value.firstName && value.lastName), {
    message: 'Ingresa nombre y apellido.',
    path: ['fullName'],
  });

export type InternalLoginInput = z.infer<typeof internalLoginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ChangeInternalPasswordInput = z.infer<typeof changeInternalPasswordSchema>;
export type ChangeCustomerPasswordInput = z.infer<typeof changeCustomerPasswordSchema>;
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type CustomerLoginInput = z.infer<typeof customerLoginSchema>;
export type CustomerRegisterInput = z.infer<typeof customerRegisterSchema>;
