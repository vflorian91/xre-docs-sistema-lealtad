import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { STORE_ORDER_STATUS, STORE_ORDER_TERMINAL_STATUSES } from './store-order.constants';

/**
 * FRD 08 — Matriz central de permisos y transiciones del pedido.
 *
 * Fuente única de verdad de "qué rol puede ejecutar qué acción y en qué estado".
 * Es aditivo: NO reemplaza guards de autenticación existentes (CustomerJwt/DriverJwt/
 * JwtAuth+Permissions). Se usa como capa de negocio para evitar que un actor cambie
 * estados que no le corresponden (secciones 2, 17 y 24 del FRD).
 */

export const STORE_ACTOR = {
  CLIENT: 'CLIENT',
  ADMIN: 'ADMIN',
  DRIVER: 'DRIVER',
} as const;

export type StoreActor = (typeof STORE_ACTOR)[keyof typeof STORE_ACTOR];

export const STORE_ORDER_ACTION = {
  // ── Cliente ──
  VIEW_OWN_ORDER: 'VIEW_OWN_ORDER',
  REPORT_PAYMENT: 'REPORT_PAYMENT',
  REQUEST_VISA_LINK: 'REQUEST_VISA_LINK',
  REPORT_VISA_LINK_PAYMENT: 'REPORT_VISA_LINK_PAYMENT',
  REGISTER_CASH: 'REGISTER_CASH',
  REQUEST_RESCHEDULE: 'REQUEST_RESCHEDULE',
  REQUEST_ADDRESS_CHANGE: 'REQUEST_ADDRESS_CHANGE',
  USE_CHAT: 'USE_CHAT',

  // ── Admin ──
  VIEW_ANY_ORDER: 'VIEW_ANY_ORDER',
  REVIEW_PAYMENT: 'REVIEW_PAYMENT',
  APPROVE_PAYMENT: 'APPROVE_PAYMENT',
  REJECT_PAYMENT: 'REJECT_PAYMENT',
  SEND_VISA_LINK: 'SEND_VISA_LINK',
  RESEND_VISA_LINK: 'RESEND_VISA_LINK',
  ASSIGN_ORIGIN_STORE: 'ASSIGN_ORIGIN_STORE',
  CHANGE_ORIGIN_STORE: 'CHANGE_ORIGIN_STORE',
  MARK_PRODUCT_UNAVAILABLE: 'MARK_PRODUCT_UNAVAILABLE',
  REQUEST_SUBSTITUTION: 'REQUEST_SUBSTITUTION',
  CANCEL_PRODUCT: 'CANCEL_PRODUCT',
  SCHEDULE_DELIVERY: 'SCHEDULE_DELIVERY',
  RESCHEDULE_DELIVERY: 'RESCHEDULE_DELIVERY',
  CHANGE_ADDRESS: 'CHANGE_ADDRESS',
  ASSIGN_DRIVER: 'ASSIGN_DRIVER',
  REASSIGN_DRIVER: 'REASSIGN_DRIVER',
  REVIEW_INCIDENT: 'REVIEW_INCIDENT',
  REQUEST_RETURN: 'REQUEST_RETURN',
  DEFINE_RETURN_POINT: 'DEFINE_RETURN_POINT',
  CONFIRM_RETURN: 'CONFIRM_RETURN',
  CANCEL_ORDER: 'CANCEL_ORDER',
  CLOSE_INCIDENT: 'CLOSE_INCIDENT',

  // ── Motorista ──
  VIEW_ASSIGNED_ORDER: 'VIEW_ASSIGNED_ORDER',
  MARK_PICKED_UP: 'MARK_PICKED_UP',
  MARK_PICKUP_COMPLETE: 'MARK_PICKUP_COMPLETE',
  START_ROUTE: 'START_ROUTE',
  MARK_DELIVERED: 'MARK_DELIVERED',
  CONFIRM_CASH_RECEIVED: 'CONFIRM_CASH_RECEIVED',
  REPORT_INCIDENT: 'REPORT_INCIDENT',
  REQUEST_RETURN_DRIVER: 'REQUEST_RETURN_DRIVER',
  MARK_PACKAGE_RETURNED: 'MARK_PACKAGE_RETURNED',
  USE_INTERNAL_NOTES: 'USE_INTERNAL_NOTES',
} as const;

export type StoreOrderAction = (typeof STORE_ORDER_ACTION)[keyof typeof STORE_ORDER_ACTION];

