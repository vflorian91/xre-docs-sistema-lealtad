import { z } from 'zod';
import { STORE_DELIVERY_INCIDENT_TYPE_CODES } from '../store-catalog/order/store-order.constants';

export const DRIVER_ACCESS_STATUS = {
  ACTIVO: 'ACTIVO',
  BLOQUEADO: 'BLOQUEADO',
  PENDIENTE_PRIMER_INGRESO: 'PENDIENTE_PRIMER_INGRESO',
  INACTIVO: 'INACTIVO',
} as const;

export const driverLoginSchema = z
  .object({
    email: z.string().trim().email().transform((value) => value.toLowerCase()),
    password: z.string().min(1),
    rememberMe: z.boolean().optional().default(false),
  })
  .strict();

export const changeDriverPasswordSchema = z
  .object({
    newPassword: z.string().min(8, 'La contrasena debe tener al menos 8 caracteres.'),
    confirmPassword: z.string().min(8, 'Confirma la contrasena.'),
  })
  .strict()
  .refine((input) => input.newPassword === input.confirmPassword, {
    message: 'Las contrasenas no coinciden.',
    path: ['confirmPassword'],
  });

export const confirmDeliverySchema = z
  .object({
    deliveredAt: z.coerce.date().optional(),
    deliveryCode: z.string().trim().min(4, 'Ingresa el código de entrega.').max(12),
    deliveryComment: z.string().trim().max(500).optional(),
    receivedCash: z.boolean().optional(),
    amountReceived: z.coerce.number().nonnegative().optional(),
  })
  .strict();

export const failedDeliverySchema = z
  .object({
    reasonCode: z.enum([
      'CLIENTE_NO_CONTESTA',
      'CLIENTE_NO_SE_ENCUENTRA',
      'DIRECCION_INCORRECTA',
      'DIRECCION_INCOMPLETA',
      'CLIENTE_RECHAZA_PEDIDO',
      'CLIENTE_NO_TIENE_EFECTIVO',
      'ZONA_INACCESIBLE',
      'PROBLEMA_OPERATIVO',
      'OTRO',
    ]),
    comment: z.string().trim().max(500).optional(),
  })
  .strict()
  .refine((input) => input.reasonCode !== 'OTRO' || Boolean(input.comment?.trim()), {
    message: 'El comentario es obligatorio cuando el motivo es OTRO.',
    path: ['comment'],
  });

export const reportIncidentSchema = z
  .object({
    incidentType: z.enum(STORE_DELIVERY_INCIDENT_TYPE_CODES),
    affectedStoreId: z.string().trim().min(1).optional(),
    affectedOrderItemId: z.string().trim().min(1).optional(),
    comment: z.string().trim().max(600).optional(),
    evidencePhotoUrl: z.string().trim().max(500).optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    addressText: z.string().trim().max(300).optional(),
  })
  .strict();

export type DriverLoginInput = z.infer<typeof driverLoginSchema>;
export type ReportIncidentInput = z.infer<typeof reportIncidentSchema>;
export const markPickedUpSchema = z
  .object({
    note: z.string().trim().max(300).optional(),
    evidenceUrl: z.string().trim().max(500).optional(),
  })
  .strict();

export type ChangeDriverPasswordInput = z.infer<typeof changeDriverPasswordSchema>;
export type ConfirmDeliveryInput = z.infer<typeof confirmDeliverySchema>;
export type FailedDeliveryInput = z.infer<typeof failedDeliverySchema>;
export type MarkPickedUpInput = z.infer<typeof markPickedUpSchema>;
