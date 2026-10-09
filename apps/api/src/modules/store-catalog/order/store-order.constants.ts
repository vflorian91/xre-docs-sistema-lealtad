export const STORE_PAYMENT_METHOD = {
  EFECTIVO_CONTRA_ENTREGA: 'EFECTIVO_CONTRA_ENTREGA',
  VISA_LINK_MANUAL: 'VISA_LINK_MANUAL',
  TRANSFERENCIA_BANCARIA: 'TRANSFERENCIA_BANCARIA',
  DEPOSITO_BANCARIO: 'DEPOSITO_BANCARIO',
} as const;

export type StorePaymentMethod = (typeof STORE_PAYMENT_METHOD)[keyof typeof STORE_PAYMENT_METHOD];

export const STORE_PAYMENT_STATUS = {
  PENDIENTE_PAGO: 'PENDIENTE_PAGO',
  PENDIENTE_LINK: 'PENDIENTE_LINK',
  LINK_ENVIADO: 'LINK_ENVIADO',
  PENDIENTE_CONFIRMACION: 'PENDIENTE_CONFIRMACION',
  // Nuevo flujo: el cliente reporta el pago subiendo comprobante; queda en revisión del admin (no auto-aprueba).
  COMPROBANTE_ENVIADO: 'COMPROBANTE_ENVIADO',
  // Visa Link: el cliente solicita el enlace antes de que el admin lo envíe.
  VISA_LINK_SOLICITADO: 'VISA_LINK_SOLICITADO',
  // Efectivo: queda pendiente de cobro contra entrega (no se marca pagado).
  CONTRA_ENTREGA_PENDIENTE: 'CONTRA_ENTREGA_PENDIENTE',
  // FRD 08: el cliente vio las instrucciones de pago (depósito/transferencia) pero aún no reporta.
  INSTRUCCIONES_MOSTRADAS: 'INSTRUCCIONES_MOSTRADAS',
  PAGO_CONFIRMADO: 'PAGO_CONFIRMADO',
  // FRD 08: efectivo cobrado físicamente y confirmado (motorista/admin). No es lo mismo que aprobar comprobante.
  PAGO_RECIBIDO_CONTRA_ENTREGA: 'PAGO_RECIBIDO_CONTRA_ENTREGA',
  PAGO_RECHAZADO: 'PAGO_RECHAZADO',
  NO_PAGADO: 'NO_PAGADO',
  ANULADO: 'ANULADO',
} as const;

export const STORE_SETTLEMENT_STATUS = {
  PENDIENTE_LIQUIDAR: 'PENDIENTE_LIQUIDAR',
  NO_APLICA: 'NO_APLICA',
  LIQUIDADO: 'LIQUIDADO',
  CON_INCIDENCIA: 'CON_INCIDENCIA',
} as const;

export const STORE_ORDER_STATUS = {
  PEDIDO_SOLICITADO: 'PEDIDO_SOLICITADO',
  EN_REVISION: 'EN_REVISION',
  CONFIRMADO_ADMIN: 'CONFIRMADO_ADMIN',
  // FRD 08: coordinación previa a fijar fecha, y entrega ya programada a nivel de pedido.
  ENTREGA_EN_COORDINACION: 'ENTREGA_EN_COORDINACION',
  ENTREGA_PROGRAMADA: 'ENTREGA_PROGRAMADA',
  REPROGRAMADO: 'REPROGRAMADO',
  PREPARANDO_PEDIDO: 'PREPARANDO_PEDIDO',
  ASIGNADO_MOTORISTA: 'ASIGNADO_MOTORISTA',
  // FRD 08: estados operativos de recolección a nivel de pedido.
  EN_RECOLECCION: 'EN_RECOLECCION',
  RECOLECCION_COMPLETA: 'RECOLECCION_COMPLETA',
  EN_RUTA: 'EN_RUTA',
  ENTREGADO: 'ENTREGADO',
  NO_ENTREGADO: 'NO_ENTREGADO',
  // FRD 08: incidencias, reprogramación y devolución.
  CLIENTE_NO_LOCALIZADO: 'CLIENTE_NO_LOCALIZADO',
  ENTREGA_FALLIDA: 'ENTREGA_FALLIDA',
  PENDIENTE_REPROGRAMACION: 'PENDIENTE_REPROGRAMACION',
  DEVOLUCION_EN_PROCESO: 'DEVOLUCION_EN_PROCESO',
  PAQUETE_DEVUELTO: 'PAQUETE_DEVUELTO',
  CERRADO_POR_INCIDENCIA: 'CERRADO_POR_INCIDENCIA',
  CANCELADO: 'CANCELADO',
} as const;

