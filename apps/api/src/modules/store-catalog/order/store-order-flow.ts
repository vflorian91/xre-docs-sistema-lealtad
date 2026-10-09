import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  STORE_DELIVERY_STATUS,
  STORE_ORDER_STATUS,
  STORE_ORDER_TERMINAL_STATUSES,
  STORE_PAYMENT_METHOD,
  STORE_PAYMENT_STATUS,
} from './store-order.constants';
import {
  canActorPerform,
  isActionAllowedInOrderStatus,
  STORE_ACTOR,
  STORE_ORDER_ACTION,
  StoreActor,
  StoreOrderAction,
} from './store-order-permissions';

/**
 * FRD 08 — Ajuste: flujo LINEAL del pedido (fuente única de verdad).
 *
 * El pedido avanza etapa por etapa. Una etapa futura está BLOQUEADA hasta que la
 * anterior se completa. Este modelo gobierna backend (gating de acciones) y UI
 * (stepper + card "Acción requerida"). La UI no debe inventar acciones: consume
 * `flow` / `nextAction` que el backend calcula con estas funciones.
 *
 * Importante (realidad del código actual): `orderStatus` NO refleja el pago ni la
 * programación (eso vive en `paymentStatus`, `deliveryStatus`, `assignedDriverId` y
 * la recolección por ítem). Por eso el flujo se computa de la COMBINACIÓN.
 */

export type OrderFlowContext = {
  orderStatus: string;
  paymentStatus: string;
  deliveryStatus: string;
  paymentMethod: string;
  hasDriver: boolean;
  itemsTotal: number;
  itemsActive: number; // ítems no cancelados
  itemsWithStore: number; // ítems con tienda origen asignada
  itemsPicked: number; // ítems recolectados
};

export type FlowStageStatus = 'COMPLETED' | 'CURRENT' | 'BLOCKED';

export type FlowStageKey =
  | 'PEDIDO_SOLICITADO'
  | 'PAGO_REPORTADO'
  | 'PAGO_CONFIRMADO'
  | 'ENTREGA_PROGRAMADA'
  | 'TIENDAS_ORIGEN_ASIGNADAS'
  | 'MOTORISTA_ASIGNADO'
  | 'EN_RECOLECCION'
  | 'RECOLECCION_COMPLETA'
  | 'EN_CAMINO'
  | 'ENTREGADO';

const M = STORE_PAYMENT_METHOD;
const PS = STORE_PAYMENT_STATUS;
const DS = STORE_DELIVERY_STATUS;
const OS = STORE_ORDER_STATUS;
const ACTION = STORE_ORDER_ACTION;

const inList = (value: string, list: readonly string[]): boolean => list.includes(value);

// ── Predicados monotónicos (una vez verdaderos, siguen verdaderos al avanzar) ──
function paymentReported(c: OrderFlowContext): boolean {
  return (
    paymentCleared(c) ||
    inList(c.paymentStatus, [PS.COMPROBANTE_ENVIADO, PS.CONTRA_ENTREGA_PENDIENTE, PS.LINK_ENVIADO, PS.VISA_LINK_SOLICITADO])
  );
}
function paymentCleared(c: OrderFlowContext): boolean {
  return isPaymentClearedForScheduling(c.paymentStatus, c.paymentMethod);
}

/**
 * ¿El pago habilita programar la entrega? (FRD §6: aprobado, o efectivo contra entrega).
 * Exportado para cablear el guard en el endpoint de programación sin recomputar todo el flujo.
 */
export function isPaymentClearedForScheduling(paymentStatus: string, paymentMethod: string): boolean {
  if (paymentStatus === PS.PAGO_CONFIRMADO || paymentStatus === PS.PAGO_RECIBIDO_CONTRA_ENTREGA) return true;
  if (paymentMethod === M.EFECTIVO_CONTRA_ENTREGA && paymentStatus === PS.CONTRA_ENTREGA_PENDIENTE) return true;
  return false;
}
function scheduled(c: OrderFlowContext): boolean {
  return inList(c.deliveryStatus, [
    DS.PROGRAMADA,
    DS.REPROGRAMADA,
    DS.ASIGNADA,
    DS.EN_RECOLECCION,
    DS.RECOLECCION_COMPLETA,
    DS.EN_RUTA,
    DS.ENTREGADA,
  ]);
}
function storesAssigned(c: OrderFlowContext): boolean {
  return c.itemsActive > 0 && c.itemsWithStore >= c.itemsActive;
}
function driverAssigned(c: OrderFlowContext): boolean {
  return c.hasDriver;
}
function pickupComplete(c: OrderFlowContext): boolean {
  if (inList(c.deliveryStatus, [DS.RECOLECCION_COMPLETA, DS.EN_RUTA, DS.ENTREGADA])) return true;
  if (onTheWay(c) || delivered(c)) return true;
  return c.itemsActive > 0 && c.itemsPicked >= c.itemsActive;
}
function pickupStarted(c: OrderFlowContext): boolean {
  return pickupComplete(c) || c.itemsPicked > 0 || c.deliveryStatus === DS.EN_RECOLECCION;
}
function onTheWay(c: OrderFlowContext): boolean {
  return c.orderStatus === OS.EN_RUTA || c.deliveryStatus === DS.EN_RUTA || delivered(c);
}
function delivered(c: OrderFlowContext): boolean {
  return c.orderStatus === OS.ENTREGADO || c.deliveryStatus === DS.ENTREGADA;
}

