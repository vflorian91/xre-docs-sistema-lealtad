import { z } from 'zod';
import { STORE_PICKUP_STATUS } from './store-order.constants';

export const assignOriginStoreSchema = z
  .object({
    storeId: z.string().trim().min(1, 'Selecciona una tienda origen.'),
    note: z.string().trim().max(300).optional(),
  })
  .strict();

// Estados que el administrador puede fijar manualmente sobre un producto.
export const adminPickupStatusSchema = z
  .object({
    pickupStatus: z.enum([
      STORE_PICKUP_STATUS.PENDIENTE_RECOLECCION,
      STORE_PICKUP_STATUS.NO_DISPONIBLE,
      STORE_PICKUP_STATUS.SUSTITUCION_REQUERIDA,
      STORE_PICKUP_STATUS.CANCELADO,
    ]),
    note: z.string().trim().max(300).optional(),
  })
  .strict();

export type AssignOriginStoreInput = z.infer<typeof assignOriginStoreSchema>;
export type AdminPickupStatusInput = z.infer<typeof adminPickupStatusSchema>;