export const STORE_DELIVERY_STATUS = {
  PENDIENTE_PROGRAMACION: 'PENDIENTE_PROGRAMACION',
  PROGRAMADA: 'PROGRAMADA',
  REPROGRAMADA: 'REPROGRAMADA',
  PREPARANDO_PEDIDO: 'PREPARANDO_PEDIDO',
  ASIGNADA: 'ASIGNADA',
  // FRD 08: recolección a nivel de entrega.
  EN_RECOLECCION: 'EN_RECOLECCION',
  RECOLECCION_COMPLETA: 'RECOLECCION_COMPLETA',
  EN_RUTA: 'EN_RUTA',
  ENTREGADA: 'ENTREGADA',
  NO_ENTREGADA: 'NO_ENTREGADA',
  // FRD 08: fallida, pendiente de reprogramación y devolución.
  FALLIDA: 'FALLIDA',
  PENDIENTE_REPROGRAMACION: 'PENDIENTE_REPROGRAMACION',
  DEVOLUCION_EN_PROCESO: 'DEVOLUCION_EN_PROCESO',
  DEVUELTA: 'DEVUELTA',
  CANCELADA: 'CANCELADA',
} as const;

export const STORE_ORDER_TIMELINE_STATUS_TYPE = {
  ORDER_STATUS: 'ORDER_STATUS',
  PAYMENT_STATUS: 'PAYMENT_STATUS',
  DELIVERY_STATUS: 'DELIVERY_STATUS',
  PICKUP_STATUS: 'PICKUP_STATUS',
} as const;

export const STORE_CART_STATUS = {
  ACTIVE: 'ACTIVE',
  ORDERED: 'ORDERED',
  ABANDONED: 'ABANDONED',
} as const;

export const STORE_TIMELINE_ROLE = {
  CLIENT: 'CLIENT',
  INTERNAL_USER: 'INTERNAL_USER',
  DRIVER: 'DRIVER',
  SYSTEM: 'SYSTEM',
} as const;

export const STORE_DELIVERY_TIME_RANGES = ['09:00 a 12:00', '12:00 a 15:00', '15:00 a 18:00'] as const;

const INITIAL_PAYMENT_STATUS_BY_METHOD: Record<StorePaymentMethod, string> = {
  [STORE_PAYMENT_METHOD.EFECTIVO_CONTRA_ENTREGA]: STORE_PAYMENT_STATUS.PENDIENTE_PAGO,
  [STORE_PAYMENT_METHOD.VISA_LINK_MANUAL]: STORE_PAYMENT_STATUS.PENDIENTE_LINK,
  [STORE_PAYMENT_METHOD.TRANSFERENCIA_BANCARIA]: STORE_PAYMENT_STATUS.PENDIENTE_CONFIRMACION,
  [STORE_PAYMENT_METHOD.DEPOSITO_BANCARIO]: STORE_PAYMENT_STATUS.PENDIENTE_CONFIRMACION,
};

export function initialPaymentStatusForMethod(method: StorePaymentMethod) {
  return INITIAL_PAYMENT_STATUS_BY_METHOD[method];
}

// ───────────────────────────────────────────────────────────────────────────
// Nuevo flujo (aditivo): estados de recolección por producto y estado visible
// para el cliente. Las columnas en BD son String, así que estos valores no
// requieren migración. No se eliminan ni renombran los estados existentes.
// ───────────────────────────────────────────────────────────────────────────