type StageDef = {
  key: FlowStageKey;
  label: string;
  actor: StoreActor;
  /** Acción que completa/avanza esta etapa (si la hay). */
  action: StoreOrderAction | null;
  isCompleted: (c: OrderFlowContext) => boolean;
};

/** Definición canónica del flujo lineal (FRD §16/§ajuste). */
export const STORE_ORDER_FLOW: readonly StageDef[] = [
  { key: 'PEDIDO_SOLICITADO', label: 'Pedido solicitado', actor: STORE_ACTOR.CLIENT, action: null, isCompleted: () => true },
  { key: 'PAGO_REPORTADO', label: 'Pago reportado', actor: STORE_ACTOR.CLIENT, action: ACTION.REPORT_PAYMENT, isCompleted: paymentReported },
  { key: 'PAGO_CONFIRMADO', label: 'Pago confirmado', actor: STORE_ACTOR.ADMIN, action: ACTION.APPROVE_PAYMENT, isCompleted: paymentCleared },
  { key: 'ENTREGA_PROGRAMADA', label: 'Entrega programada', actor: STORE_ACTOR.ADMIN, action: ACTION.SCHEDULE_DELIVERY, isCompleted: scheduled },
  { key: 'TIENDAS_ORIGEN_ASIGNADAS', label: 'Tiendas origen asignadas', actor: STORE_ACTOR.ADMIN, action: ACTION.ASSIGN_ORIGIN_STORE, isCompleted: storesAssigned },
  { key: 'MOTORISTA_ASIGNADO', label: 'Motorista asignado', actor: STORE_ACTOR.ADMIN, action: ACTION.ASSIGN_DRIVER, isCompleted: driverAssigned },
  { key: 'EN_RECOLECCION', label: 'En recolección', actor: STORE_ACTOR.DRIVER, action: ACTION.MARK_PICKED_UP, isCompleted: pickupStarted },
  { key: 'RECOLECCION_COMPLETA', label: 'Recolección completa', actor: STORE_ACTOR.DRIVER, action: ACTION.MARK_PICKUP_COMPLETE, isCompleted: pickupComplete },
  { key: 'EN_CAMINO', label: 'En camino', actor: STORE_ACTOR.DRIVER, action: ACTION.START_ROUTE, isCompleted: onTheWay },
  { key: 'ENTREGADO', label: 'Entregado', actor: STORE_ACTOR.DRIVER, action: ACTION.MARK_DELIVERED, isCompleted: delivered },
];

/** Mapa acción → etapa que avanza (solo acciones lineales del flujo feliz). */
const STAGE_ADVANCING_ACTION: Partial<Record<StoreOrderAction, FlowStageKey>> = {
  [ACTION.REPORT_PAYMENT]: 'PAGO_REPORTADO',
  [ACTION.REPORT_VISA_LINK_PAYMENT]: 'PAGO_REPORTADO',
  [ACTION.REGISTER_CASH]: 'PAGO_REPORTADO',
  [ACTION.APPROVE_PAYMENT]: 'PAGO_CONFIRMADO',
  [ACTION.SCHEDULE_DELIVERY]: 'ENTREGA_PROGRAMADA',
  [ACTION.ASSIGN_ORIGIN_STORE]: 'TIENDAS_ORIGEN_ASIGNADAS',
  [ACTION.ASSIGN_DRIVER]: 'MOTORISTA_ASIGNADO',
  [ACTION.MARK_PICKED_UP]: 'EN_RECOLECCION',
  [ACTION.MARK_PICKUP_COMPLETE]: 'RECOLECCION_COMPLETA',
  [ACTION.START_ROUTE]: 'EN_CAMINO',
  [ACTION.MARK_DELIVERED]: 'ENTREGADO',
};

export type OrderFlowStage = {
  key: FlowStageKey;
  label: string;
  actor: StoreActor;
  status: FlowStageStatus;
  action: StoreOrderAction | null;
};

export type OrderFlow = {
  stages: OrderFlowStage[];
  currentStageKey: FlowStageKey | null;
  terminal: 'DELIVERED' | 'CANCELLED' | null;
  incident: boolean;
};