const A = STORE_ORDER_ACTION;

/** Acciones que cada rol PUEDE ejecutar (a nivel de rol; el estado se valida aparte). */
export const ROLE_ACTIONS: Record<StoreActor, ReadonlySet<StoreOrderAction>> = {
  [STORE_ACTOR.CLIENT]: new Set([
    A.VIEW_OWN_ORDER,
    A.REPORT_PAYMENT,
    A.REQUEST_VISA_LINK,
    A.REPORT_VISA_LINK_PAYMENT,
    A.REGISTER_CASH,
    A.REQUEST_RESCHEDULE,
    A.REQUEST_ADDRESS_CHANGE,
    A.USE_CHAT,
  ]),
  [STORE_ACTOR.ADMIN]: new Set([
    A.VIEW_ANY_ORDER,
    A.REVIEW_PAYMENT,
    A.APPROVE_PAYMENT,
    A.REJECT_PAYMENT,
    A.SEND_VISA_LINK,
    A.RESEND_VISA_LINK,
    A.ASSIGN_ORIGIN_STORE,
    A.CHANGE_ORIGIN_STORE,
    A.MARK_PRODUCT_UNAVAILABLE,
    A.REQUEST_SUBSTITUTION,
    A.CANCEL_PRODUCT,
    A.SCHEDULE_DELIVERY,
    A.RESCHEDULE_DELIVERY,
    A.CHANGE_ADDRESS,
    A.ASSIGN_DRIVER,
    A.REASSIGN_DRIVER,
    A.REVIEW_INCIDENT,
    A.REQUEST_RETURN,
    A.DEFINE_RETURN_POINT,
    A.CONFIRM_RETURN,
    A.CANCEL_ORDER,
    A.CLOSE_INCIDENT,
    A.USE_CHAT,
  ]),
  [STORE_ACTOR.DRIVER]: new Set([
    A.VIEW_ASSIGNED_ORDER,
    A.MARK_PICKED_UP,
    A.MARK_PICKUP_COMPLETE,
    A.START_ROUTE,
    A.MARK_DELIVERED,
    A.CONFIRM_CASH_RECEIVED,
    A.REPORT_INCIDENT,
    A.REQUEST_RETURN_DRIVER,
    A.MARK_PACKAGE_RETURNED,
    A.USE_INTERNAL_NOTES,
  ]),
};

const S = STORE_ORDER_STATUS;

/**
 * Estados de pedido en los que cada acción operativa es válida (sección 17).
 * Si una acción NO aparece aquí, se permite en cualquier estado no terminal.
 */