export const STORE_PICKUP_STATUS = {
  PENDIENTE_ASIGNAR_TIENDA: 'PENDIENTE_ASIGNAR_TIENDA',
  TIENDA_ASIGNADA: 'TIENDA_ASIGNADA',
  PENDIENTE_RECOLECCION: 'PENDIENTE_RECOLECCION',
  RECOLECTADO: 'RECOLECTADO',
  NO_DISPONIBLE: 'NO_DISPONIBLE',
  SUSTITUCION_REQUERIDA: 'SUSTITUCION_REQUERIDA',
  CANCELADO: 'CANCELADO',
  // FRD 08: el producto regresó tras una devolución y queda pendiente de revisión/reintegro.
  DEVUELTO_PENDIENTE_REVISION: 'DEVUELTO_PENDIENTE_REVISION',
  REINTEGRADO: 'REINTEGRADO',
} as const;

export type StorePickupStatus = (typeof STORE_PICKUP_STATUS)[keyof typeof STORE_PICKUP_STATUS];

/** Un producto se considera "listo" para avanzar la entrega si fue recolectado o quedó fuera del flujo. */
export const PICKUP_RESOLVED_STATUSES: string[] = [
  STORE_PICKUP_STATUS.RECOLECTADO,
  STORE_PICKUP_STATUS.NO_DISPONIBLE,
  STORE_PICKUP_STATUS.CANCELADO,
];

/** Estados que cuentan como "incidencia" y bloquean la entrega hasta resolución administrativa. */
export const PICKUP_INCIDENT_STATUSES: string[] = [
  STORE_PICKUP_STATUS.NO_DISPONIBLE,
  STORE_PICKUP_STATUS.SUSTITUCION_REQUERIDA,
];

export type PickupItem = { pickupStatus: string };

/** Resumen de recolección para el panel admin. */
export function pickupSummary(items: PickupItem[]) {
  const counts = {
    total: items.length,
    pendienteTienda: 0,
    pendienteRecoleccion: 0,
    recolectados: 0,
    incidencias: 0,
    cancelados: 0,
  };
  for (const item of items) {
    if (item.pickupStatus === STORE_PICKUP_STATUS.PENDIENTE_ASIGNAR_TIENDA) counts.pendienteTienda += 1;
    else if (
      item.pickupStatus === STORE_PICKUP_STATUS.TIENDA_ASIGNADA ||
      item.pickupStatus === STORE_PICKUP_STATUS.PENDIENTE_RECOLECCION
    ) {
      counts.pendienteRecoleccion += 1;
    } else if (item.pickupStatus === STORE_PICKUP_STATUS.RECOLECTADO) counts.recolectados += 1;
    else if (PICKUP_INCIDENT_STATUSES.includes(item.pickupStatus)) counts.incidencias += 1;
    else if (item.pickupStatus === STORE_PICKUP_STATUS.CANCELADO) counts.cancelados += 1;
  }
  return counts;
}

/**
 * Indica si el pedido puede pasar a EN_RUTA (en camino).
 * Regla: todos los productos NO cancelados deben estar RECOLECTADO y no debe
 * haber incidencias (NO_DISPONIBLE / SUSTITUCION_REQUERIDA) sin resolver.
 */
export function pickupReadinessForDelivery(items: PickupItem[]): { ready: boolean; reason?: string } {
  const active = items.filter((item) => item.pickupStatus !== STORE_PICKUP_STATUS.CANCELADO);
  if (active.length === 0) {
    return { ready: false, reason: 'El pedido no tiene productos activos para entregar.' };
  }
  if (active.some((item) => PICKUP_INCIDENT_STATUSES.includes(item.pickupStatus))) {
    return { ready: false, reason: 'Hay productos con incidencia (no disponible o sustitución). Requiere resolución administrativa.' };
  }
  if (active.some((item) => item.pickupStatus !== STORE_PICKUP_STATUS.RECOLECTADO)) {
    return { ready: false, reason: 'Aún hay productos pendientes de recolectar.' };
  }
  return { ready: true };
}

