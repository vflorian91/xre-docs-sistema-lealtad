import { z } from 'zod';

const storeLocationTypeSchema = z.enum(['CAPITAL', 'DEPARTMENT']);
const storeStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);

export const createStoreSchema = z.object({
  name: z.string().trim().min(2).max(120),
  address: z.string().trim().min(2).max(250),
  locationType: storeLocationTypeSchema,
  countryId: z.string().cuid(),
  departmentId: z.string().cuid(),
  municipalityId: z.string().cuid(),
  brandId: z.string().cuid().optional().or(z.literal('').transform(() => undefined)),
  status: storeStatusSchema.optional(),
});

export const updateStoreSchema = z.object({
  name: z.string().trim().min(2).max(120),
  address: z.string().trim().min(2).max(250),
  locationType: storeLocationTypeSchema,
  countryId: z.string().cuid(),
  departmentId: z.string().cuid(),
  municipalityId: z.string().cuid(),
  brandId: z.string().cuid().nullable().optional().or(z.literal('').transform(() => null)),
  status: storeStatusSchema,
});

export const listStoresSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(10),
  search: z.string().trim().max(120).optional().or(z.literal('').transform(() => undefined)),
  status: storeStatusSchema.optional().or(z.literal('').transform(() => undefined)),
  locationType: storeLocationTypeSchema.optional().or(z.literal('').transform(() => undefined)),
  sortBy: z.enum(['code', 'name', 'status', 'locationType', 'createdAt']).default('createdAt'),
  sortDirection: z.enum(['asc', 'desc']).default('desc'),
  exportAll: z.coerce.boolean().optional().default(false),
});

export const assignUsersToStoreSchema = z.object({
  userIds: z.array(z.string().min(1)).default([]),
});

export const setActiveStoreSchema = z.object({
  storeId: z.string().min(1),
});

export type CreateStoreInput = z.infer<typeof createStoreSchema>;
export type UpdateStoreInput = z.infer<typeof updateStoreSchema>;
export type ListStoresInput = z.infer<typeof listStoresSchema>;
export type AssignUsersToStoreInput = z.infer<typeof assignUsersToStoreSchema>;
export type SetActiveStoreInput = z.infer<typeof setActiveStoreSchema>;
