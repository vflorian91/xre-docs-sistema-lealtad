import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { InternalAuthUser } from '../../auth/auth.types';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { StoreStockMovementsService, STORE_STOCK_MOVEMENT_TYPES } from '../stock/store-stock-movements.service';
import { StoreOrderTimelineService } from './store-order-timeline.service';
import { groupItemsByBrand } from './store-brand-grouping';
import {
  CancelAfterIncidentInput,
  CancelStoreOrderInput,
  ChangeAddressDeliveryIncidentInput,
  ConfirmStoreOrderInput,
  RescheduleDeliveryIncidentInput,
  RescheduleStoreOrderInput,
  ReviewDeliveryIncidentInput,
  ReviewStoreOrderInput,
} from './store-order-admin.schemas';
import { buildOrderFlow, nextRequiredActionFor } from './store-order-flow';
import { STORE_ACTOR } from './store-order-permissions';
import {
  STORE_DELIVERY_STATUS,
  STORE_INCIDENT_STATUS,
  STORE_ORDER_STATUS,
  STORE_ORDER_TERMINAL_STATUSES,
  STORE_ORDER_TIMELINE_STATUS_TYPE,
  STORE_PAYMENT_STATUS,
  STORE_PICKUP_STATUS,
  STORE_TIMELINE_ROLE,
  getIncidentType,
} from './store-order.constants';

type ListAdminOrdersQuery = Record<string, string | undefined>;

const STOCK_REFERENCE_TYPE = 'StoreOrder';

const customerSelect = { id: true, fullName: true, phone: true, email: true, code: true };