/** Estados que ve el cliente. Nunca exponen el detalle de recolección por producto. */
export const STORE_CLIENT_VISIBLE_STATUS = {
  PEDIDO_SOLICITADO: 'PEDIDO_SOLICITADO',
  PAGO_PENDIENTE: 'PAGO_PENDIENTE',
  PAGO_EN_REVISION: 'PAGO_EN_REVISION',
  PAGO_RECHAZADO: 'PAGO_RECHAZADO',
  PAGO_CONFIRMADO: 'PAGO_CONFIRMADO',
  PREPARANDO_PEDIDO: 'PREPARANDO_PEDIDO',
  ENTREGA_PROGRAMADA: 'ENTREGA_PROGRAMADA',
  EN_CAMINO: 'EN_CAMINO',
  ENTREGADO: 'ENTREGADO',
  NO_ENTREGADO: 'NO_ENTREGADO',
  CANCELADO: 'CANCELADO',
} as const;

export type StoreClientVisibleStatus = (typeof STORE_CLIENT_VISIBLE_STATUS)[keyof typeof STORE_CLIENT_VISIBLE_STATUS];

export const STORE_CLIENT_VISIBLE_LABELS: Record<StoreClientVisibleStatus, string> = {
  PEDIDO_SOLICITADO: 'Pedido solicitado',
  PAGO_PENDIENTE: 'Pago pendiente',
  PAGO_EN_REVISION: 'Pago en revisión',
  PAGO_RECHAZADO: 'Pago rechazado',
  PAGO_CONFIRMADO: 'Pago confirmado',
  PREPARANDO_PEDIDO: 'Preparando pedido',
  ENTREGA_PROGRAMADA: 'Entrega programada',
  EN_CAMINO: 'En camino',
  ENTREGADO: 'Entregado',
  NO_ENTREGADO: 'No pudimos entregar',
  CANCELADO: 'Cancelado',
};

/** Estados internos de pedido que cuentan como "pedido activo" para el dashboard del cliente. */
export const STORE_CLIENT_ACTIVE_ORDER_STATUSES: string[] = [
  STORE_ORDER_STATUS.PEDIDO_SOLICITADO,
  STORE_ORDER_STATUS.EN_REVISION,
  STORE_ORDER_STATUS.CONFIRMADO_ADMIN,
  STORE_ORDER_STATUS.ENTREGA_EN_COORDINACION,
  STORE_ORDER_STATUS.ENTREGA_PROGRAMADA,
  STORE_ORDER_STATUS.REPROGRAMADO,
  STORE_ORDER_STATUS.PREPARANDO_PEDIDO,
  STORE_ORDER_STATUS.ASIGNADO_MOTORISTA,
  STORE_ORDER_STATUS.EN_RECOLECCION,
  STORE_ORDER_STATUS.RECOLECCION_COMPLETA,
  STORE_ORDER_STATUS.EN_RUTA,
  STORE_ORDER_STATUS.NO_ENTREGADO,
  STORE_ORDER_STATUS.CLIENTE_NO_LOCALIZADO,
  STORE_ORDER_STATUS.ENTREGA_FALLIDA,
  STORE_ORDER_STATUS.PENDIENTE_REPROGRAMACION,
  STORE_ORDER_STATUS.DEVOLUCION_EN_PROCESO,
  STORE_ORDER_STATUS.PAQUETE_DEVUELTO,
];

/** Estados internos de pedido terminales (sin más operación posible). */
export const STORE_ORDER_TERMINAL_STATUSES: string[] = [
  STORE_ORDER_STATUS.ENTREGADO,
  STORE_ORDER_STATUS.CANCELADO,
  STORE_ORDER_STATUS.CERRADO_POR_INCIDENCIA,
];

/** Estados internos de pedido que representan una incidencia/entrega fallida. */
export const STORE_ORDER_INCIDENT_STATUSES: string[] = [
  STORE_ORDER_STATUS.CLIENTE_NO_LOCALIZADO,
  STORE_ORDER_STATUS.ENTREGA_FALLIDA,
  STORE_ORDER_STATUS.PENDIENTE_REPROGRAMACION,
  STORE_ORDER_STATUS.NO_ENTREGADO,
];

// ───────────────────────────────────────────────────────────────────────────
// FRD 08 · Slice B — Catálogo de incidencias del motorista.
// ───────────────────────────────────────────────────────────────────────────
export const STORE_INCIDENT_STATUS = {
  PENDIENTE_REVISION: 'PENDIENTE_REVISION',
  REVISADA: 'REVISADA',
  REPROGRAMADA: 'REPROGRAMADA',
  CERRADA: 'CERRADA',
} as const;

