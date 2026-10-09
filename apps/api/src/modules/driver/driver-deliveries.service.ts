import { createHmac } from 'node:crypto';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import argon2 from 'argon2';
import { DriverAuthUser } from '../auth/auth.types';
import { PrismaService } from '../database/prisma.service';
import {
  STORE_DELIVERY_STATUS,
  STORE_ORDER_STATUS,
  STORE_ORDER_TIMELINE_STATUS_TYPE,
  STORE_PAYMENT_METHOD,
  STORE_PAYMENT_STATUS,
  STORE_PICKUP_STATUS,
  STORE_SETTLEMENT_STATUS,
  STORE_TIMELINE_ROLE,
  STORE_INCIDENT_STATUS,
  getIncidentType,
  pickupReadinessForDelivery,
  pickupSummary,
} from '../store-catalog/order/store-order.constants';
import { StoreOrderTimelineService } from '../store-catalog/order/store-order-timeline.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StoreOrderLoyaltyService } from '../store-catalog/order/store-order-loyalty.service';
import { buildOrderFlow, nextRequiredActionFor, assertActionAllowedInFlow } from '../store-catalog/order/store-order-flow';
import { STORE_ACTOR, STORE_ORDER_ACTION } from '../store-catalog/order/store-order-permissions';
import { ConfirmDeliveryInput, FailedDeliveryInput, MarkPickedUpInput, ReportIncidentInput } from './driver.schemas';

const latestPaymentOrderBy = { createdAt: 'desc' as const };

const deliveryInclude = {
  customer: { select: { id: true, fullName: true, phone: true } },
  items: { orderBy: { createdAt: 'asc' as const } },
  payments: { orderBy: latestPaymentOrderBy, take: 1 },
  timeline: { orderBy: { createdAt: 'asc' as const } },
};

type DeliveryOrder = Prisma.StoreOrderGetPayload<{ include: typeof deliveryInclude }>;

const ACTIVE_DRIVER_DELIVERY_STATUSES = [
  STORE_DELIVERY_STATUS.PROGRAMADA,
  STORE_DELIVERY_STATUS.REPROGRAMADA,
  STORE_DELIVERY_STATUS.PREPARANDO_PEDIDO,
  STORE_DELIVERY_STATUS.ASIGNADA,
  STORE_DELIVERY_STATUS.EN_RECOLECCION,
  STORE_DELIVERY_STATUS.RECOLECCION_COMPLETA,
  STORE_DELIVERY_STATUS.EN_RUTA,
];

const DELIVERY_CODE_STATUS = {
  GENERATED: 'GENERATED',
  PENDING_VALIDATION: 'PENDING_VALIDATION',
  VALIDATED: 'VALIDATED',
} as const;