@Injectable()
export class StoreOrdersAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stockMovementsService: StoreStockMovementsService,
    private readonly timelineService: StoreOrderTimelineService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async listAdmin(query: ListAdminOrdersQuery = {}) {
    const page = this.parsePositiveInt(query.page, 1);
    const limit = Math.min(this.parsePositiveInt(query.limit, 10), 50);
    const skip = (page - 1) * limit;
    const search = query.search?.trim();
    const orderStatus = query.orderStatus?.trim();
    const clientPaymentStatus = query.clientPaymentStatus?.trim();
    const paymentMethodRequested = query.paymentMethodRequested?.trim();
    const dateFrom = this.parseOptionalDate(query.dateFrom);
    const dateTo = this.parseOptionalDate(query.dateTo);

    const where: Prisma.StoreOrderWhereInput = {
      ...(orderStatus ? { orderStatus } : {}),
      ...(clientPaymentStatus ? { clientPaymentStatus } : {}),
      ...(paymentMethodRequested ? { paymentMethodRequested } : {}),
      ...(dateFrom || dateTo
        ? { createdAt: { ...(dateFrom ? { gte: dateFrom } : {}), ...(dateTo ? { lte: dateTo } : {}) } }
        : {}),
      ...(search
        ? {
            OR: [
              { orderNumber: { contains: search, mode: 'insensitive' } },
              { customer: { fullName: { contains: search, mode: 'insensitive' } } },
              { customer: { phone: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [orders, total, cards] = await Promise.all([
      this.prisma.storeOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          customer: { select: customerSelect },
          payments: true,
          assignedDriver: { select: { id: true, fullName: true, phone: true, code: true } },
        },
      }),
      this.prisma.storeOrder.count({ where }),
      this.buildSummaryCards(),
    ]);

    return {
      data: orders.map((order) => this.toListDto(order)),
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)), cards },
    };
  }

  async getAdmin(orderId: string) {
    const order = await this.prisma.storeOrder.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: customerSelect },
        items: {
          include: {
            originStore: { select: { id: true, code: true, name: true } },
            product: { select: { sku: true } },
            variant: { select: { sku: true, optionLabel: true } },
          },
        },
        payments: { orderBy: { createdAt: 'desc' } },
        timeline: { orderBy: { createdAt: 'asc' } },
        assignedDriver: { select: { id: true, fullName: true, phone: true, code: true } },
        deliveryIncidents: { orderBy: { reportedAt: 'desc' }, include: { driver: { select: { id: true, fullName: true } } } },
      },
    });

    if (!order) {
      throw new NotFoundException('Pedido no encontrado.');
    }

    const internalUserNames = await this.collectInternalUserNames(order);
    return this.toDetailDto(order, internalUserNames);
  }

  async listIncidents(orderId: string) {
    await this.assertExists(orderId);
    const incidents = await this.prisma.storeDeliveryIncident.findMany({
      where: { orderId },
      orderBy: { reportedAt: 'desc' },
      include: { driver: { select: { id: true, fullName: true } } },
    });
    return incidents.map((incident) => this.toIncidentDto(incident));
  }

  async reviewIncident(orderId: string, incidentId: string, input: ReviewDeliveryIncidentInput, actor: InternalAuthUser) {
    const { order, incident } = await this.assertIncidentActionable(orderId, incidentId, {
      allowedIncidentStatuses: [STORE_INCIDENT_STATUS.PENDIENTE_REVISION, STORE_INCIDENT_STATUS.REVISADA],
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.storeDeliveryIncident.update({
        where: { id: incidentId },
        data: {
          status: STORE_INCIDENT_STATUS.REVISADA,
          reviewedByInternalUserId: actor.id,
          reviewedAt: new Date(),
          adminResolution: this.joinResolution('DELIVERY_INCIDENT_REVIEWED', input.adminResolution, input.adminComment),
        },
      });

      await this.timelineService.registerEvent(tx, {
        orderId,
        statusType: STORE_ORDER_TIMELINE_STATUS_TYPE.DELIVERY_STATUS,
        previousStatus: order.deliveryStatus,
        newStatus: order.deliveryStatus,
        comment: `DELIVERY_INCIDENT_REVIEWED · incidentId=${incident.id} · adminId=${actor.id} · ${input.adminResolution}${input.adminComment ? ` · ${input.adminComment}` : ''}`,
        createdByInternalUserId: actor.id,
        createdByRole: STORE_TIMELINE_ROLE.INTERNAL_USER,
      });
    });

    return this.getAdmin(orderId);
  }

  async rescheduleIncident(orderId: string, incidentId: string, input: RescheduleDeliveryIncidentInput, actor: InternalAuthUser) {
    const { order, incident } = await this.assertIncidentActionable(orderId, incidentId, {
      allowedIncidentStatuses: [STORE_INCIDENT_STATUS.PENDIENTE_REVISION, STORE_INCIDENT_STATUS.REVISADA],
    });
    this.assertValidScheduleDate(input.scheduledDeliveryDate, order.createdAt);
    const nextState = this.nextStateAfterIncidentReschedule(order);
    const previousDate = order.confirmedDeliveryDate;
    const previousRange = order.deliveryTimeRange;
    const totals = input.deliveryFee !== undefined
      ? { shippingAmount: input.deliveryFee, totalAmount: Number(order.subtotalAmount) + input.deliveryFee }
      : {};

    await this.prisma.$transaction(async (tx) => {
      await tx.storeDeliveryIncident.update({
        where: { id: incidentId },
        data: {
          status: STORE_INCIDENT_STATUS.REPROGRAMADA,
          reviewedByInternalUserId: actor.id,
          reviewedAt: new Date(),
          adminResolution: this.joinResolution('DELIVERY_RESCHEDULED_AFTER_INCIDENT', input.customerVisibleComment ?? 'Entrega reprogramada.', input.adminComment),
        },
      });

      await tx.storeOrder.update({
        where: { id: orderId },
        data: {
          orderStatus: nextState.orderStatus,
          deliveryStatus: nextState.deliveryStatus,
          confirmedDeliveryDate: input.scheduledDeliveryDate,
          deliveryTimeRange: input.deliveryTimeRange,
          ...totals,
        },
      });

      const comment = `DELIVERY_RESCHEDULED_AFTER_INCIDENT · incidentId=${incident.id} · adminId=${actor.id} · fecha anterior=${this.formatNullableDate(previousDate)} ${previousRange ?? ''} · nueva fecha=${this.formatDate(input.scheduledDeliveryDate)} ${input.deliveryTimeRange}${input.adminComment ? ` · ${input.adminComment}` : ''}`;
      await this.timelineService.registerEvent(tx, {
        orderId,
        statusType: STORE_ORDER_TIMELINE_STATUS_TYPE.ORDER_STATUS,
        previousStatus: order.orderStatus,
        newStatus: nextState.orderStatus,
        comment,
        createdByInternalUserId: actor.id,
        createdByRole: STORE_TIMELINE_ROLE.INTERNAL_USER,
      });
      await this.timelineService.registerEvent(tx, {
        orderId,
        statusType: STORE_ORDER_TIMELINE_STATUS_TYPE.DELIVERY_STATUS,
        previousStatus: order.deliveryStatus,
        newStatus: nextState.deliveryStatus,
        comment,
        createdByInternalUserId: actor.id,
        createdByRole: STORE_TIMELINE_ROLE.INTERNAL_USER,
      });
    });

    await this.notifyIncidentRescheduled(order.customerId, orderId, order.orderNumber, input.scheduledDeliveryDate, input.deliveryTimeRange);
    return this.getAdmin(orderId);
  }

  async changeIncidentAddress(orderId: string, incidentId: string, input: ChangeAddressDeliveryIncidentInput, actor: InternalAuthUser) {
    const { order, incident } = await this.assertIncidentActionable(orderId, incidentId, {
      allowedIncidentStatuses: [STORE_INCIDENT_STATUS.PENDIENTE_REVISION, STORE_INCIDENT_STATUS.REVISADA],
    });
    this.assertValidScheduleDate(input.scheduledDeliveryDate, order.createdAt);
    const resolvedAddress = await this.resolveIncidentAddress(order, input);
    const nextState = this.nextStateAfterIncidentReschedule(order);
    const previousAddress = order.deliveryAddress;

    await this.prisma.$transaction(async (tx) => {
      await tx.storeDeliveryIncident.update({
        where: { id: incidentId },
        data: {
          status: STORE_INCIDENT_STATUS.REPROGRAMADA,
          reviewedByInternalUserId: actor.id,
          reviewedAt: new Date(),
          adminResolution: this.joinResolution('DELIVERY_ADDRESS_CHANGED_AFTER_INCIDENT', input.reason, input.adminComment),
        },
      });

      await tx.storeOrder.update({
        where: { id: orderId },
        data: {
          orderStatus: nextState.orderStatus,
          deliveryStatus: nextState.deliveryStatus,
          customerAddressId: resolvedAddress.customerAddressId,
          deliveryAddress: resolvedAddress.deliveryAddress,
          deliveryAddressSnapshot: resolvedAddress.deliveryAddressSnapshot,
          deliveryReference: resolvedAddress.deliveryReference,
          deliveryPhone: resolvedAddress.deliveryPhone,
          receiverName: resolvedAddress.receiverName,
          confirmedDeliveryDate: input.scheduledDeliveryDate,
          deliveryTimeRange: input.deliveryTimeRange,
        },
      });

      const addressComment = `DELIVERY_ADDRESS_CHANGED_AFTER_INCIDENT · incidentId=${incident.id} · adminId=${actor.id} · direccion anterior=${previousAddress} · nueva direccion=${resolvedAddress.deliveryAddress} · motivo=${input.reason}${input.adminComment ? ` · ${input.adminComment}` : ''}`;
      await this.timelineService.registerEvent(tx, {
        orderId,
        statusType: STORE_ORDER_TIMELINE_STATUS_TYPE.DELIVERY_STATUS,
        previousStatus: order.deliveryStatus,
        newStatus: nextState.deliveryStatus,
        comment: addressComment,
        createdByInternalUserId: actor.id,
        createdByRole: STORE_TIMELINE_ROLE.INTERNAL_USER,
      });
      await this.timelineService.registerEvent(tx, {
        orderId,
        statusType: STORE_ORDER_TIMELINE_STATUS_TYPE.ORDER_STATUS,
        previousStatus: order.orderStatus,
        newStatus: nextState.orderStatus,
        comment: `DELIVERY_RESCHEDULED_AFTER_INCIDENT · incidentId=${incident.id} · adminId=${actor.id} · nueva fecha=${this.formatDate(input.scheduledDeliveryDate)} ${input.deliveryTimeRange}`,
        createdByInternalUserId: actor.id,
        createdByRole: STORE_TIMELINE_ROLE.INTERNAL_USER,
      });
    });

    await this.notifyIncidentAddressChanged(order.customerId, orderId, order.orderNumber, input.scheduledDeliveryDate, input.deliveryTimeRange);
    return this.getAdmin(orderId);
  }

  async cancelAfterIncident(orderId: string, incidentId: string, input: CancelAfterIncidentInput, actor: InternalAuthUser) {
    const { order, incident } = await this.assertIncidentActionable(orderId, incidentId, {
      allowedIncidentStatuses: [STORE_INCIDENT_STATUS.PENDIENTE_REVISION, STORE_INCIDENT_STATUS.REVISADA, STORE_INCIDENT_STATUS.REPROGRAMADA],
      allowReprogramada: true,
    });

    if (order.orderStatus === STORE_ORDER_STATUS.ENTREGADO || order.deliveryStatus === STORE_DELIVERY_STATUS.ENTREGADA) {
      throw new BadRequestException('No se puede cancelar un pedido entregado.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.storeDeliveryIncident.update({
        where: { id: incidentId },
        data: {
          status: STORE_INCIDENT_STATUS.CERRADA,
          reviewedByInternalUserId: actor.id,
          reviewedAt: new Date(),
          adminResolution: this.joinResolution('ORDER_CANCELLED_AFTER_INCIDENT', input.cancellationReason, input.adminComment),
        },
      });

      await tx.storeOrder.update({
        where: { id: orderId },
        data: {
          orderStatus: STORE_ORDER_STATUS.CERRADO_POR_INCIDENCIA,
          deliveryStatus: STORE_DELIVERY_STATUS.FALLIDA,
          cancelledAt: new Date(),
          cancelReason: input.cancellationReason,
        },
      });

      await this.restoreStockOnCancelIfNeeded(tx, orderId, order, actor);
      await this.cancelPendingPaymentIfNeeded(tx, orderId, order);

      const comment = `ORDER_CANCELLED_AFTER_INCIDENT · incidentId=${incident.id} · adminId=${actor.id} · motivo=${input.cancellationReason}${input.refundRequired ? ' · requiere reembolso' : ''}${input.returnRequired ? ' · requiere devolucion' : ''}${input.adminComment ? ` · ${input.adminComment}` : ''}`;
      await this.timelineService.registerEvent(tx, {
        orderId,
        statusType: STORE_ORDER_TIMELINE_STATUS_TYPE.ORDER_STATUS,
        previousStatus: order.orderStatus,
        newStatus: STORE_ORDER_STATUS.CERRADO_POR_INCIDENCIA,
        comment,
        createdByInternalUserId: actor.id,
        createdByRole: STORE_TIMELINE_ROLE.INTERNAL_USER,
      });
      await this.timelineService.registerEvent(tx, {
        orderId,
        statusType: STORE_ORDER_TIMELINE_STATUS_TYPE.DELIVERY_STATUS,
        previousStatus: order.deliveryStatus,
        newStatus: STORE_DELIVERY_STATUS.FALLIDA,
        comment,
        createdByInternalUserId: actor.id,
        createdByRole: STORE_TIMELINE_ROLE.INTERNAL_USER,
      });
      if (input.returnRequired) {
        await this.timelineService.registerEvent(tx, {
          orderId,
          statusType: STORE_ORDER_TIMELINE_STATUS_TYPE.ORDER_STATUS,
          previousStatus: STORE_ORDER_STATUS.CERRADO_POR_INCIDENCIA,
          newStatus: STORE_ORDER_STATUS.CERRADO_POR_INCIDENCIA,
          comment: `RETURN_REQUIRED_AFTER_INCIDENT · incidentId=${incident.id} · adminId=${actor.id} · Preparado para Slice D.`,
          createdByInternalUserId: actor.id,
          createdByRole: STORE_TIMELINE_ROLE.INTERNAL_USER,
        });
      }
    });

    await this.notifyIncidentCancelled(order.customerId, orderId, order.orderNumber);
    return this.getAdmin(orderId);
  }

  async review(orderId: string, input: ReviewStoreOrderInput, actor: InternalAuthUser) {
    const order = await this.assertExists(orderId);

    if (order.orderStatus !== STORE_ORDER_STATUS.PEDIDO_SOLICITADO) {
      throw new BadRequestException('Solo se puede marcar en revision un pedido recien solicitado.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.storeOrder.update({
        where: { id: orderId },
        data: { orderStatus: STORE_ORDER_STATUS.EN_REVISION },
      });

      await this.timelineService.registerEvent(tx, {
        orderId,
        statusType: STORE_ORDER_TIMELINE_STATUS_TYPE.ORDER_STATUS,
        previousStatus: order.orderStatus,
        newStatus: STORE_ORDER_STATUS.EN_REVISION,
        comment: input.comment ?? 'Pedido marcado en revision por el administrador.',
        createdByInternalUserId: actor.id,
        createdByRole: STORE_TIMELINE_ROLE.INTERNAL_USER,
      });

      return result;
    });

    return this.getAdmin(updated.id);
  }

  async confirm(orderId: string, input: ConfirmStoreOrderInput, actor: InternalAuthUser) {
    const order = await this.prisma.storeOrder.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Pedido no encontrado.');
    }

    const allowedSourceStatuses: string[] = [
      STORE_ORDER_STATUS.PEDIDO_SOLICITADO,
      STORE_ORDER_STATUS.EN_REVISION,
      STORE_ORDER_STATUS.REPROGRAMADO,
    ];

    if (!allowedSourceStatuses.includes(order.orderStatus)) {
      throw new BadRequestException('El pedido no se encuentra en un estado valido para confirmarse.');
    }

    if (this.dateOnly(input.confirmedDeliveryDate).getTime() <= this.dateOnly(order.createdAt).getTime()) {
      throw new BadRequestException('La fecha confirmada no puede ser el mismo dia de la solicitud.');
    }

    await this.prisma.$transaction(async (tx) => {
      const claimedOrder = await tx.storeOrder.updateMany({
        where: { id: orderId, orderStatus: { in: allowedSourceStatuses } },
        data: {
          orderStatus: STORE_ORDER_STATUS.CONFIRMADO_ADMIN,
          deliveryStatus: STORE_DELIVERY_STATUS.PROGRAMADA,
          confirmedDeliveryDate: input.confirmedDeliveryDate,
          deliveryTimeRange: input.deliveryTimeRange,
        },
      });

      if (claimedOrder.count !== 1) {
        throw new BadRequestException('El pedido no se encuentra en un estado valido para confirmarse.');
      }

      const alreadyConfirmed = await this.stockMovementsService.hasMovementForReference(tx, {
        referenceType: STOCK_REFERENCE_TYPE,
        referenceId: orderId,
        movementType: STORE_STOCK_MOVEMENT_TYPES.ORDER_CONFIRMED,
      });

      if (!alreadyConfirmed) {
        for (const item of order.items) {
          const product = await tx.storeProduct.findUnique({ where: { id: item.productId } });

          if (!product || !product.isActive) {
            throw new BadRequestException(`El producto "${item.productNameSnapshot}" ya no esta disponible.`);
          }

          const brand = await tx.storeBrand.findUnique({ where: { id: item.brandId } });
          if (!brand || !brand.isActive) {
            throw new BadRequestException(`La marca "${item.brandNameSnapshot}" ya no esta activa.`);
          }

          await this.decrementItemStock(tx, orderId, item, order.orderNumber, actor);
        }
      }

      await this.timelineService.registerEvent(tx, {
        orderId,
        statusType: STORE_ORDER_TIMELINE_STATUS_TYPE.ORDER_STATUS,
        previousStatus: order.orderStatus,
        newStatus: STORE_ORDER_STATUS.CONFIRMADO_ADMIN,
        comment: input.internalComment ?? 'Pedido confirmado por el administrador.',
        createdByInternalUserId: actor.id,
        createdByRole: STORE_TIMELINE_ROLE.INTERNAL_USER,
      });

      await this.timelineService.registerEvent(tx, {
        orderId,
        statusType: STORE_ORDER_TIMELINE_STATUS_TYPE.DELIVERY_STATUS,
        previousStatus: order.deliveryStatus,
        newStatus: STORE_DELIVERY_STATUS.PROGRAMADA,
        comment: `Entrega programada para el ${input.confirmedDeliveryDate.toISOString().slice(0, 10)} (${input.deliveryTimeRange}).`,
        createdByInternalUserId: actor.id,
        createdByRole: STORE_TIMELINE_ROLE.INTERNAL_USER,
      });
    });

    return this.getAdmin(orderId);
  }

  async reschedule(orderId: string, input: RescheduleStoreOrderInput, actor: InternalAuthUser) {
    const order = await this.assertExists(orderId);

    const allowedSourceStatuses: string[] = [
      STORE_ORDER_STATUS.PEDIDO_SOLICITADO,
      STORE_ORDER_STATUS.EN_REVISION,
      STORE_ORDER_STATUS.CONFIRMADO_ADMIN,
      STORE_ORDER_STATUS.REPROGRAMADO,
    ];

    if (!allowedSourceStatuses.includes(order.orderStatus)) {
      throw new BadRequestException('El pedido no se encuentra en un estado valido para reprogramarse.');
    }

    if (this.dateOnly(input.newConfirmedDeliveryDate).getTime() <= this.dateOnly(order.createdAt).getTime()) {
      throw new BadRequestException('La nueva fecha no puede ser el mismo dia de la solicitud.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.storeOrder.update({
        where: { id: orderId },
        data: {
          orderStatus: STORE_ORDER_STATUS.REPROGRAMADO,
          deliveryStatus: STORE_DELIVERY_STATUS.REPROGRAMADA,
          confirmedDeliveryDate: input.newConfirmedDeliveryDate,
          deliveryTimeRange: input.newDeliveryTimeRange,
        },
      });

      const comment = `Motivo: ${input.reason}.${input.comment ? ` Comentario: ${input.comment}.` : ''} Nueva fecha: ${input.newConfirmedDeliveryDate.toISOString().slice(0, 10)} (${input.newDeliveryTimeRange}).`;

      await this.timelineService.registerEvent(tx, {
        orderId,
        statusType: STORE_ORDER_TIMELINE_STATUS_TYPE.ORDER_STATUS,
        previousStatus: order.orderStatus,
        newStatus: STORE_ORDER_STATUS.REPROGRAMADO,
        comment,
        createdByInternalUserId: actor.id,
        createdByRole: STORE_TIMELINE_ROLE.INTERNAL_USER,
      });

      await this.timelineService.registerEvent(tx, {
        orderId,
        statusType: STORE_ORDER_TIMELINE_STATUS_TYPE.DELIVERY_STATUS,
        previousStatus: order.deliveryStatus,
        newStatus: STORE_DELIVERY_STATUS.REPROGRAMADA,
        comment,
        createdByInternalUserId: actor.id,
        createdByRole: STORE_TIMELINE_ROLE.INTERNAL_USER,
      });
    });

    return this.getAdmin(orderId);
  }

  async cancel(orderId: string, input: CancelStoreOrderInput, actor: InternalAuthUser) {
    const order = await this.prisma.storeOrder.findUnique({
      where: { id: orderId },
      include: { items: true, payments: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    if (!order) {
      throw new NotFoundException('Pedido no encontrado.');
    }

    if (order.orderStatus === STORE_ORDER_STATUS.CANCELADO) {
      throw new BadRequestException('El pedido ya esta cancelado.');
    }

    await this.prisma.$transaction(async (tx) => {
      const claimedOrder = await tx.storeOrder.updateMany({
        where: { id: orderId, orderStatus: { not: STORE_ORDER_STATUS.CANCELADO } },
        data: {
          orderStatus: STORE_ORDER_STATUS.CANCELADO,
          deliveryStatus: STORE_DELIVERY_STATUS.CANCELADA,
          cancelledAt: new Date(),
          cancelReason: input.reason,
        },
      });

      if (claimedOrder.count !== 1) {
        throw new BadRequestException('El pedido ya esta cancelado.');
      }

      const hasConfirmedStock = await this.stockMovementsService.hasMovementForReference(tx, {
        referenceType: STOCK_REFERENCE_TYPE,
        referenceId: orderId,
        movementType: STORE_STOCK_MOVEMENT_TYPES.ORDER_CONFIRMED,
      });

      if (hasConfirmedStock) {
        for (const item of order.items) {
          await this.restoreItemStock(tx, orderId, item, order.orderNumber, 'cancelacion', actor);
        }
      }

      const pendingPaymentStatuses: string[] = [
        STORE_PAYMENT_STATUS.PENDIENTE_PAGO,
        STORE_PAYMENT_STATUS.PENDIENTE_LINK,
        STORE_PAYMENT_STATUS.LINK_ENVIADO,
        STORE_PAYMENT_STATUS.PENDIENTE_CONFIRMACION,
      ];
      const activePayment = order.payments[0];
      if (activePayment && pendingPaymentStatuses.includes(activePayment.paymentStatus)) {
        await tx.storeOrderPayment.update({
          where: { id: activePayment.id },
          data: { paymentStatus: STORE_PAYMENT_STATUS.ANULADO },
        });
        await tx.storeOrder.update({ where: { id: orderId }, data: { clientPaymentStatus: STORE_PAYMENT_STATUS.ANULADO } });
      }

      const comment = `Motivo: ${input.reason}.${input.comment ? ` Comentario: ${input.comment}.` : ''}`;

      await this.timelineService.registerEvent(tx, {
        orderId,
        statusType: STORE_ORDER_TIMELINE_STATUS_TYPE.ORDER_STATUS,
        previousStatus: order.orderStatus,
        newStatus: STORE_ORDER_STATUS.CANCELADO,
        comment,
        createdByInternalUserId: actor.id,
        createdByRole: STORE_TIMELINE_ROLE.INTERNAL_USER,
      });

      if (activePayment && activePayment.paymentStatus === STORE_PAYMENT_STATUS.PAGO_CONFIRMADO) {
        await this.timelineService.registerEvent(tx, {
          orderId,
          statusType: STORE_ORDER_TIMELINE_STATUS_TYPE.PAYMENT_STATUS,
          previousStatus: activePayment.paymentStatus,
          newStatus: activePayment.paymentStatus,
          comment: 'El pago de este pedido ya estaba confirmado al momento de cancelar. Requiere revision manual de gestion de pagos.',
          createdByInternalUserId: actor.id,
          createdByRole: STORE_TIMELINE_ROLE.INTERNAL_USER,
        });
      }
    });

    return this.getAdmin(orderId);
  }

  private async assertIncidentActionable(
    orderId: string,
    incidentId: string,
    options: { allowedIncidentStatuses: string[]; allowReprogramada?: boolean },
  ) {
    const order = await this.prisma.storeOrder.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        payments: { orderBy: { createdAt: 'desc' }, take: 1 },
        deliveryIncidents: { where: { id: incidentId }, take: 1 },
      },
    });
    if (!order) {
      throw new NotFoundException('Pedido no encontrado.');
    }
    const incident = order.deliveryIncidents[0];
    if (!incident) {
      throw new NotFoundException('Incidencia no encontrada para este pedido.');
    }
    if (order.orderStatus === STORE_ORDER_STATUS.ENTREGADO || order.deliveryStatus === STORE_DELIVERY_STATUS.ENTREGADA) {
      throw new BadRequestException('No se puede resolver incidencia de un pedido entregado.');
    }
    if (STORE_ORDER_TERMINAL_STATUSES.includes(order.orderStatus)) {
      throw new BadRequestException('El pedido esta en un estado final; no admite resolucion de incidencia.');
    }
    if (!options.allowedIncidentStatuses.includes(incident.status)) {
      throw new BadRequestException('La incidencia no se encuentra en un estado valido para esta accion.');
    }
    return { order, incident };
  }

  private nextStateAfterIncidentReschedule(order: { assignedDriverId: string | null }) {
    if (order.assignedDriverId) {
      return { orderStatus: STORE_ORDER_STATUS.ASIGNADO_MOTORISTA, deliveryStatus: STORE_DELIVERY_STATUS.ASIGNADA };
    }
    return { orderStatus: STORE_ORDER_STATUS.ENTREGA_PROGRAMADA, deliveryStatus: STORE_DELIVERY_STATUS.REPROGRAMADA };
  }

  private async resolveIncidentAddress(
    order: { customerId: string; deliveryPhone: string; receiverName: string | null },
    input: ChangeAddressDeliveryIncidentInput,
  ) {
    if (input.customerAddressId) {
      const address = await this.prisma.customerAddress.findFirst({
        where: { id: input.customerAddressId, customerId: order.customerId, isActive: true },
      });
      if (!address) {
        throw new BadRequestException('La direccion seleccionada no pertenece al cliente o esta inactiva.');
      }
      return {
        customerAddressId: address.id,
        deliveryAddress: address.addressLine,
        deliveryReference: address.reference ?? null,
        deliveryPhone: input.deliveryPhone?.trim() || address.contactPhone,
        receiverName: input.receiverName ?? order.receiverName,
        deliveryAddressSnapshot: {
          label: address.label,
          department: address.department,
          municipality: address.municipality,
          zone: address.zone,
          addressLine: address.addressLine,
          reference: address.reference,
          contactPhone: address.contactPhone,
          latitude: address.latitude,
          longitude: address.longitude,
          source: 'CUSTOMER_ADDRESS',
        } satisfies Prisma.InputJsonObject,
      };
    }

    const deliveryAddress = input.deliveryAddress?.trim();
    if (!deliveryAddress) {
      throw new BadRequestException('La direccion de entrega es obligatoria.');
    }
    return {
      customerAddressId: null,
      deliveryAddress,
      deliveryReference: input.deliveryReference ?? null,
      deliveryPhone: input.deliveryPhone?.trim() || order.deliveryPhone,
      receiverName: input.receiverName ?? order.receiverName,
      deliveryAddressSnapshot: {
        addressLine: deliveryAddress,
        reference: input.deliveryReference ?? null,
        contactPhone: input.deliveryPhone?.trim() || order.deliveryPhone,
        source: 'ADMIN_MANUAL_SNAPSHOT',
      } satisfies Prisma.InputJsonObject,
    };
  }

  private async restoreStockOnCancelIfNeeded(
    tx: Prisma.TransactionClient,
    orderId: string,
    order: { orderNumber: string; items: Array<{ productId: string; variantId?: string | null; quantity: number }> },
    actor: InternalAuthUser,
  ) {
    const hasConfirmedStock = await this.stockMovementsService.hasMovementForReference(tx, {
      referenceType: STOCK_REFERENCE_TYPE,
      referenceId: orderId,
      movementType: STORE_STOCK_MOVEMENT_TYPES.ORDER_CONFIRMED,
    });
    if (!hasConfirmedStock) return;

    for (const item of order.items) {
      await this.restoreItemStock(tx, orderId, item, order.orderNumber, 'cancelacion por incidencia', actor);
    }
  }

  private async decrementItemStock(
    tx: Prisma.TransactionClient,
    orderId: string,
    item: { productId: string; variantId?: string | null; quantity: number; productNameSnapshot: string },
    orderNumber: string,
    actor: InternalAuthUser,
  ) {
    if (item.variantId) {
      const stockUpdate = await tx.storeProductVariant.updateMany({
        where: { id: item.variantId, productId: item.productId, isActive: true, stockQuantity: { gte: item.quantity } },
        data: { stockQuantity: { decrement: item.quantity } },
      });
      if (stockUpdate.count !== 1) {
        throw new BadRequestException(`No hay stock suficiente para "${item.productNameSnapshot}".`);
      }
      const updatedVariant = await tx.storeProductVariant.findUniqueOrThrow({
        where: { id: item.variantId },
        select: { stockQuantity: true },
      });
      const newStock = updatedVariant.stockQuantity;
      const previousStock = newStock + item.quantity;
      await this.stockMovementsService.registerMovement(tx, {
        productId: item.productId,
        variantId: item.variantId,
        movementType: STORE_STOCK_MOVEMENT_TYPES.ORDER_CONFIRMED,
        previousStock,
        newStock,
        referenceType: STOCK_REFERENCE_TYPE,
        referenceId: orderId,
        comment: `Stock de variante descontado por confirmacion del pedido ${orderNumber}.`,
        createdByInternalUserId: actor.id,
      });
      return;
    }

    const stockUpdate = await tx.storeProduct.updateMany({
      where: { id: item.productId, isActive: true, stockQuantity: { gte: item.quantity } },
      data: { stockQuantity: { decrement: item.quantity } },
    });

    if (stockUpdate.count !== 1) {
      throw new BadRequestException(`No hay stock suficiente para "${item.productNameSnapshot}".`);
    }

    const updatedProduct = await tx.storeProduct.findUniqueOrThrow({
      where: { id: item.productId },
      select: { stockQuantity: true },
    });
    const newStock = updatedProduct.stockQuantity;
    const previousStock = newStock + item.quantity;

    await this.stockMovementsService.registerMovement(tx, {
      productId: item.productId,
      movementType: STORE_STOCK_MOVEMENT_TYPES.ORDER_CONFIRMED,
      previousStock,
      newStock,
      referenceType: STOCK_REFERENCE_TYPE,
      referenceId: orderId,
      comment: `Stock descontado por confirmacion del pedido ${orderNumber}.`,
      createdByInternalUserId: actor.id,
    });
  }

  private async restoreItemStock(
    tx: Prisma.TransactionClient,
    orderId: string,
    item: { productId: string; variantId?: string | null; quantity: number },
    orderNumber: string,
    reason: string,
    actor: InternalAuthUser,
  ) {
    if (item.variantId) {
      const variant = await tx.storeProductVariant.findUnique({ where: { id: item.variantId } });
      if (!variant) return;
      const updatedVariant = await tx.storeProductVariant.update({
        where: { id: variant.id },
        data: { stockQuantity: { increment: item.quantity } },
        select: { stockQuantity: true },
      });
      const newStock = updatedVariant.stockQuantity;
      const previousStock = newStock - item.quantity;
      await this.stockMovementsService.registerMovement(tx, {
        productId: item.productId,
        variantId: variant.id,
        movementType: STORE_STOCK_MOVEMENT_TYPES.ORDER_CANCELLED,
        previousStock,
        newStock,
        referenceType: STOCK_REFERENCE_TYPE,
        referenceId: orderId,
        comment: `Stock de variante devuelto por ${reason} del pedido ${orderNumber}.`,
        createdByInternalUserId: actor.id,
      });
      return;
    }

    const product = await tx.storeProduct.findUnique({ where: { id: item.productId } });
    if (!product) return;

    const updatedProduct = await tx.storeProduct.update({
      where: { id: product.id },
      data: { stockQuantity: { increment: item.quantity } },
      select: { stockQuantity: true },
    });
    const newStock = updatedProduct.stockQuantity;
    const previousStock = newStock - item.quantity;

    await this.stockMovementsService.registerMovement(tx, {
      productId: product.id,
      movementType: STORE_STOCK_MOVEMENT_TYPES.ORDER_CANCELLED,
      previousStock,
      newStock,
      referenceType: STOCK_REFERENCE_TYPE,
      referenceId: orderId,
      comment: `Stock devuelto por ${reason} del pedido ${orderNumber}.`,
      createdByInternalUserId: actor.id,
    });
  }

  private async cancelPendingPaymentIfNeeded(
    tx: Prisma.TransactionClient,
    orderId: string,
    order: { payments: Array<{ id: string; paymentStatus: string }> },
  ) {
    const pendingPaymentStatuses: string[] = [
      STORE_PAYMENT_STATUS.PENDIENTE_PAGO,
      STORE_PAYMENT_STATUS.PENDIENTE_LINK,
      STORE_PAYMENT_STATUS.LINK_ENVIADO,
      STORE_PAYMENT_STATUS.PENDIENTE_CONFIRMACION,
      STORE_PAYMENT_STATUS.COMPROBANTE_ENVIADO,
      STORE_PAYMENT_STATUS.VISA_LINK_SOLICITADO,
      STORE_PAYMENT_STATUS.CONTRA_ENTREGA_PENDIENTE,
    ];
    const activePayment = order.payments[0];
    if (!activePayment || !pendingPaymentStatuses.includes(activePayment.paymentStatus)) return;

    await tx.storeOrderPayment.update({
      where: { id: activePayment.id },
      data: { paymentStatus: STORE_PAYMENT_STATUS.ANULADO },
    });
    await tx.storeOrder.update({ where: { id: orderId }, data: { clientPaymentStatus: STORE_PAYMENT_STATUS.ANULADO } });
  }

  private joinResolution(event: string, resolution: string, comment?: string | null) {
    return `${event} · ${resolution}${comment ? ` · ${comment}` : ''}`;
  }

  private formatNullableDate(date: Date | null) {
    return date ? this.formatDate(date) : 'sin fecha';
  }

  private toIncidentDto(incident: {
    id: string;
    incidentType: string;
    comment: string | null;
    evidencePhotoUrl: string | null;
    latitude: number | null;
    longitude: number | null;
    addressText: string | null;
    status: string;
    reportedAt: Date;
    reviewedByInternalUserId: string | null;
    reviewedAt: Date | null;
    adminResolution: string | null;
    driver: { id: string; fullName: string } | null;
  }) {
    return {
      id: incident.id,
      incidentType: incident.incidentType,
      incidentLabel: getIncidentType(incident.incidentType)?.label ?? incident.incidentType,
      comment: incident.comment,
      evidencePhotoUrl: incident.evidencePhotoUrl,
      latitude: incident.latitude,
      longitude: incident.longitude,
      addressText: incident.addressText,
      status: incident.status,
      reportedAt: incident.reportedAt,
      reviewedByAdminId: incident.reviewedByInternalUserId,
      reviewedAt: incident.reviewedAt,
      adminResolution: incident.adminResolution,
      driverName: incident.driver?.fullName ?? null,
    };
  }

  private async notifyIncidentRescheduled(customerId: string, orderId: string, orderNumber: string, date: Date, range: string) {
    await this.notificationsService
      .notifySystemCustomer(
        customerId,
        'Entrega reprogramada',
        `Tu pedido ${orderNumber} fue reprogramado para el ${this.formatDate(date)} (${range}).`,
        { event: 'store.delivery_rescheduled_after_incident', orderId, orderNumber },
        'INFO',
      )
      .catch(() => undefined);
  }

  private async notifyIncidentAddressChanged(customerId: string, orderId: string, orderNumber: string, date: Date, range: string) {
    await this.notificationsService
      .notifySystemCustomer(
        customerId,
        'Direccion de entrega actualizada',
        `Actualizamos la direccion de entrega de tu pedido ${orderNumber} y lo reprogramamos para el ${this.formatDate(date)} (${range}).`,
        { event: 'store.delivery_address_changed_after_incident', orderId, orderNumber },
        'INFO',
      )
      .catch(() => undefined);
  }

  private async notifyIncidentCancelled(customerId: string, orderId: string, orderNumber: string) {
    await this.notificationsService
      .notifySystemCustomer(
        customerId,
        'Pedido cancelado',
        `Tu pedido ${orderNumber} fue cancelado. Nuestro equipo dara seguimiento si corresponde.`,
        { event: 'store.order_cancelled_after_incident', orderId, orderNumber },
        'WARNING',
      )
      .catch(() => undefined);
  }

  private async assertExists(orderId: string) {
    const order = await this.prisma.storeOrder.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Pedido no encontrado.');
    }
    return order;
  }

  private async buildSummaryCards() {
    const [solicitados, enRevision, confirmados, reprogramados, cancelados, pendientesPago, pagosConfirmados, pendientesLink] =
      await Promise.all([
        this.prisma.storeOrder.count({ where: { orderStatus: STORE_ORDER_STATUS.PEDIDO_SOLICITADO } }),
        this.prisma.storeOrder.count({ where: { orderStatus: STORE_ORDER_STATUS.EN_REVISION } }),
        this.prisma.storeOrder.count({ where: { orderStatus: STORE_ORDER_STATUS.CONFIRMADO_ADMIN } }),
        this.prisma.storeOrder.count({ where: { orderStatus: STORE_ORDER_STATUS.REPROGRAMADO } }),
        this.prisma.storeOrder.count({ where: { orderStatus: STORE_ORDER_STATUS.CANCELADO } }),
        this.prisma.storeOrder.count({ where: { clientPaymentStatus: STORE_PAYMENT_STATUS.PENDIENTE_PAGO } }),
        this.prisma.storeOrder.count({ where: { clientPaymentStatus: STORE_PAYMENT_STATUS.PAGO_CONFIRMADO } }),
        this.prisma.storeOrder.count({ where: { clientPaymentStatus: STORE_PAYMENT_STATUS.PENDIENTE_LINK } }),
      ]);

    return {
      solicitados,
      enRevision,
      confirmados,
      reprogramados,
      cancelados,
      pendientesPago,
      pagosConfirmados,
      pendientesLink,
    };
  }

  private async collectInternalUserNames(order: {
    payments: Array<{
      confirmedByInternalUserId: string | null;
      visaLinkSentByInternalUserId: string | null;
      receiptUploadedByInternalUserId: string | null;
    }>;
    timeline: Array<{ createdByInternalUserId: string | null }>;
  }) {
    const ids = new Set<string>();
    for (const payment of order.payments) {
      if (payment.confirmedByInternalUserId) ids.add(payment.confirmedByInternalUserId);
      if (payment.visaLinkSentByInternalUserId) ids.add(payment.visaLinkSentByInternalUserId);
      if (payment.receiptUploadedByInternalUserId) ids.add(payment.receiptUploadedByInternalUserId);
    }
    for (const event of order.timeline) {
      if (event.createdByInternalUserId) ids.add(event.createdByInternalUserId);
    }

    if (ids.size === 0) return new Map<string, string>();

    const users = await this.prisma.internalUser.findMany({
      where: { id: { in: Array.from(ids) } },
      select: { id: true, fullName: true },
    });

    return new Map(users.map((user) => [user.id, user.fullName]));
  }

  private resolveUserName(map: Map<string, string>, id?: string | null) {
    if (!id) return null;
    return map.get(id) ?? null;
  }

  private dateOnly(date: Date) {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  private assertValidScheduleDate(date: Date, orderCreatedAt: Date) {
    const target = this.dateOnly(date);
    const today = this.dateOnly(new Date());
    const created = this.dateOnly(orderCreatedAt);

    if (target.getTime() < today.getTime()) {
      throw new BadRequestException('La fecha confirmada no puede ser anterior a hoy.');
    }
    if (target.getTime() === created.getTime()) {
      throw new BadRequestException('La fecha confirmada no puede ser el mismo dia de la solicitud.');
    }
  }

  private formatDate(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  private parsePositiveInt(value: string | undefined, fallback: number) {
    const parsed = Number.parseInt(value ?? '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private parseOptionalDate(value: string | undefined) {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  private toListDto(order: {
    id: string;
    orderNumber: string;
    orderStatus: string;
    deliveryStatus: string;
    clientPaymentStatus: string;
    paymentMethodRequested: string;
    totalAmount: Prisma.Decimal;
    createdAt: Date;
    suggestedDeliveryDate: Date;
    confirmedDeliveryDate: Date | null;
    customer: { id: string; fullName: string; phone: string };
    assignedDriver: { id: string; fullName: string; phone: string; code: string | null } | null;
    payments: Array<{ createdAt: Date }>;
  }) {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      customer: order.customer,
      totalAmount: Number(order.totalAmount),
      paymentMethodRequested: order.paymentMethodRequested,
      clientPaymentStatus: order.clientPaymentStatus,
      orderStatus: order.orderStatus,
      deliveryStatus: order.deliveryStatus,
      createdAt: order.createdAt,
      suggestedDeliveryDate: order.suggestedDeliveryDate,
      confirmedDeliveryDate: order.confirmedDeliveryDate,
      assignedDriver: order.assignedDriver,
    };
  }

  private toDetailDto(order: {
    id: string;
    orderNumber: string;
    orderStatus: string;
    deliveryStatus: string;
    clientPaymentStatus: string;
    paymentMethodRequested: string;
    subtotalAmount: Prisma.Decimal;
    shippingAmount: Prisma.Decimal;
    totalAmount: Prisma.Decimal;
    suggestedDeliveryDate: Date;
    confirmedDeliveryDate: Date | null;
    deliveryTimeRange: string | null;
    deliveryAddress: string;
    deliveryDepartmentId: string | null;
    deliveryMunicipalityId: string | null;
    deliveryZoneId: string | null;
    deliveryReference: string | null;
    deliveryPhone: string;
    receiverName: string | null;
    deliveryCodeGeneratedAt?: Date | null;
    deliveryCodeValidatedAt?: Date | null;
    deliveryCodeValidatedByDriverId?: string | null;
    deliveryCodeFailedAttempts?: number;
    deliveryCodeStatus?: string | null;
    assignedDriver: { id: string; fullName: string; phone: string; code: string | null } | null;
    cancelledAt: Date | null;
    cancelReason: string | null;
    createdAt: Date;
    customer: { id: string; fullName: string; phone: string; email: string | null; code: string };
    items: Array<{
      id: string;
      productId: string;
      variantId?: string | null;
      brandId: string;
      productNameSnapshot: string;
      variantLabelSnapshot?: string | null;
      variantOptionsSnapshot?: Prisma.JsonValue | null;
      skuSnapshot?: string | null;
      brandNameSnapshot: string;
      productImageSnapshot: string | null;
      unitPrice: Prisma.Decimal;
      quantity: number;
      subtotal: Prisma.Decimal;
      pickupStatus?: string | null;
      product?: { sku: string | null } | null;
      variant?: { sku: string | null; optionLabel: string } | null;
      originStore?: { id: string; code: string; name: string } | null;
    }>;
    payments: Array<Record<string, unknown> & { amount: Prisma.Decimal; createdAt: Date }>;
    timeline: Array<{
      statusType: string;
      previousStatus: string | null;
      newStatus: string;
      comment: string | null;
      createdByInternalUserId: string | null;
      createdByClientId: string | null;
      createdByRole: string;
      createdAt: Date;
    }>;
    deliveryIncidents?: Array<{
      id: string;
      incidentType: string;
      comment: string | null;
      evidencePhotoUrl: string | null;
      latitude: number | null;
      longitude: number | null;
      addressText: string | null;
      status: string;
      affectedStoreId?: string | null;
      affectedOrderItemId?: string | null;
      reportedAt: Date;
      reviewedByInternalUserId: string | null;
      reviewedAt: Date | null;
      adminResolution: string | null;
      driver: { id: string; fullName: string } | null;
    }>;
  }, internalUserNames: Map<string, string> = new Map()) {
    const adminItems = order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      variantId: item.variantId ?? null,
      brandId: item.brandId,
      brandName: item.brandNameSnapshot,
      productName: item.productNameSnapshot,
      variantLabel: item.variantLabelSnapshot ?? item.variant?.optionLabel ?? null,
      variantOptions: item.variantOptionsSnapshot ?? null,
      imageUrl: item.productImageSnapshot,
      unitPrice: Number(item.unitPrice),
      quantity: item.quantity,
      subtotal: Number(item.subtotal),
      pickupStatus: item.pickupStatus ?? null,
      sku: item.skuSnapshot ?? item.variant?.sku ?? item.product?.sku ?? null,
      originStore: item.originStore ?? null,
    }));

    // FRD 08 (ajuste) — flujo lineal compartido. La UI consume `flow`/`nextAction`,
    // no inventa acciones. Se computa de la combinación pedido/pago/entrega/recolección.
    const activeItems = order.items.filter((item) => item.pickupStatus !== STORE_PICKUP_STATUS.CANCELADO);
    const flowContext = {
      orderStatus: order.orderStatus,
      paymentStatus: order.clientPaymentStatus,
      deliveryStatus: order.deliveryStatus,
      paymentMethod: order.paymentMethodRequested,
      hasDriver: Boolean(order.assignedDriver),
      itemsTotal: order.items.length,
      itemsActive: activeItems.length,
      itemsWithStore: activeItems.filter((item) => item.pickupStatus && item.pickupStatus !== STORE_PICKUP_STATUS.PENDIENTE_ASIGNAR_TIENDA).length,
      itemsPicked: activeItems.filter((item) => item.pickupStatus === STORE_PICKUP_STATUS.RECOLECTADO).length,
    };
    const flow = buildOrderFlow(flowContext);
    const adminNextAction = nextRequiredActionFor(flowContext, STORE_ACTOR.ADMIN);

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      orderStatus: order.orderStatus,
      deliveryStatus: order.deliveryStatus,
      clientPaymentStatus: order.clientPaymentStatus,
      paymentMethodRequested: order.paymentMethodRequested,
      subtotalAmount: Number(order.subtotalAmount),
      shippingAmount: Number(order.shippingAmount),
      totalAmount: Number(order.totalAmount),
      suggestedDeliveryDate: order.suggestedDeliveryDate,
      confirmedDeliveryDate: order.confirmedDeliveryDate,
      deliveryTimeRange: order.deliveryTimeRange,
      deliveryAddress: order.deliveryAddress,
      deliveryDepartmentId: order.deliveryDepartmentId,
      deliveryMunicipalityId: order.deliveryMunicipalityId,
      deliveryZoneId: order.deliveryZoneId,
      deliveryReference: order.deliveryReference,
      deliveryPhone: order.deliveryPhone,
      receiverName: order.receiverName,
      deliveryCodeStatus: order.deliveryCodeStatus ?? null,
      deliveryCodeGeneratedAt: order.deliveryCodeGeneratedAt ?? null,
      deliveryCodeValidatedAt: order.deliveryCodeValidatedAt ?? null,
      deliveryCodeValidatedByDriverId: order.deliveryCodeValidatedByDriverId ?? null,
      deliveryCodeFailedAttempts: order.deliveryCodeFailedAttempts ?? 0,
      assignedDriver: order.assignedDriver,
      cancelledAt: order.cancelledAt,
      cancelReason: order.cancelReason,
      createdAt: order.createdAt,
      customer: order.customer,
      // FRD 08 (ajuste) — flujo lineal + siguiente acción admin (fuente de verdad para el stepper/card).
      flow: flow.stages,
      flowCurrentStage: flow.currentStageKey,
      flowTerminal: flow.terminal,
      flowIncident: flow.incident,
      nextAction: adminNextAction,
      incidents: (order.deliveryIncidents ?? []).map((incident) => ({
        id: incident.id,
        incidentType: incident.incidentType,
        incidentLabel: getIncidentType(incident.incidentType)?.label ?? incident.incidentType,
        comment: incident.comment,
        evidencePhotoUrl: incident.evidencePhotoUrl,
        latitude: incident.latitude,
        longitude: incident.longitude,
        addressText: incident.addressText,
        status: incident.status,
        affectedStoreId: incident.affectedStoreId ?? null,
        affectedOrderItemId: incident.affectedOrderItemId ?? null,
        reportedAt: incident.reportedAt,
        reviewedByAdminId: incident.reviewedByInternalUserId,
        reviewedAt: incident.reviewedAt,
        adminResolution: incident.adminResolution,
        driverName: incident.driver?.fullName ?? null,
      })),
      items: adminItems,
      // Fase 5 — agrupación por marca del pedido maestro (aditiva); `items` plano se conserva.
      brandGroups: groupItemsByBrand(adminItems).map((group) => ({
        brandId: group.brandId,
        brandName: group.brandName,
        brandLogoUrl: group.brandLogoUrl,
        subtotal: group.subtotal,
        totalItems: group.totalItems,
        items: group.items,
      })),
      payments: order.payments.map((payment) => ({
        ...payment,
        amount: Number(payment.amount),
        cashAvailableAmount:
          (payment as { cashAvailableAmount?: unknown }).cashAvailableAmount != null
            ? Number((payment as { cashAvailableAmount?: unknown }).cashAvailableAmount)
            : null,
        confirmedByName: this.resolveUserName(internalUserNames, (payment as { confirmedByInternalUserId?: string | null }).confirmedByInternalUserId),
        visaLinkSentByName: this.resolveUserName(internalUserNames, (payment as { visaLinkSentByInternalUserId?: string | null }).visaLinkSentByInternalUserId),
        receiptUploadedByName: this.resolveUserName(internalUserNames, (payment as { receiptUploadedByInternalUserId?: string | null }).receiptUploadedByInternalUserId),
      })),
      timeline: order.timeline.map((event) => ({
        ...event,
        createdByName:
          event.createdByRole === 'CLIENT'
            ? 'Cliente'
            : this.resolveUserName(internalUserNames, event.createdByInternalUserId) ?? 'Sistema',
      })),
    };
  }
}