export type StoreDeliveryIncidentType = {
  code: string;
  label: string;
  description: string;
  requiresComment: boolean;
  recommendsPhoto: boolean;
  recommendsLocation: boolean;
  /** Estado de pedido resultante al reportar esta incidencia. */
  targetOrderStatus: string;
};

const OS_INC = STORE_ORDER_STATUS;

export const STORE_DELIVERY_INCIDENT_TYPES: StoreDeliveryIncidentType[] = [
  { code: 'TIENDA_CERRADA', label: 'Tienda cerrada', description: 'La tienda estaba cerrada al llegar.', requiresComment: true, recommendsPhoto: true, recommendsLocation: true, targetOrderStatus: OS_INC.PENDIENTE_REPROGRAMACION },
  { code: 'SIN_PERSONAL_MOSTRADOR', label: 'Sin personal en mostrador', description: 'No había personal disponible para entregar el producto.', requiresComment: true, recommendsPhoto: false, recommendsLocation: true, targetOrderStatus: OS_INC.PENDIENTE_REPROGRAMACION },
  { code: 'PRODUCTO_NO_ENCONTRADO', label: 'Producto no encontrado', description: 'La tienda no encontró el producto solicitado.', requiresComment: true, recommendsPhoto: false, recommendsLocation: false, targetOrderStatus: OS_INC.PENDIENTE_REPROGRAMACION },
  { code: 'PAQUETE_NO_PREPARADO', label: 'Paquete no preparado', description: 'El paquete no estaba preparado para recolección.', requiresComment: true, recommendsPhoto: false, recommendsLocation: false, targetOrderStatus: OS_INC.PENDIENTE_REPROGRAMACION },
  { code: 'PRODUCTO_INCOMPLETO', label: 'Producto incompleto', description: 'El producto o paquete estaba incompleto.', requiresComment: true, recommendsPhoto: true, recommendsLocation: false, targetOrderStatus: OS_INC.PENDIENTE_REPROGRAMACION },
  { code: 'TIEMPO_ESPERA_EXCESIVO', label: 'Tiempo de espera excesivo', description: 'La espera en tienda impide continuar normalmente.', requiresComment: true, recommendsPhoto: false, recommendsLocation: true, targetOrderStatus: OS_INC.PENDIENTE_REPROGRAMACION },
  { code: 'DIRECCION_TIENDA_INCORRECTA', label: 'Dirección de tienda incorrecta', description: 'La ubicación de tienda no corresponde.', requiresComment: true, recommendsPhoto: false, recommendsLocation: true, targetOrderStatus: OS_INC.PENDIENTE_REPROGRAMACION },
  { code: 'CLIENTE_NO_LOCALIZADO', label: 'Cliente no localizado', description: 'No se logró ubicar al cliente en la dirección.', requiresComment: true, recommendsPhoto: false, recommendsLocation: true, targetOrderStatus: OS_INC.CLIENTE_NO_LOCALIZADO },
  { code: 'CLIENTE_AUSENTE', label: 'Cliente ausente', description: 'El cliente no se encontraba en el lugar.', requiresComment: true, recommendsPhoto: false, recommendsLocation: true, targetOrderStatus: OS_INC.CLIENTE_NO_LOCALIZADO },
  { code: 'CLIENTE_NO_CONTESTA', label: 'Cliente no contesta', description: 'El cliente no responde llamadas ni mensajes.', requiresComment: true, recommendsPhoto: false, recommendsLocation: false, targetOrderStatus: OS_INC.CLIENTE_NO_LOCALIZADO },
  { code: 'DIRECCION_INCORRECTA', label: 'Dirección incorrecta', description: 'La dirección no corresponde o no existe.', requiresComment: true, recommendsPhoto: false, recommendsLocation: true, targetOrderStatus: OS_INC.PENDIENTE_REPROGRAMACION },
  { code: 'ZONA_INACCESIBLE', label: 'Zona inaccesible', description: 'No es posible acceder a la zona de entrega.', requiresComment: true, recommendsPhoto: false, recommendsLocation: true, targetOrderStatus: OS_INC.PENDIENTE_REPROGRAMACION },
  { code: 'CLIENTE_RECHAZA_PEDIDO', label: 'Cliente rechaza pedido', description: 'El cliente no quiso recibir el pedido.', requiresComment: true, recommendsPhoto: false, recommendsLocation: false, targetOrderStatus: OS_INC.ENTREGA_FALLIDA },
  { code: 'CLIENTE_RECHAZA_PAGO', label: 'Cliente rechaza pago', description: 'El cliente se negó a pagar contra entrega.', requiresComment: true, recommendsPhoto: false, recommendsLocation: false, targetOrderStatus: OS_INC.ENTREGA_FALLIDA },
  { code: 'PAGO_INCOMPLETO', label: 'Pago incompleto', description: 'El cliente no tenía el monto completo.', requiresComment: true, recommendsPhoto: false, recommendsLocation: false, targetOrderStatus: OS_INC.ENTREGA_FALLIDA },
  { code: 'PRODUCTO_DANADO', label: 'Producto dañado', description: 'Un producto llegó dañado.', requiresComment: true, recommendsPhoto: true, recommendsLocation: false, targetOrderStatus: OS_INC.ENTREGA_FALLIDA },
  { code: 'PAQUETE_INCOMPLETO', label: 'Paquete incompleto', description: 'Falta producto en el paquete.', requiresComment: true, recommendsPhoto: true, recommendsLocation: false, targetOrderStatus: OS_INC.ENTREGA_FALLIDA },
  { code: 'PROBLEMA_DE_RUTA', label: 'Problema de ruta', description: 'Inconveniente que impide continuar la ruta.', requiresComment: true, recommendsPhoto: false, recommendsLocation: true, targetOrderStatus: OS_INC.PENDIENTE_REPROGRAMACION },
  { code: 'EMERGENCIA_MOTORISTA', label: 'Emergencia del motorista', description: 'Emergencia que impide entregar.', requiresComment: true, recommendsPhoto: false, recommendsLocation: true, targetOrderStatus: OS_INC.PENDIENTE_REPROGRAMACION },
  { code: 'OTRO', label: 'Otro', description: 'Otra incidencia no listada.', requiresComment: true, recommendsPhoto: false, recommendsLocation: false, targetOrderStatus: OS_INC.ENTREGA_FALLIDA },
];

