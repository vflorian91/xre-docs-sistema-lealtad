import { z } from 'zod';
import { STORE_DELIVERY_TIME_RANGES } from '../order/store-order.constants';

const deliveryTimeRangeSchema = z.enum(STORE_DELIVERY_TIME_RANGES);

export const deliveryRescheduleReasonCodes = [
  'SIN_DISPONIBILIDAD',
  'CLIENTE_SOLICITO_CAMBIO',
  'DIRECCION_REQUIERE_VALIDACION',
  'PRODUCTO_NO_LISTO',
  'PROBLEMA_OPERATIVO',
  'OTRO',
] as const;

export const driverChangeReasonCodes = [
  'MENSAJERO_NO_DISPONIBLE',
  'REASIGNACION_OPERATIVA',
  'ERROR_DE_ASIGNACION',
  'CLIENTE_CAMBIO_FECHA',
  'OTRO',
] as const;

const optionalCommentSchema = z.string().trim().max(500).nullable().optional();

export const programStoreDeliverySchema = z
  .object({
    confirmedDeliveryDate: z.coerce.date(),
    deliveryTimeRange: deliveryTimeRangeSchema,
    comment: optionalCommentSchema,
  })
  .strict();

export const rescheduleStoreDeliverySchema = z
  .object({
    newConfirmedDeliveryDate: z.coerce.date(),
    deliveryTimeRange: deliveryTimeRangeSchema,
    reasonCode: z.enum(deliveryRescheduleReasonCodes),
    comment: optionalCommentSchema,
  })
  .strict()
  .refine((value) => value.reasonCode !== 'OTRO' || Boolean(value.comment?.trim()), {
    message: 'El comentario es obligatorio cuando el motivo es OTRO.',
    path: ['comment'],
  });

export const assignStoreDeliveryDriverSchema = z
  .object({
    driverId: z.string().trim().min(1),
    comment: optionalCommentSchema,
  })
  .strict();

export const changeStoreDeliveryDriverSchema = z
  .object({
    driverId: z.string().trim().min(1),
    reasonCode: z.enum(driverChangeReasonCodes),
    comment: optionalCommentSchema,
  })
  .strict()
  .refine((value) => value.reasonCode !== 'OTRO' || Boolean(value.comment?.trim()), {
    message: 'El comentario es obligatorio cuando el motivo es OTRO.',
    path: ['comment'],
  });

export const cancelStoreDeliveryScheduleSchema = z
  .object({
    reasonCode: z.string().trim().min(2).max(80),
    comment: optionalCommentSchema,
  })
  .strict();

export type ProgramStoreDeliveryInput = z.infer<typeof programStoreDeliverySchema>;
export type RescheduleStoreDeliveryInput = z.infer<typeof rescheduleStoreDeliverySchema>;
export type AssignStoreDeliveryDriverInput = z.infer<typeof assignStoreDeliveryDriverSchema>;
export type ChangeStoreDeliveryDriverInput = z.infer<typeof changeStoreDeliveryDriverSchema>;
export type CancelStoreDeliveryScheduleInput = z.infer<typeof cancelStoreDeliveryScheduleSchema>;
