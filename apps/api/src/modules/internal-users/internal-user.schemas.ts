import { z } from 'zod';

export const createInternalUserSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(120),
  roleIds: z.array(z.string().min(1)).min(1),
  storeIds: z.array(z.string().min(1)).max(1, 'Un usuario solo puede tener una tienda asignada.').default([]),
  permissionCodes: z.array(z.string().min(1)).default([]),
  mustChangePassword: z.boolean().default(true),
  paisItemId: z.string().min(1).optional().nullable(),
  departamentoItemId: z.string().min(1).optional().nullable(),
  municipioItemId: z.string().min(1).optional().nullable(),
  zonaItemId: z.string().min(1).optional().nullable(),
});

export const updateInternalUserSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().email().transform((value) => value.toLowerCase()).optional(),
  password: z.string().min(8).max(120).optional(),
  mustChangePassword: z.boolean().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'BLOCKED']).optional(),
  roleIds: z.array(z.string().min(1)).min(1).optional(),
  storeIds: z.array(z.string().min(1)).max(1, 'Un usuario solo puede tener una tienda asignada.').optional(),
  permissionCodes: z.array(z.string().min(1)).optional(),
  paisItemId: z.string().min(1).optional().nullable(),
  departamentoItemId: z.string().min(1).optional().nullable(),
  municipioItemId: z.string().min(1).optional().nullable(),
  zonaItemId: z.string().min(1).optional().nullable(),
});

export const updateInternalUserPermissionsSchema = z.object({
  permissionCodes: z.array(z.string().min(1)),
});

export const createRoleSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(240).nullable().optional(),
});

export const updateRoleSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(240).nullable().optional(),
  isActive: z.boolean().optional(),
});

export type CreateInternalUserInput = z.infer<typeof createInternalUserSchema>;
export type UpdateInternalUserInput = z.infer<typeof updateInternalUserSchema>;
export type UpdateInternalUserPermissionsInput = z.infer<typeof updateInternalUserPermissionsSchema>;
export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