export const ORDER_ACTION_ALLOWED_STATUSES: Partial<Record<StoreOrderAction, readonly string[]>> = {
  // Admin — pago (también lo valida el servicio de pagos por paymentStatus)
  [A.ASSIGN_ORIGIN_STORE]: [S.CONFIRMADO_ADMIN, S.PREPARANDO_PEDIDO, S.ENTREGA_EN_COORDINACION, S.ENTREGA_PROGRAMADA],
  [A.CHANGE_ORIGIN_STORE]: [S.CONFIRMADO_ADMIN, S.PREPARANDO_PEDIDO, S.ENTREGA_EN_COORDINACION, S.ENTREGA_PROGRAMADA, S.ASIGNADO_MOTORISTA, S.EN_RECOLECCION],
  [A.SCHEDULE_DELIVERY]: [S.CONFIRMADO_ADMIN, S.PREPARANDO_PEDIDO, S.ENTREGA_EN_COORDINACION, S.PENDIENTE_REPROGRAMACION, S.PAQUETE_DEVUELTO],
  [A.ASSIGN_DRIVER]: [S.ENTREGA_PROGRAMADA, S.REPROGRAMADO, S.PREPARANDO_PEDIDO],
  [A.REASSIGN_DRIVER]: [S.ASIGNADO_MOTORISTA, S.EN_RECOLECCION, S.RECOLECCION_COMPLETA, S.EN_RUTA, S.CLIENTE_NO_LOCALIZADO, S.ENTREGA_FALLIDA, S.PENDIENTE_REPROGRAMACION],
  [A.RESCHEDULE_DELIVERY]: [
    S.ENTREGA_PROGRAMADA,
    S.ASIGNADO_MOTORISTA,
    S.CLIENTE_NO_LOCALIZADO,
    S.ENTREGA_FALLIDA,
    S.PENDIENTE_REPROGRAMACION,
    S.PAQUETE_DEVUELTO,
    S.REPROGRAMADO,
  ],
  [A.CHANGE_ADDRESS]: [
    S.PEDIDO_SOLICITADO,
    S.EN_REVISION,
    S.CONFIRMADO_ADMIN,
    S.ENTREGA_EN_COORDINACION,
    S.ENTREGA_PROGRAMADA,
    S.PENDIENTE_REPROGRAMACION,
    S.CLIENTE_NO_LOCALIZADO,
    S.ENTREGA_FALLIDA,
  ],
  [A.REQUEST_RETURN]: [S.CLIENTE_NO_LOCALIZADO, S.ENTREGA_FALLIDA, S.PENDIENTE_REPROGRAMACION, S.EN_RUTA],
  [A.DEFINE_RETURN_POINT]: [S.CLIENTE_NO_LOCALIZADO, S.ENTREGA_FALLIDA, S.PENDIENTE_REPROGRAMACION, S.EN_RUTA, S.DEVOLUCION_EN_PROCESO],
  [A.CONFIRM_RETURN]: [S.PAQUETE_DEVUELTO],
  [A.CLOSE_INCIDENT]: [S.PAQUETE_DEVUELTO, S.PENDIENTE_REPROGRAMACION, S.CLIENTE_NO_LOCALIZADO, S.ENTREGA_FALLIDA],

  // Motorista — operación
  [A.MARK_PICKED_UP]: [S.ASIGNADO_MOTORISTA, S.EN_RECOLECCION],
  [A.MARK_PICKUP_COMPLETE]: [S.ASIGNADO_MOTORISTA, S.EN_RECOLECCION],
  [A.START_ROUTE]: [S.EN_RECOLECCION, S.RECOLECCION_COMPLETA],
  [A.MARK_DELIVERED]: [S.EN_RUTA],
  [A.CONFIRM_CASH_RECEIVED]: [S.EN_RUTA, S.ENTREGADO],
  [A.REPORT_INCIDENT]: [S.ASIGNADO_MOTORISTA, S.EN_RECOLECCION, S.RECOLECCION_COMPLETA, S.EN_RUTA],
  [A.REQUEST_RETURN_DRIVER]: [S.CLIENTE_NO_LOCALIZADO, S.ENTREGA_FALLIDA, S.EN_RUTA, S.PENDIENTE_REPROGRAMACION],
  [A.MARK_PACKAGE_RETURNED]: [S.DEVOLUCION_EN_PROCESO],
};

/** ¿Este rol puede ejecutar esta acción (a nivel de rol, sin mirar estado)? */
export function canActorPerform(actor: StoreActor, action: StoreOrderAction): boolean {
  return ROLE_ACTIONS[actor]?.has(action) ?? false;
}

/** ¿La acción es válida en el estado actual del pedido? */
export function isActionAllowedInOrderStatus(action: StoreOrderAction, orderStatus: string): boolean {
  if (STORE_ORDER_TERMINAL_STATUSES.includes(orderStatus)) {
    // En estados terminales solo se permite consultar.
    return action === A.VIEW_OWN_ORDER || action === A.VIEW_ANY_ORDER || action === A.VIEW_ASSIGNED_ORDER;
  }
  const allowed = ORDER_ACTION_ALLOWED_STATUSES[action];
  if (!allowed) return true; // acciones sin restricción explícita de estado
  return allowed.includes(orderStatus);
}

/**
 * Valida rol + estado para una acción. Lanza si el actor no tiene permiso (Forbidden)
 * o si el estado actual no admite la acción (BadRequest). Devuelve void si todo OK.
 */
export function assertOrderActionAllowed(
  actor: StoreActor,
  action: StoreOrderAction,
  context: { orderStatus: string },
): void {
  if (!canActorPerform(actor, action)) {
    throw new ForbiddenException('No tienes permiso para realizar esta acción sobre el pedido.');
  }
  if (!isActionAllowedInOrderStatus(action, context.orderStatus)) {
    throw new BadRequestException('Esta acción no está disponible en el estado actual del pedido.');
  }
}

/** Lista de acciones disponibles para un actor en un estado dado (útil para UI "Acción requerida"). */
export function availableActionsFor(actor: StoreActor, orderStatus: string): StoreOrderAction[] {
  return [...(ROLE_ACTIONS[actor] ?? [])].filter((action) => isActionAllowedInOrderStatus(action, orderStatus));
}