const INCIDENT_ORDER_STATUSES: string[] = [
  OS.CLIENTE_NO_LOCALIZADO,
  OS.ENTREGA_FALLIDA,
  OS.PENDIENTE_REPROGRAMACION,
  OS.DEVOLUCION_EN_PROCESO,
  OS.PAQUETE_DEVUELTO,
  OS.NO_ENTREGADO,
];

/**
 * Construye el flujo lineal con el estado de cada etapa: COMPLETED / CURRENT / BLOCKED.
 * La etapa CURRENT es la primera no completada; todas las posteriores quedan BLOCKED.
 */
export function buildOrderFlow(c: OrderFlowContext): OrderFlow {
  const terminalCancelled =
    c.orderStatus === OS.CANCELADO || c.orderStatus === OS.CERRADO_POR_INCIDENCIA;
  const completedFlags = STORE_ORDER_FLOW.map((stage) => stage.isCompleted(c));
  const firstIncomplete = completedFlags.findIndex((done) => !done);

  const stages: OrderFlowStage[] = STORE_ORDER_FLOW.map((stage, index) => {
    let status: FlowStageStatus;
    if (terminalCancelled) {
      status = completedFlags[index] ? 'COMPLETED' : 'BLOCKED';
    } else if (firstIncomplete === -1) {
      status = 'COMPLETED';
    } else if (index < firstIncomplete) {
      status = 'COMPLETED';
    } else if (index === firstIncomplete) {
      status = 'CURRENT';
    } else {
      status = 'BLOCKED';
    }
    return { key: stage.key, label: stage.label, actor: stage.actor, status, action: stage.action };
  });

  const terminal: OrderFlow['terminal'] = delivered(c) ? 'DELIVERED' : terminalCancelled ? 'CANCELLED' : null;
  const currentStageKey =
    terminal || firstIncomplete === -1 ? null : STORE_ORDER_FLOW[firstIncomplete].key;

  return {
    stages,
    currentStageKey,
    terminal,
    incident: INCIDENT_ORDER_STATUSES.includes(c.orderStatus),
  };
}

/** Siguiente acción lineal requerida para un actor (para la card "Acción requerida"). null = está esperando a otro actor. */
export function nextRequiredActionFor(
  c: OrderFlowContext,
  actor: StoreActor,
): { stageKey: FlowStageKey; action: StoreOrderAction; label: string } | null {
  const flow = buildOrderFlow(c);
  // Con una incidencia activa, el flujo lineal queda en pausa: la resolución es del admin
  // (reprogramar / devolución / cancelar), no una acción lineal del motorista/cliente.
  if (flow.incident) {
    if (actor === STORE_ACTOR.ADMIN) {
      return {
        stageKey: 'ENTREGADO',
        action: STORE_ORDER_ACTION.REVIEW_INCIDENT,
        label: 'Revisar incidencia de entrega',
      };
    }
    return null;
  }
  if (!flow.currentStageKey) return null;
  const stageDef = STORE_ORDER_FLOW.find((s) => s.key === flow.currentStageKey);
  if (!stageDef || stageDef.actor !== actor || !stageDef.action) return null;
  return { stageKey: stageDef.key, action: stageDef.action, label: stageDef.label };
}

/**
 * Gating completo de una acción combinando rol + flujo lineal:
 * - Acciones que AVANZAN el flujo: solo válidas si su etapa es la CURRENT (sin saltos).
 * - Acciones correctivas/paralelas (rechazo, reprogramar, incidencia, devolución, etc.):
 *   se validan por estado del pedido (matriz `isActionAllowedInOrderStatus`).
 */
export function assertActionAllowedInFlow(actor: StoreActor, action: StoreOrderAction, c: OrderFlowContext): void {
  if (!canActorPerform(actor, action)) {
    throw new ForbiddenException('No tienes permiso para realizar esta acción sobre el pedido.');
  }
  if (STORE_ORDER_TERMINAL_STATUSES.includes(c.orderStatus)) {
    throw new BadRequestException('El pedido está en un estado final; no admite nuevas acciones operativas.');
  }

  const advancingStage = STAGE_ADVANCING_ACTION[action];
  if (advancingStage) {
    const flow = buildOrderFlow(c);
    if (flow.incident) {
      throw new BadRequestException('El pedido tiene una incidencia pendiente de revisión del administrador.');
    }
    if (flow.currentStageKey !== advancingStage) {
      throw new BadRequestException('Aún no puedes ejecutar esta acción: la etapa anterior del flujo no está completa.');
    }
    return;
  }

  // Acción correctiva/paralela: se valida por estado.
  if (!isActionAllowedInOrderStatus(action, c.orderStatus)) {
    throw new BadRequestException('Esta acción no está disponible en el estado actual del pedido.');
  }
}