export const STORE_DELIVERY_INCIDENT_TYPE_CODES = STORE_DELIVERY_INCIDENT_TYPES.map((t) => t.code) as [string, ...string[]];

export function getIncidentType(code: string): StoreDeliveryIncidentType | undefined {
  return STORE_DELIVERY_INCIDENT_TYPES.find((t) => t.code === code);
}

/**
 * Mapea el estado interno (pedido/pago/entrega) al estado visible para el cliente.
 *
 * REGLA CRÍTICA DE VISIBILIDAD: el cliente nunca ve el detalle de recolección
 * por producto. Mientras el motorista recolecta, el cliente ve "Preparando
 * pedido"; solo ve "En camino" cuando el pedido pasa a EN_RUTA.
 */
function isOneOf(value: string, options: readonly string[]) {
  return options.includes(value);
}

export function mapClientVisibleStatus(input: {
  orderStatus: string;
  paymentStatus: string;
  deliveryStatus: string;
}): StoreClientVisibleStatus {
  const { orderStatus, paymentStatus, deliveryStatus } = input;

  if (
    isOneOf(orderStatus, [STORE_ORDER_STATUS.CANCELADO, STORE_ORDER_STATUS.CERRADO_POR_INCIDENCIA, 'RECHAZADO'])
  ) {
    return STORE_CLIENT_VISIBLE_STATUS.CANCELADO;
  }
  if (orderStatus === STORE_ORDER_STATUS.ENTREGADO || deliveryStatus === STORE_DELIVERY_STATUS.ENTREGADA) {
    return STORE_CLIENT_VISIBLE_STATUS.ENTREGADO;
  }
  // Incidencias / entrega fallida / devolución → el cliente ve un único aviso "No pudimos entregar".
  if (
    isOneOf(orderStatus, [
      STORE_ORDER_STATUS.NO_ENTREGADO,
      STORE_ORDER_STATUS.CLIENTE_NO_LOCALIZADO,
      STORE_ORDER_STATUS.ENTREGA_FALLIDA,
      STORE_ORDER_STATUS.PENDIENTE_REPROGRAMACION,
      STORE_ORDER_STATUS.DEVOLUCION_EN_PROCESO,
      STORE_ORDER_STATUS.PAQUETE_DEVUELTO,
    ]) ||
    isOneOf(deliveryStatus, [
      STORE_DELIVERY_STATUS.NO_ENTREGADA,
      STORE_DELIVERY_STATUS.FALLIDA,
      STORE_DELIVERY_STATUS.PENDIENTE_REPROGRAMACION,
      STORE_DELIVERY_STATUS.DEVOLUCION_EN_PROCESO,
      STORE_DELIVERY_STATUS.DEVUELTA,
    ])
  ) {
    return STORE_CLIENT_VISIBLE_STATUS.NO_ENTREGADO;
  }
  if (orderStatus === STORE_ORDER_STATUS.EN_RUTA || deliveryStatus === STORE_DELIVERY_STATUS.EN_RUTA) {
    return STORE_CLIENT_VISIBLE_STATUS.EN_CAMINO;
  }
  // Preparando: confirmado/en preparación/asignado a motorista o recolectando (nunca se expone el detalle por producto).
  if (
    isOneOf(orderStatus, [
      STORE_ORDER_STATUS.PREPARANDO_PEDIDO,
      STORE_ORDER_STATUS.ASIGNADO_MOTORISTA,
      STORE_ORDER_STATUS.EN_RECOLECCION,
      STORE_ORDER_STATUS.RECOLECCION_COMPLETA,
    ]) ||
    isOneOf(deliveryStatus, [
      STORE_DELIVERY_STATUS.PREPARANDO_PEDIDO,
      STORE_DELIVERY_STATUS.ASIGNADA,
      STORE_DELIVERY_STATUS.EN_RECOLECCION,
      STORE_DELIVERY_STATUS.RECOLECCION_COMPLETA,
    ])
  ) {
    return STORE_CLIENT_VISIBLE_STATUS.PREPARANDO_PEDIDO;
  }
  if (
    orderStatus === STORE_ORDER_STATUS.ENTREGA_PROGRAMADA ||
    isOneOf(deliveryStatus, [STORE_DELIVERY_STATUS.PROGRAMADA, STORE_DELIVERY_STATUS.REPROGRAMADA])
  ) {
    return STORE_CLIENT_VISIBLE_STATUS.ENTREGA_PROGRAMADA;
  }
  if (paymentStatus === STORE_PAYMENT_STATUS.PAGO_RECHAZADO) {
    return STORE_CLIENT_VISIBLE_STATUS.PAGO_RECHAZADO;
  }
  if (paymentStatus === STORE_PAYMENT_STATUS.PAGO_CONFIRMADO) {
    return orderStatus === STORE_ORDER_STATUS.CONFIRMADO_ADMIN
      ? STORE_CLIENT_VISIBLE_STATUS.PREPARANDO_PEDIDO
      : STORE_CLIENT_VISIBLE_STATUS.PAGO_CONFIRMADO;
  }
  if (isOneOf(paymentStatus, [STORE_PAYMENT_STATUS.COMPROBANTE_ENVIADO, STORE_PAYMENT_STATUS.PENDIENTE_CONFIRMACION])) {
    return STORE_CLIENT_VISIBLE_STATUS.PAGO_EN_REVISION;
  }
  if (
    isOneOf(paymentStatus, [
      STORE_PAYMENT_STATUS.PENDIENTE_PAGO,
      STORE_PAYMENT_STATUS.PENDIENTE_LINK,
      STORE_PAYMENT_STATUS.LINK_ENVIADO,
      STORE_PAYMENT_STATUS.VISA_LINK_SOLICITADO,
      STORE_PAYMENT_STATUS.CONTRA_ENTREGA_PENDIENTE,
    ])
  ) {
    return STORE_CLIENT_VISIBLE_STATUS.PAGO_PENDIENTE;
  }
  return STORE_CLIENT_VISIBLE_STATUS.PEDIDO_SOLICITADO;
}
