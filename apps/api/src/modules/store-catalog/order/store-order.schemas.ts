import { z } from 'zod';
import { STORE_PAYMENT_METHOD } from './store-order.constants';

const phoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\s+/g, ''))
  .refine((value) => /^\d{8}$/.test(value), 'El telefono debe tener 8 digitos.');

export const createStoreOrderSchema = z
  .object({
    paymentMethodRequested: z.enum([
      STORE_PAYMENT_METHOD.EFECTIVO_CONTRA_ENTREGA,
      STORE_PAYMENT_METHOD.VISA_LINK_MANUAL,
      STORE_PAYMENT_METHOD.TRANSFERENCIA_BANCARIA,
      STORE_PAYMENT_METHOD.DEPOSITO_BANCARIO,
    ]),
    // Fase 5 — Pedido maestro multi-marca. Si se envían marcas, el pedido se crea solo con
    // los ítems de esas marcas y el resto permanece en el carrito. Si se omite, se crea con
    // todo el carrito (compatibilidad con el flujo anterior).
    selectedBrandIds: z.array(z.string().trim().min(1)).min(1).optional(),
    // Nuevo: el cliente puede usar una direccion de su libreta. Si la envia, el
    // pedido toma de ahi la direccion de entrega. Si no, sigue el flujo actual
    // con direccion escrita a mano (compatibilidad).
    customerAddressId: z.string().trim().min(1).optional(),
    deliveryAddress: z.string().trim().min(5).max(300).optional(),
    deliveryDepartmentId: z.string().trim().min(1).nullable().optional(),
    deliveryMunicipalityId: z.string().trim().min(1).nullable().optional(),
    deliveryZoneId: z.string().trim().min(1).nullable().optional(),
    deliveryReference: z.string().trim().max(300).nullable().optional(),
    deliveryPhone: phoneSchema.optional(),
    receiverName: z.string().trim().max(160).nullable().optional(),
  })
  .strict();

export type CreateStoreOrderInput = z.infer<typeof createStoreOrderSchema>;

// Fase 5 — Vista previa del checkout antes de crear el pedido. No crea nada.
export const checkoutPreviewSchema = z
  .object({
    selectedBrandIds: z.array(z.string().trim().min(1)).min(1).optional(),
    customerAddressId: z.string().trim().min(1).optional(),
  })
  .strict();

export type CheckoutPreviewInput = z.infer<typeof checkoutPreviewSchema>;
