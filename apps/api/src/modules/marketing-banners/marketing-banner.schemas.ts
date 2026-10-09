import { z } from 'zod';

const redirectUrlSchema = z.string().trim().max(500).nullable().optional().refine((value) => {
  if (!value) return true;
  if (value.startsWith('/')) return true;

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}, 'La URL ingresada no tiene un formato valido.');

const marketingBannerBaseSchema = z
  .object({
    title: z.string().trim().min(1, 'El titulo es obligatorio.').max(100),
    subtitle: z.string().trim().max(240).nullable().optional(),
    badge: z.string().trim().max(40).nullable().optional(),
    imageUrl: z.string().trim().min(1, 'Debe cargar una imagen para guardar el banner.').max(500),
    ctaLabel: z.string().trim().max(60).nullable().optional(),
    ctaUrl: redirectUrlSchema,
    tone: z.enum(['blue', 'green', 'pink', 'amber', 'violet']).default('blue'),
    status: z.enum(['ACTIVE', 'INACTIVE', 'DRAFT']).default('ACTIVE'),
    placement: z.enum(['LOYALTY', 'STORE']).default('LOYALTY'),
    isActive: z.boolean().optional(),
    startsAt: z.coerce.date({ required_error: 'La fecha de inicio es obligatoria.' }),
    endsAt: z.coerce.date({ required_error: 'La fecha fin es obligatoria.' }),
    sortOrder: z.coerce.number().int().min(1).max(7),
    audienceType: z.enum(['ALL', 'BRANDS']).default('ALL'),
    targetBrandIds: z.array(z.string().cuid()).max(100).default([]),
  })
  .strict();

export const createMarketingBannerSchema = marketingBannerBaseSchema
  .refine((value) => value.audienceType === 'ALL' || value.targetBrandIds.length > 0, {
    message: 'Selecciona al menos una marca para esta audiencia.',
    path: ['targetBrandIds'],
  })
  .refine((value) => value.endsAt >= value.startsAt, {
    message: 'La fecha fin no puede ser menor que la fecha de inicio.',
    path: ['endsAt'],
  });

export const updateMarketingBannerSchema = marketingBannerBaseSchema.partial().strict().refine((value) => {
  if (!value.startsAt || !value.endsAt) return true;
  return value.endsAt >= value.startsAt;
}, {
  message: 'La fecha fin no puede ser menor que la fecha de inicio.',
  path: ['endsAt'],
});

export const bannerEventSchema = z.object({
  sessionId: z.string().trim().max(120).nullable().optional(),
}).strict();

export type CreateMarketingBannerInput = z.infer<typeof createMarketingBannerSchema>;
export type UpdateMarketingBannerInput = z.infer<typeof updateMarketingBannerSchema>;
export type BannerEventInput = z.infer<typeof bannerEventSchema>;