@Injectable()
export class DriverDeliveriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timelineService: StoreOrderTimelineService,
    private readonly notificationsService: NotificationsService,
    private readonly loyaltyService: StoreOrderLoyaltyService,
  ) {}

  async dashboard(driver: DriverAuthUser) {
    await this.assertDriverActive(driver);
    const today = this.dayRange(new Date());

    const [todayOrders] = await Promise.all([
      this.prisma.storeOrder.findMany({
        where: { assignedDriverId: driver.id, confirmedDeliveryDate: today, orderStatus: { not: STORE_ORDER_STATUS.CANCELADO } },
        orderBy: [{ deliveryTimeRange: 'asc' }, { createdAt: 'desc' }],
        include: deliveryInclude,
      }),
    ]);
    const countByStatus = (statuses: string[]) => todayOrders.filter((order) => statuses.includes(order.deliveryStatus)).length;

    return {
      cards: {
        today: todayOrders.length,
        pending: countByStatus([STORE_DELIVERY_STATUS.ASIGNADA, STORE_DELIVERY_STATUS.PROGRAMADA]),
        inRoute: countByStatus([STORE_DELIVERY_STATUS.EN_RUTA]),
        delivered: countByStatus([STORE_DELIVERY_STATUS.ENTREGADA]),
        failed: countByStatus([STORE_DELIVERY_STATUS.NO_ENTREGADA, STORE_DELIVERY_STATUS.FALLIDA]),
      },
      todayDeliveries: todayOrders.map((order) => this.toSummaryDto(order)),
    };
  }

  async list(driver: DriverAuthUser, query: Record<string, string | undefined> = {}) {
    await this.assertDriverActive(driver);
    const search = query.search?.trim();
    const status = query.status?.trim();
    const date = query.date ? this.dayRange(new Date(query.date)) : undefined;

    const orders = await this.prisma.storeOrder.findMany({
      where: {
        assignedDriverId: driver.id,
        orderStatus: { not: STORE_ORDER_STATUS.CANCELADO },
        ...(status ? { deliveryStatus: status } : { deliveryStatus: { in: ACTIVE_DRIVER_DELIVERY_STATUSES } }),
        ...(date ? { confirmedDeliveryDate: date } : {}),
        ...(search
          ? {
              OR: [
                { orderNumber: { contains: search, mode: 'insensitive' } },
                { customer: { fullName: { contains: search, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      orderBy: [{ confirmedDeliveryDate: 'asc' }, { deliveryTimeRange: 'asc' }, { createdAt: 'desc' }],
      include: deliveryInclude,
      take: 100,
    });

    return orders.map((order) => this.toSummaryDto(order));
  }

  async pickupStops(driver: DriverAuthUser) {
    await this.assertDriverActive(driver);
    const items = await this.prisma.storeOrderItem.findMany({
      where: {
        pickupStatus: { in: [STORE_PICKUP_STATUS.TIENDA_ASIGNADA, STORE_PICKUP_STATUS.PENDIENTE_RECOLECCION] },
        originStoreId: { not: null },
        order: {
          assignedDriverId: driver.id,
          orderStatus: { not: STORE_ORDER_STATUS.CANCELADO },
          deliveryStatus: { in: [STORE_DELIVERY_STATUS.ASIGNADA, STORE_DELIVERY_STATUS.EN_RECOLECCION] },
        },
      },
      orderBy: [{ originStore: { name: 'asc' } }, { order: { confirmedDeliveryDate: 'asc' } }, { order: { deliveryTimeRange: 'asc' } }],
      include: {
        originStore: { select: { id: true, code: true, name: true, address: true } },
        order: {
          include: {
            customer: { select: { id: true, fullName: true, phone: true } },
            items: { select: { pickupStatus: true } },
          },
        },
      },
    });

    const stops = new Map<string, {
      store: { id: string; code: string | null; name: string; address: string | null };
      orders: Map<string, {
        id: string;
        orderNumber: string;
        customer: { id: string; fullName: string; phone: string };
        deliveryAddress: string;
        confirmedDeliveryDate: Date | null;
        deliveryTimeRange: string | null;
        deliveryStatus: string;
        totalAmount: number;
        itemsTotal: number;
        itemsPicked: number;
        pendingItems: Array<{ id: string; productName: string; brandName: string; quantity: number; pickupStatus: string }>;
      }>;
    }>();

    for (const item of items) {
      if (!item.originStore) continue;
      let stop = stops.get(item.originStore.id);
      if (!stop) {
        stop = { store: item.originStore, orders: new Map() };
        stops.set(item.originStore.id, stop);
      }
      let order = stop.orders.get(item.order.id);
      if (!order) {
        order = {
          id: item.order.id,
          orderNumber: item.order.orderNumber,
          customer: item.order.customer,
          deliveryAddress: item.order.deliveryAddress,
          confirmedDeliveryDate: item.order.confirmedDeliveryDate,
          deliveryTimeRange: item.order.deliveryTimeRange,
          deliveryStatus: item.order.deliveryStatus,
          totalAmount: Number(item.order.totalAmount),
          itemsTotal: item.order.items.length,
          itemsPicked: item.order.items.filter((orderItem) => orderItem.pickupStatus === STORE_PICKUP_STATUS.RECOLECTADO).length,
          pendingItems: [],
        };
        stop.orders.set(item.order.id, order);
      }
      order.pendingItems.push({
        id: item.id,
        productName: item.productNameSnapshot,
        brandName: item.brandNameSnapshot,
        quantity: item.quantity,
        pickupStatus: item.pickupStatus,
      });
    }

    return [...stops.values()].map((stop) => {
      const orders = [...stop.orders.values()];
      return {
        store: stop.store,
        orderCount: orders.length,
        productCount: orders.reduce((sum, order) => sum + order.pendingItems.reduce((itemSum, item) => itemSum + item.quantity, 0), 0),
        orders,
      };
    });
  }

  async history(driver: DriverAuthUser) {
    await this.assertDriverActive(driver);
    const orders = await this.prisma.storeOrder.findMany({
      where: {
        assignedDriverId: driver.id,
        deliveryStatus: {
          in: [
            STORE_DELIVERY_STATUS.ENTREGADA,
            STORE_DELIVERY_STATUS.NO_ENTREGADA,
            STORE_DELIVERY_STATUS.FALLIDA,
            STORE_DELIVERY_STATUS.CANCELADA,
          ],
        },
      },
      orderBy: [{ updatedAt: 'desc' }],
      include: deliveryInclude,
      take: 100,
    });
    return orders.map((order) => this.toSummaryDto(order));
  }

  async profile(driver: DriverAuthUser) {
    const current = await this.prisma.storeDriver.findUnique({ where: { id: driver.id } });
    if (!current) throw new NotFoundException('Mensajero no encontrado.');
    const today = this.dayRange(new Date());
    const pendingStatuses = [
      STORE_DELIVERY_STATUS.PROGRAMADA,
      STORE_DELIVERY_STATUS.ASIGNADA,
      STORE_DELIVERY_STATUS.EN_RUTA,
      STORE_DELIVERY_STATUS.REPROGRAMADA,
    ];
    const [deliveredToday, pendingDeliveries, activeDelivery, pendingSettlement] = await Promise.all([
      this.prisma.storeOrder.count({
        where: { assignedDriverId: driver.id, confirmedDeliveryDate: today, deliveryStatus: STORE_DELIVERY_STATUS.ENTREGADA },
      }),
      this.prisma.storeOrder.count({
        where: { assignedDriverId: driver.id, deliveryStatus: { in: pendingStatuses }, orderStatus: { not: STORE_ORDER_STATUS.CANCELADO } },
      }),
      this.prisma.storeOrder.findFirst({
        where: { assignedDriverId: driver.id, deliveryStatus: STORE_DELIVERY_STATUS.EN_RUTA },
        select: { id: true, orderNumber: true },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.storeOrderPayment.aggregate({
        where: {
          receivedByDriverId: driver.id,
          paymentMethod: STORE_PAYMENT_METHOD.EFECTIVO_CONTRA_ENTREGA,
          settlementStatus: STORE_SETTLEMENT_STATUS.PENDIENTE_LIQUIDAR,
        },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    return {
      id: current.id,
      fullName: current.fullName,
      phone: current.phone,
      email: current.email,
      code: current.code,
      accessStatus: current.accessStatus,
      isActive: current.isActive,
      type: current.type,
      profilePhotoUrl: current.profilePhotoUrl ?? null,
      operationalStatus: activeDelivery ? 'EN_RUTA' : current.isActive ? 'DISPONIBLE' : 'FUERA_DE_SERVICIO',
      activeDelivery,
      metrics: {
        deliveredToday,
        pendingDeliveries,
        pendingSettlementAmount: Number(pendingSettlement._sum.amount ?? 0),
        pendingSettlementCount: pendingSettlement._count,
      },
      vehicle:
        current.vehiclePlate || current.vehicleType || current.vehicleBrand || current.vehicleModel
          ? {
              plate: current.vehiclePlate,
              type: current.vehicleType,
              brand: current.vehicleBrand,
              model: current.vehicleModel,
              status: current.isActive ? 'Activo' : 'Inactivo',
            }
          : null,
      assignedZone: null,
      assignedStore: null,
    };
  }

  async get(driver: DriverAuthUser, orderId: string) {
    await this.assertDriverActive(driver);
    const order = await this.findAssignedOrder(driver, orderId);
    return this.toDetailDto(order);
  }

  async startRoute(driver: DriverAuthUser, orderId: string) {
    await this.assertDriverActive(driver);
    const order = await this.findAssignedOrder(driver, orderId);
    if (order.deliveryStatus !== STORE_DELIVERY_STATUS.RECOLECCION_COMPLETA) {
      throw new BadRequestException('Primero debes completar la recolección antes de iniciar ruta.');
    }

    // No se puede salir a entregar si quedan productos por recolectar o con incidencia.
    const readiness = pickupReadinessForDelivery(order.items);
    if (!readiness.ready) {
      throw new BadRequestException(readiness.reason ?? 'Aún hay productos pendientes de recolectar.');
    }

    await this.prisma.$transaction(async (tx) => {
      const deliveryCodeGeneratedAt = new Date();
      const deliveryCode = this.generateDeliveryCode(orderId, deliveryCodeGeneratedAt);
      await tx.storeOrder.update({
        where: { id: orderId },
        data: {
          deliveryStatus: STORE_DELIVERY_STATUS.EN_RUTA,
          orderStatus: STORE_ORDER_STATUS.EN_RUTA,
          deliveryCodeHash: await argon2.hash(deliveryCode),
          deliveryCodeGeneratedAt,
          deliveryCodeValidatedAt: null,
          deliveryCodeValidatedByDriverId: null,
          deliveryCodeFailedAttempts: 0,
          deliveryCodeStatus: DELIVERY_CODE_STATUS.PENDING_VALIDATION,
        },
      });

      await this.timelineService.registerEvent(tx, {
        orderId,
        statusType: STORE_ORDER_TIMELINE_STATUS_TYPE.ORDER_STATUS,
        previousStatus: order.orderStatus,
        newStatus: 'ORDER_OUT_FOR_DELIVERY',
        comment: 'ALL_ITEMS_PICKED_UP · ORDER_OUT_FOR_DELIVERY · Todos los productos recolectados.',
        createdByRole: STORE_TIMELINE_ROLE.DRIVER,
      });
      await this.timelineService.registerEvent(tx, {
        orderId,
        statusType: STORE_ORDER_TIMELINE_STATUS_TYPE.DELIVERY_STATUS,
        previousStatus: order.deliveryStatus,
        newStatus: STORE_DELIVERY_STATUS.EN_RUTA,
        comment: 'Entrega marcada en ruta por el mensajero. Código de entrega generado para el cliente.',
        createdByRole: STORE_TIMELINE_ROLE.DRIVER,
      });
      await this.timelineService.registerEvent(tx, {
        orderId,
        statusType: STORE_ORDER_TIMELINE_STATUS_TYPE.ORDER_STATUS,
        previousStatus: order.orderStatus,
        newStatus: STORE_ORDER_STATUS.EN_RUTA,
        comment: 'Pedido en ruta con mensajero.',
        createdByRole: STORE_TIMELINE_ROLE.DRIVER,
      });
    });

    return this.get(driver, orderId);
  }

  async confirmDelivery(driver: DriverAuthUser, orderId: string, input: ConfirmDeliveryInput) {
    await this.assertDriverActive(driver);
    const order = await this.findAssignedOrder(driver, orderId);
    this.assertStatus(order.deliveryStatus, STORE_DELIVERY_STATUS.EN_RUTA, 'Solo puedes confirmar una entrega que esta en ruta.');

    const payment = this.latestPayment(order);
    this.assertCanConfirmByPayment(order, payment, input);
    await this.assertDeliveryCodeIsValid(driver, order, input.deliveryCode);

    await this.prisma.$transaction(async (tx) => {
      if (order.paymentMethodRequested === STORE_PAYMENT_METHOD.EFECTIVO_CONTRA_ENTREGA && payment) {
        await tx.storeOrderPayment.update({
          where: { id: payment.id },
          data: {
            paymentStatus: STORE_PAYMENT_STATUS.PAGO_CONFIRMADO,
            settlementStatus: STORE_SETTLEMENT_STATUS.PENDIENTE_LIQUIDAR,
            receivedByDriverId: driver.id,
            paidAt: input.deliveredAt ?? new Date(),
            notes: input.deliveryComment,
          },
        });
        await tx.storeOrder.update({
          where: { id: orderId },
          data: { clientPaymentStatus: STORE_PAYMENT_STATUS.PAGO_CONFIRMADO },
        });
        await this.timelineService.registerEvent(tx, {
          orderId,
          statusType: STORE_ORDER_TIMELINE_STATUS_TYPE.PAYMENT_STATUS,
          previousStatus: payment.paymentStatus,
          newStatus: STORE_PAYMENT_STATUS.PAGO_CONFIRMADO,
          comment: 'Efectivo completo recibido por el mensajero.',
          createdByRole: STORE_TIMELINE_ROLE.DRIVER,
        });
      }

      await tx.storeOrder.update({
        where: { id: orderId },
        data: {
          deliveryStatus: STORE_DELIVERY_STATUS.ENTREGADA,
          orderStatus: STORE_ORDER_STATUS.ENTREGADO,
          deliveryCodeValidatedAt: input.deliveredAt ?? new Date(),
          deliveryCodeValidatedByDriverId: driver.id,
          deliveryCodeStatus: DELIVERY_CODE_STATUS.VALIDATED,
        },
      });
      await this.timelineService.registerEvent(tx, {
        orderId,
        statusType: STORE_ORDER_TIMELINE_STATUS_TYPE.DELIVERY_STATUS,
        previousStatus: order.deliveryStatus,
        newStatus: STORE_DELIVERY_STATUS.ENTREGADA,
        comment: input.deliveryComment || 'Entrega confirmada con código validado correctamente.',
        createdByRole: STORE_TIMELINE_ROLE.DRIVER,
      });
      await this.timelineService.registerEvent(tx, {
        orderId,
        statusType: STORE_ORDER_TIMELINE_STATUS_TYPE.ORDER_STATUS,
        previousStatus: order.orderStatus,
        newStatus: STORE_ORDER_STATUS.ENTREGADO,
        comment: 'Pedido entregado por el mensajero con código de cliente validado.',
        createdByRole: STORE_TIMELINE_ROLE.DRIVER,
      });
      await this.timelineService.registerEvent(tx, {
        orderId,
        statusType: STORE_ORDER_TIMELINE_STATUS_TYPE.DELIVERY_STATUS,
        previousStatus: DELIVERY_CODE_STATUS.PENDING_VALIDATION,
        newStatus: DELIVERY_CODE_STATUS.VALIDATED,
        comment: 'DELIVERY_CODE_VALIDATED · Código de entrega validado correctamente.',
        createdByRole: STORE_TIMELINE_ROLE.DRIVER,
      });
    });

    // Pedido finalizado: acreditar puntos de lealtad por la compra en línea.
    await this.loyaltyService.awardForDeliveredOrder(orderId);

    return this.get(driver, orderId);
  }

  async failedDelivery(driver: DriverAuthUser, orderId: string, input: FailedDeliveryInput) {
    await this.assertDriverActive(driver);
    const order = await this.findAssignedOrder(driver, orderId);
    this.assertStatus(order.deliveryStatus, STORE_DELIVERY_STATUS.EN_RUTA, 'Solo puedes registrar no entrega cuando la entrega esta en ruta.');
    const payment = this.latestPayment(order);

    await this.prisma.$transaction(async (tx) => {
      if (payment && payment.paymentStatus !== STORE_PAYMENT_STATUS.PAGO_CONFIRMADO) {
        await tx.storeOrderPayment.update({
          where: { id: payment.id },
          data: { paymentStatus: STORE_PAYMENT_STATUS.NO_PAGADO, notes: input.comment ?? input.reasonCode },
        });
        await tx.storeOrder.update({
          where: { id: orderId },
          data: { clientPaymentStatus: STORE_PAYMENT_STATUS.NO_PAGADO },
        });
        await this.timelineService.registerEvent(tx, {
          orderId,
          statusType: STORE_ORDER_TIMELINE_STATUS_TYPE.PAYMENT_STATUS,
          previousStatus: payment.paymentStatus,
          newStatus: STORE_PAYMENT_STATUS.NO_PAGADO,
          comment: 'Pago marcado como no pagado por no entrega.',
          createdByRole: STORE_TIMELINE_ROLE.DRIVER,
        });
      }

      await tx.storeOrder.update({
        where: { id: orderId },
        data: { deliveryStatus: STORE_DELIVERY_STATUS.NO_ENTREGADA, orderStatus: STORE_ORDER_STATUS.NO_ENTREGADO },
      });
      const comment = `Motivo: ${input.reasonCode}.${input.comment ? ` Comentario: ${input.comment}.` : ''}`;
      await this.timelineService.registerEvent(tx, {
        orderId,
        statusType: STORE_ORDER_TIMELINE_STATUS_TYPE.DELIVERY_STATUS,
        previousStatus: order.deliveryStatus,
        newStatus: STORE_DELIVERY_STATUS.NO_ENTREGADA,
        comment,
        createdByRole: STORE_TIMELINE_ROLE.DRIVER,
      });
      await this.timelineService.registerEvent(tx, {
        orderId,
        statusType: STORE_ORDER_TIMELINE_STATUS_TYPE.ORDER_STATUS,
        previousStatus: order.orderStatus,
        newStatus: STORE_ORDER_STATUS.NO_ENTREGADO,
        comment,
        createdByRole: STORE_TIMELINE_ROLE.DRIVER,
      });
    });

    return this.get(driver, orderId);
  }

  // FRD 08 · Slice B — El motorista reporta una incidencia (no entrega). NO cierra el pedido:
  // lo deja en estado de incidencia pendiente de revisión del admin.
  async reportIncident(driver: DriverAuthUser, orderId: string, input: ReportIncidentInput) {
    await this.assertDriverActive(driver);
    const order = await this.findAssignedOrder(driver, orderId);

    const incidentType = getIncidentType(input.incidentType);
    if (!incidentType) {
      throw new BadRequestException('Tipo de incidencia no válido.');
    }
    if (incidentType.requiresComment && !input.comment?.trim()) {
      throw new BadRequestException('Esta incidencia requiere un comentario.');
    }

    if (input.affectedOrderItemId || input.affectedStoreId || order.deliveryStatus !== STORE_DELIVERY_STATUS.EN_RUTA) {
      return this.reportPickupIncident(driver, order, input, incidentType);
    }

    // Gating por flujo: solo en estados operativos del motorista, nunca en terminal.
    assertActionAllowedInFlow(STORE_ACTOR.DRIVER, STORE_ORDER_ACTION.REPORT_INCIDENT, this.buildFlowContext(order));
    this.assertStatus(order.deliveryStatus, STORE_DELIVERY_STATUS.EN_RUTA, 'Solo puedes reportar una incidencia cuando la entrega está en ruta.');

    const targetOrderStatus = incidentType.targetOrderStatus;
    const previousOrderStatus = order.orderStatus;
    const previousDeliveryStatus = order.deliveryStatus;

    await this.prisma.$transaction(async (tx) => {
      await tx.storeDeliveryIncident.create({
        data: {
          orderId,
          driverId: driver.id,
          affectedStoreId: input.affectedStoreId ?? null,
          affectedOrderItemId: input.affectedOrderItemId ?? null,
          incidentType: incidentType.code,
          comment: input.comment?.trim() || null,
          evidencePhotoUrl: input.evidencePhotoUrl?.trim() || null,
          latitude: input.latitude ?? null,
          longitude: input.longitude ?? null,
          addressText: input.addressText?.trim() || null,
          status: STORE_INCIDENT_STATUS.PENDIENTE_REVISION,
        },
      });

      await tx.storeOrder.update({
        where: { id: orderId },
        data: { deliveryStatus: STORE_DELIVERY_STATUS.FALLIDA, orderStatus: targetOrderStatus },
      });

      const evidenceNote = input.evidencePhotoUrl ? ' · con evidencia' : '';
      const geoNote = input.latitude != null && input.longitude != null ? ` · GPS ${input.latitude},${input.longitude}` : '';
      await this.timelineService.registerEvent(tx, {
        orderId,
        statusType: STORE_ORDER_TIMELINE_STATUS_TYPE.DELIVERY_STATUS,
        previousStatus: previousDeliveryStatus,
        newStatus: STORE_DELIVERY_STATUS.FALLIDA,
        comment: `DELIVERY_INCIDENT_REPORTED · DELIVERY_FAILED · ${incidentType.label}${input.comment ? ` · ${input.comment.trim()}` : ''}${evidenceNote}${geoNote}`,
        createdByRole: STORE_TIMELINE_ROLE.DRIVER,
      });
      if (targetOrderStatus === STORE_ORDER_STATUS.CLIENTE_NO_LOCALIZADO) {
        await this.timelineService.registerEvent(tx, {
          orderId,
          statusType: STORE_ORDER_TIMELINE_STATUS_TYPE.ORDER_STATUS,
          previousStatus: previousOrderStatus,
          newStatus: targetOrderStatus,
          comment: 'CUSTOMER_NOT_FOUND · Cliente no localizado por el motorista.',
          createdByRole: STORE_TIMELINE_ROLE.DRIVER,
        });
      }
      await this.timelineService.registerEvent(tx, {
        orderId,
        statusType: STORE_ORDER_TIMELINE_STATUS_TYPE.ORDER_STATUS,
        previousStatus: previousOrderStatus,
        newStatus: targetOrderStatus,
        comment: `ADMIN_INCIDENT_REVIEW_PENDING · Incidencia pendiente de revisión del administrador (${incidentType.label}).`,
        createdByRole: STORE_TIMELINE_ROLE.DRIVER,
      });
    });

    await this.notificationsService
      .notifySystemInternal(
        'Incidencia de entrega reportada',
        `El motorista ${driver.fullName ?? ''} reportó "${incidentType.label}" en el pedido ${order.orderNumber}. Revisa la incidencia para decidir cómo continuar.`,
        { event: 'store.delivery_incident_reported', orderId, orderNumber: order.orderNumber, incidentType: incidentType.code },
        'WARNING',
      )
      .catch(() => undefined);
    await this.notificationsService
      .notifySystemCustomer(
        order.customerId,
        'No pudimos completar la entrega',
        'No pudimos completar la entrega de tu pedido. Nuestro equipo lo está revisando y se comunicará contigo para coordinar.',
        { event: 'store.delivery_incident_customer', orderId, orderNumber: order.orderNumber },
        'WARNING',
      )
      .catch(() => undefined);

    return this.get(driver, orderId);
  }

  private async reportPickupIncident(
    driver: DriverAuthUser,
    order: DeliveryOrder,
    input: ReportIncidentInput,
    incidentType: NonNullable<ReturnType<typeof getIncidentType>>,
  ) {
    if (![STORE_DELIVERY_STATUS.ASIGNADA, STORE_DELIVERY_STATUS.EN_RECOLECCION, STORE_DELIVERY_STATUS.RECOLECCION_COMPLETA].includes(order.deliveryStatus as never)) {
      throw new BadRequestException('Solo puedes reportar incidencias de recolección antes de iniciar ruta.');
    }

    const affectedItem = input.affectedOrderItemId
      ? order.items.find((item) => item.id === input.affectedOrderItemId)
      : null;
    if (input.affectedOrderItemId && !affectedItem) {
      throw new NotFoundException('Producto afectado no pertenece a este pedido.');
    }
    if (input.affectedStoreId && affectedItem?.originStoreId && affectedItem.originStoreId !== input.affectedStoreId) {
      throw new BadRequestException('La tienda seleccionada no corresponde al producto afectado.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.storeDeliveryIncident.create({
        data: {
          orderId: order.id,
          driverId: driver.id,
          affectedStoreId: input.affectedStoreId ?? affectedItem?.originStoreId ?? null,
          affectedOrderItemId: affectedItem?.id ?? null,
          incidentType: incidentType.code,
          comment: input.comment?.trim() || null,
          evidencePhotoUrl: input.evidencePhotoUrl?.trim() || null,
          latitude: input.latitude ?? null,
          longitude: input.longitude ?? null,
          addressText: input.addressText?.trim() || null,
          status: STORE_INCIDENT_STATUS.PENDIENTE_REVISION,
        },
      });
      if (affectedItem) {
        await tx.storeOrderItem.update({
          where: { id: affectedItem.id },
          data: { pickupStatus: STORE_PICKUP_STATUS.SUSTITUCION_REQUERIDA, pickupNote: input.comment?.trim() || incidentType.label },
        });
        await this.timelineService.registerEvent(tx, {
          orderId: order.id,
          statusType: STORE_ORDER_TIMELINE_STATUS_TYPE.PICKUP_STATUS,
          previousStatus: affectedItem.pickupStatus,
          newStatus: STORE_PICKUP_STATUS.SUSTITUCION_REQUERIDA,
          comment: `PICKUP_INCIDENT_REPORTED · ${incidentType.label} · ${affectedItem.productNameSnapshot}`,
          createdByRole: STORE_TIMELINE_ROLE.DRIVER,
        });
      }
      if (order.deliveryStatus === STORE_DELIVERY_STATUS.ASIGNADA) {
        await tx.storeOrder.update({
          where: { id: order.id },
          data: { deliveryStatus: STORE_DELIVERY_STATUS.EN_RECOLECCION, orderStatus: STORE_ORDER_STATUS.EN_RECOLECCION },
        });
      }
      await this.timelineService.registerEvent(tx, {
        orderId: order.id,
        statusType: STORE_ORDER_TIMELINE_STATUS_TYPE.DELIVERY_STATUS,
        previousStatus: order.deliveryStatus,
        newStatus: STORE_DELIVERY_STATUS.EN_RECOLECCION,
        comment: `PICKUP_INCIDENT_PENDING_ADMIN_REVIEW · ${incidentType.label}`,
        createdByRole: STORE_TIMELINE_ROLE.DRIVER,
      });
    });

    await this.notificationsService
      .notifySystemInternal(
        'Incidencia de recolección reportada',
        `El motorista ${driver.fullName ?? ''} reportó "${incidentType.label}" en el pedido ${order.orderNumber}.`,
        { event: 'store.pickup_incident_reported', orderId: order.id, orderNumber: order.orderNumber, incidentType: incidentType.code },
        'WARNING',
      )
      .catch(() => undefined);
    await this.notificationsService
      .notifySystemCustomer(
        order.customerId,
        'Estamos revisando tu pedido',
        'Tuvimos un inconveniente al recolectar uno de tus productos. Nuestro equipo ya lo está revisando.',
        { event: 'store.pickup_incident_customer', orderId: order.id, orderNumber: order.orderNumber },
        'WARNING',
      )
      .catch(() => undefined);

    return this.get(driver, order.id);
  }

  // ── Liquidaciones: efectivo cobrado por el motorista, agrupado por día ──
  async settlements(driver: DriverAuthUser) {
    await this.assertDriverActive(driver);
    const payments = await this.prisma.storeOrderPayment.findMany({
      where: {
        receivedByDriverId: driver.id,
        paymentMethod: STORE_PAYMENT_METHOD.EFECTIVO_CONTRA_ENTREGA,
        paidAt: { not: null },
      },
      orderBy: { paidAt: 'desc' },
      include: { order: { select: { orderNumber: true } } },
    });

    const dayMap = new Map<string, { date: string; total: number; count: number; pendingTotal: number; items: Array<{ orderNumber: string; amount: number; status: string; paidAt: Date | null }> }>();
    let pendingTotal = 0;
    let settledTotal = 0;

    for (const payment of payments) {
      const amount = Number(payment.amount);
      const isPending = payment.settlementStatus === STORE_SETTLEMENT_STATUS.PENDIENTE_LIQUIDAR;
      if (isPending) pendingTotal += amount;
      if (payment.settlementStatus === STORE_SETTLEMENT_STATUS.LIQUIDADO) settledTotal += amount;
      const dayKey = (payment.paidAt ?? payment.createdAt).toISOString().slice(0, 10);
      let day = dayMap.get(dayKey);
      if (!day) {
        day = { date: dayKey, total: 0, count: 0, pendingTotal: 0, items: [] };
        dayMap.set(dayKey, day);
      }
      day.total += amount;
      day.count += 1;
      if (isPending) day.pendingTotal += amount;
      day.items.push({ orderNumber: payment.order?.orderNumber ?? '—', amount, status: payment.settlementStatus, paidAt: payment.paidAt });
    }

    return {
      pendingTotal,
      settledTotal,
      pendingCount: payments.filter((p) => p.settlementStatus === STORE_SETTLEMENT_STATUS.PENDIENTE_LIQUIDAR).length,
      days: [...dayMap.values()],
    };
  }

  // ── Notificaciones del motorista ──
  async listNotifications(driver: DriverAuthUser) {
    await this.assertDriverActive(driver);
    return this.notificationsService.listForDriver(driver.id);
  }

  async unreadNotificationsCount(driver: DriverAuthUser) {
    await this.assertDriverActive(driver);
    return { count: await this.notificationsService.countUnreadForDriver(driver.id) };
  }

  async markNotificationRead(driver: DriverAuthUser, notificationId: string) {
    await this.assertDriverActive(driver);
    return this.notificationsService.markDriverRead(notificationId, driver.id);
  }

  async markAllNotificationsRead(driver: DriverAuthUser) {
    await this.assertDriverActive(driver);
    return this.notificationsService.markAllDriverRead(driver.id);
  }

  private buildFlowContext(order: DeliveryOrder) {
    const activeItems = order.items.filter((item) => item.pickupStatus !== STORE_PICKUP_STATUS.CANCELADO);
    return {
      orderStatus: order.orderStatus,
      paymentStatus: order.clientPaymentStatus,
      deliveryStatus: order.deliveryStatus,
      paymentMethod: order.paymentMethodRequested,
      hasDriver: Boolean(order.assignedDriverId),
      itemsTotal: order.items.length,
      itemsActive: activeItems.length,
      itemsWithStore: activeItems.filter((item) => item.pickupStatus !== STORE_PICKUP_STATUS.PENDIENTE_ASIGNAR_TIENDA).length,
      itemsPicked: activeItems.filter((item) => item.pickupStatus === STORE_PICKUP_STATUS.RECOLECTADO).length,
    };
  }

  async getPickup(driver: DriverAuthUser, orderId: string) {
    await this.assertDriverActive(driver);
    const order = await this.findAssignedOrder(driver, orderId);
    const items = await this.prisma.storeOrderItem.findMany({
      where: { orderId: order.id },
      orderBy: { createdAt: 'asc' },
      include: { originStore: { select: { id: true, code: true, name: true, address: true } } },
    });
    const readiness = pickupReadinessForDelivery(items);
    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      items: items.map((item) => ({
        id: item.id,
        productName: item.productNameSnapshot,
        brandName: item.brandNameSnapshot,
        imageUrl: item.productImageSnapshot,
        quantity: item.quantity,
        pickupStatus: item.pickupStatus,
        pickedUpAt: item.pickedUpAt,
        originStore: item.originStore ?? null,
      })),
      summary: pickupSummary(items),
      readyForDelivery: readiness.ready,
      readyReason: readiness.reason ?? null,
    };
  }

  async completePickup(driver: DriverAuthUser, orderId: string) {
    await this.assertDriverActive(driver);
    const order = await this.findAssignedOrder(driver, orderId);
    if (![STORE_DELIVERY_STATUS.ASIGNADA, STORE_DELIVERY_STATUS.EN_RECOLECCION].includes(order.deliveryStatus as never)) {
      throw new BadRequestException('La recolección solo puede completarse antes de iniciar ruta.');
    }

    const readiness = pickupReadinessForDelivery(order.items);
    if (!readiness.ready) {
      throw new BadRequestException(readiness.reason ?? 'Aún hay productos pendientes o incidencias por resolver.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.storeOrder.update({
        where: { id: orderId },
        data: { deliveryStatus: STORE_DELIVERY_STATUS.RECOLECCION_COMPLETA, orderStatus: STORE_ORDER_STATUS.RECOLECCION_COMPLETA },
      });
      await this.timelineService.registerEvent(tx, {
        orderId,
        statusType: STORE_ORDER_TIMELINE_STATUS_TYPE.DELIVERY_STATUS,
        previousStatus: order.deliveryStatus,
        newStatus: STORE_DELIVERY_STATUS.RECOLECCION_COMPLETA,
        comment: 'Recolección completa confirmada por el mensajero.',
        createdByRole: STORE_TIMELINE_ROLE.DRIVER,
      });
      await this.timelineService.registerEvent(tx, {
        orderId,
        statusType: STORE_ORDER_TIMELINE_STATUS_TYPE.ORDER_STATUS,
        previousStatus: order.orderStatus,
        newStatus: STORE_ORDER_STATUS.RECOLECCION_COMPLETA,
        comment: 'Todos los productos fueron recibidos por el mensajero.',
        createdByRole: STORE_TIMELINE_ROLE.DRIVER,
      });
    });

    return this.get(driver, orderId);
  }

  async markPickedUp(driver: DriverAuthUser, orderId: string, itemId: string, input: MarkPickedUpInput) {
    await this.assertDriverActive(driver);
    const order = await this.findAssignedOrder(driver, orderId);

    const item = await this.prisma.storeOrderItem.findFirst({ where: { id: itemId, orderId: order.id } });
    if (!item) {
      throw new NotFoundException('Producto del pedido no encontrado.');
    }
    if (!item.originStoreId) {
      throw new BadRequestException('Este producto aún no tiene tienda origen asignada por el administrador.');
    }
    if (item.pickupStatus === STORE_PICKUP_STATUS.RECOLECTADO) {
      throw new BadRequestException('Este producto ya fue marcado como recolectado.');
    }
    if (
      item.pickupStatus !== STORE_PICKUP_STATUS.PENDIENTE_RECOLECCION &&
      item.pickupStatus !== STORE_PICKUP_STATUS.TIENDA_ASIGNADA
    ) {
      throw new BadRequestException('Este producto tiene una incidencia y requiere resolución del administrador.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.storeOrderItem.update({
        where: { id: itemId },
        data: {
          pickupStatus: STORE_PICKUP_STATUS.RECOLECTADO,
          pickedUpAt: new Date(),
          pickedUpByDriverId: driver.id,
          pickupNote: input.note ?? item.pickupNote ?? null,
          pickupEvidenceUrl: input.evidenceUrl ?? item.pickupEvidenceUrl ?? null,
        },
      });
      await this.timelineService.registerEvent(tx, {
        orderId,
        statusType: STORE_ORDER_TIMELINE_STATUS_TYPE.PICKUP_STATUS,
        previousStatus: item.pickupStatus,
        newStatus: STORE_PICKUP_STATUS.RECOLECTADO,
        comment: `ITEM_PICKED_UP · ${item.productNameSnapshot} (item ${itemId})${input.note ? ` · ${input.note}` : ''}`,
        createdByRole: STORE_TIMELINE_ROLE.DRIVER,
      });
      if (([STORE_DELIVERY_STATUS.ASIGNADA, STORE_DELIVERY_STATUS.EN_RECOLECCION] as string[]).includes(order.deliveryStatus) && order.deliveryStatus !== STORE_DELIVERY_STATUS.EN_RECOLECCION) {
        await tx.storeOrder.update({
          where: { id: orderId },
          data: { deliveryStatus: STORE_DELIVERY_STATUS.EN_RECOLECCION, orderStatus: STORE_ORDER_STATUS.EN_RECOLECCION },
        });
        await this.timelineService.registerEvent(tx, {
          orderId,
          statusType: STORE_ORDER_TIMELINE_STATUS_TYPE.DELIVERY_STATUS,
          previousStatus: order.deliveryStatus,
          newStatus: STORE_DELIVERY_STATUS.EN_RECOLECCION,
          comment: 'Recolección iniciada por el mensajero.',
          createdByRole: STORE_TIMELINE_ROLE.DRIVER,
        });
        await this.timelineService.registerEvent(tx, {
          orderId,
          statusType: STORE_ORDER_TIMELINE_STATUS_TYPE.ORDER_STATUS,
          previousStatus: order.orderStatus,
          newStatus: STORE_ORDER_STATUS.EN_RECOLECCION,
          comment: 'El mensajero inició la recolección de productos.',
          createdByRole: STORE_TIMELINE_ROLE.DRIVER,
        });
      }
    });

    return this.getPickup(driver, orderId);
  }

  private async findAssignedOrder(driver: DriverAuthUser, orderId: string) {
    const order = await this.prisma.storeOrder.findFirst({
      where: { id: orderId, assignedDriverId: driver.id },
      include: deliveryInclude,
    });
    if (!order) throw new NotFoundException('Entrega no encontrada.');
    if (order.orderStatus === STORE_ORDER_STATUS.CANCELADO || order.deliveryStatus === STORE_DELIVERY_STATUS.CANCELADA) {
      throw new BadRequestException('No puedes operar una entrega cancelada.');
    }
    return order;
  }

  private async assertDriverActive(driver: DriverAuthUser) {
    if (!driver.isActive || driver.accessStatus === 'BLOQUEADO' || driver.accessStatus === 'INACTIVO') {
      throw new ForbiddenException('Mensajero inactivo o sin acceso.');
    }
  }

  private assertStatus(current: string, expected: string, message: string) {
    if (current !== expected) throw new BadRequestException(message);
  }

  private assertCanConfirmByPayment(order: DeliveryOrder, payment: DeliveryOrder['payments'][number] | null, input: ConfirmDeliveryInput) {
    if (!payment) throw new BadRequestException('El pedido no tiene registro de pago.');

    if (order.paymentMethodRequested === STORE_PAYMENT_METHOD.EFECTIVO_CONTRA_ENTREGA) {
      if (!input.receivedCash || input.amountReceived === undefined) {
        throw new BadRequestException('Confirma que recibiste el efectivo completo.');
      }
      if (Number(input.amountReceived) !== Number(order.totalAmount)) {
        throw new BadRequestException('El efectivo recibido debe coincidir exactamente con el total del pedido.');
      }
      return;
    }

    if (payment.paymentStatus !== STORE_PAYMENT_STATUS.PAGO_CONFIRMADO) {
      throw new BadRequestException('Este pedido tiene pago pendiente. Debe confirmarse el pago desde Admin antes de entregar.');
    }
  }

  private generateDeliveryCode(orderId: string, generatedAt: Date) {
    const secret = process.env.DELIVERY_CODE_SECRET ?? process.env.JWT_ACCESS_SECRET ?? 'local-delivery-code-secret';
    const digest = createHmac('sha256', secret).update(`${orderId}:${generatedAt.toISOString()}`).digest('hex');
    const numeric = Number.parseInt(digest.slice(0, 12), 16) % 1_000_000;
    return String(numeric).padStart(6, '0');
  }

  private async assertDeliveryCodeIsValid(driver: DriverAuthUser, order: DeliveryOrder, deliveryCode: string) {
    if (!order.deliveryCodeHash) {
      throw new BadRequestException('Este pedido todavía no tiene código de entrega generado.');
    }
    const isValid = await argon2.verify(order.deliveryCodeHash, deliveryCode.trim());
    if (!isValid) {
      await this.prisma.$transaction(async (tx) => {
        await tx.storeOrder.update({
          where: { id: order.id },
          data: { deliveryCodeFailedAttempts: { increment: 1 } },
        });
        await this.timelineService.registerEvent(tx, {
          orderId: order.id,
          statusType: STORE_ORDER_TIMELINE_STATUS_TYPE.DELIVERY_STATUS,
          previousStatus: order.deliveryCodeStatus ?? DELIVERY_CODE_STATUS.PENDING_VALIDATION,
          newStatus: 'DELIVERY_CODE_FAILED',
          comment: 'DELIVERY_CODE_FAILED · Intento fallido de validación por motorista.',
          createdByRole: STORE_TIMELINE_ROLE.DRIVER,
        });
      });
      throw new UnauthorizedException('El código ingresado no es válido.');
    }
  }

  private latestPayment(order: DeliveryOrder) {
    return order.payments[0] ?? null;
  }

  private toSummaryDto(order: DeliveryOrder) {
    const payment = this.latestPayment(order);
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      customer: order.customer,
      deliveryAddress: order.deliveryAddress,
      deliveryReference: order.deliveryReference,
      deliveryPhone: order.deliveryPhone,
      confirmedDeliveryDate: order.confirmedDeliveryDate,
      deliveryTimeRange: order.deliveryTimeRange,
      deliveryStatus: order.deliveryStatus,
      orderStatus: order.orderStatus,
      paymentMethodRequested: order.paymentMethodRequested,
      clientPaymentStatus: order.clientPaymentStatus,
      totalAmount: Number(order.totalAmount),
      subtotalAmount: Number(order.subtotalAmount),
      itemsTotal: order.items.length,
      itemsPicked: order.items.filter((item) => item.pickupStatus === STORE_PICKUP_STATUS.RECOLECTADO).length,
      payment: payment ? { paymentMethod: payment.paymentMethod, paymentStatus: payment.paymentStatus } : null,
    };
  }

  private toDetailDto(order: DeliveryOrder) {
    const payment = this.latestPayment(order);
    const activeItems = order.items.filter((item) => item.pickupStatus !== STORE_PICKUP_STATUS.CANCELADO);
    const flowContext = {
      orderStatus: order.orderStatus,
      paymentStatus: order.clientPaymentStatus,
      deliveryStatus: order.deliveryStatus,
      paymentMethod: order.paymentMethodRequested,
      hasDriver: Boolean(order.assignedDriverId),
      itemsTotal: order.items.length,
      itemsActive: activeItems.length,
      itemsWithStore: activeItems.filter((item) => item.pickupStatus !== STORE_PICKUP_STATUS.PENDIENTE_ASIGNAR_TIENDA).length,
      itemsPicked: activeItems.filter((item) => item.pickupStatus === STORE_PICKUP_STATUS.RECOLECTADO).length,
    };
    const flow = buildOrderFlow(flowContext);
    const snapshot = (order.deliveryAddressSnapshot ?? null) as {
      latitude?: number | null;
      longitude?: number | null;
      department?: string | null;
      municipality?: string | null;
      zone?: string | null;
    } | null;

    return {
      ...this.toSummaryDto(order),
      receiverName: order.receiverName,
      // FRD 08 — flujo lineal compartido + siguiente acción del motorista (no inventado en UI).
      flow: flow.stages,
      flowCurrentStage: flow.currentStageKey,
      flowTerminal: flow.terminal,
      flowIncident: flow.incident,
      nextAction: nextRequiredActionFor(flowContext, STORE_ACTOR.DRIVER),
      deliveryLatitude: snapshot?.latitude ?? null,
      deliveryLongitude: snapshot?.longitude ?? null,
      deliveryZone: snapshot?.zone ?? null,
      deliveryCity: snapshot?.municipality ?? snapshot?.department ?? null,
      cashAvailableAmount: payment?.cashAvailableAmount != null ? Number(payment.cashAvailableAmount) : null,
      deliveryCodeStatus: order.deliveryCodeStatus ?? null,
      deliveryCodeGeneratedAt: order.deliveryCodeGeneratedAt ?? null,
      deliveryCodeValidatedAt: order.deliveryCodeValidatedAt ?? null,
      deliveryCodeFailedAttempts: order.deliveryCodeFailedAttempts,
      items: order.items.map((item) => ({
        id: item.id,
        brandName: item.brandNameSnapshot,
        productName: item.productNameSnapshot,
        imageUrl: item.productImageSnapshot,
        unitPrice: Number(item.unitPrice),
        quantity: item.quantity,
        subtotal: Number(item.subtotal),
      })),
      timeline: order.timeline.map((event) => ({
        statusType: event.statusType,
        previousStatus: event.previousStatus,
        newStatus: event.newStatus,
        comment: event.comment,
        createdByRole: event.createdByRole,
        createdAt: event.createdAt,
      })),
    };
  }

  private dayRange(date: Date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { gte: start, lt: end };
  }
}
