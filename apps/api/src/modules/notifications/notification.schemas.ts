import { z } from 'zod';

const customerSegmentStatusSchema = z.enum(['ACTIVE', 'INACTIVE']).optional();
const customerSegmentLevelSchema = z.enum(['Oro', 'Plata', 'Bronce', 'Básico']).optional();
const notificationAudienceSchema = z.enum(['GLOBAL_CUSTOMERS', 'GLOBAL_INTERNAL', 'CUSTOMER', 'CUSTOMER_SEGMENT', 'INTERNAL_USER', 'ROLE']);
const notificationTypeSchema = z.enum(['INFO', 'SUCCESS', 'WARNING', 'PROMOTION', 'SYSTEM']);

const customerSegmentSchema = z
  .object({
    status: customerSegmentStatusSchema,
    level: customerSegmentLevelSchema,
  })
  .strict();

export const createNotificationSchema = z
  .object({
    title: z.string().trim().min(3).max(120),
    body: z.string().trim().min(3).max(600),
    type: notificationTypeSchema.default('INFO'),
    audience: notificationAudienceSchema,
    customerId: z.string().trim().min(1).optional(),
    internalUserId: z.string().trim().min(1).optional(),
    roleId: z.string().trim().min(1).optional(),
    customerSegment: customerSegmentSchema.optional(),
    startsAt: z.coerce.date().optional(),
    expiresAt: z.coerce.date().optional().nullable(),
    metadata: z.record(z.unknown()).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const hasCustomer = Boolean(value.customerId);
    const hasInternalUser = Boolean(value.internalUserId);
    const hasRole = Boolean(value.roleId);

    if (value.audience === 'CUSTOMER' && !hasCustomer) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['customerId'], message: 'Selecciona un cliente.' });
    }

    if (value.audience === 'INTERNAL_USER' && !hasInternalUser) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['internalUserId'], message: 'Selecciona un usuario interno.' });
    }

    if (value.audience === 'ROLE' && !hasRole) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['roleId'], message: 'Selecciona un rol.' });
    }

    if (value.audience === 'CUSTOMER_SEGMENT' && !value.customerSegment?.status && !value.customerSegment?.level) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['customerSegment'], message: 'Define al menos un criterio de segmento.' });
    }

    if (value.audience !== 'CUSTOMER_SEGMENT' && value.customerSegment) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['customerSegment'], message: 'El segmento solo aplica para notificaciones a clientes segmentados.' });
    }

    if (['GLOBAL_CUSTOMERS', 'GLOBAL_INTERNAL', 'CUSTOMER_SEGMENT'].includes(value.audience) && (hasCustomer || hasInternalUser || hasRole)) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Las notificaciones globales no deben tener destinatario especifico.' });
    }

    if (value.expiresAt && value.startsAt && value.expiresAt <= value.startsAt) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['expiresAt'], message: 'La fecha de vencimiento debe ser posterior al inicio.' });
    }
  });

export const updateNotificationSchema = z
  .object({
    title: z.string().trim().min(3).max(120).optional(),
    body: z.string().trim().min(3).max(600).optional(),
    type: notificationTypeSchema.optional(),
    isActive: z.boolean().optional(),
    startsAt: z.coerce.date().optional(),
    expiresAt: z.coerce.date().optional().nullable(),
  })
  .strict();

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
export type UpdateNotificationInput = z.infer<typeof updateNotificationSchema>;
