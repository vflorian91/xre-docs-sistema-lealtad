import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { InternalAuthUser } from '../../auth/auth.types';
import { PrismaService } from '../../database/prisma.service';
import { StoreDriversService } from '../drivers/store-drivers.service';
import {
  STORE_DELIVERY_STATUS,
  STORE_ORDER_STATUS,
  STORE_ORDER_TIMELINE_STATUS_TYPE,
  STORE_TIMELINE_ROLE,
} from '../order/store-order.constants';
import { StoreOrderTimelineService } from '../order/store-order-timeline.service';
import { isPaymentClearedForScheduling } from '../order/store-order-flow';
import { NotificationsService } from '../../notifications/notifications.service';
import {
  AssignStoreDeliveryDriverInput,
  CancelStoreDeliveryScheduleInput,
  ChangeStoreDeliveryDriverInput,
  ProgramStoreDeliveryInput,
  RescheduleStoreDeliveryInput,
} from './store-delivery-schedule.schemas';

type ListScheduleQuery = Record<string, string | undefined>;

const scheduleOrderInclude = {
  customer: { select: { id: true, fullName: true, phone: true, email: true, code: true } },
  payments: { orderBy: { createdAt: 'desc' as const }, take: 1 },
  assignedDriver: { select: { id: true, fullName: true, phone: true, code: true } },
};

@Injectable()
export class StoreDeliveryScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly driversService: StoreDriversService,
    private readonly timelineService: StoreOrderTimelineService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async list(query: ListScheduleQuery = {}) {
    const where = this.buildWhere(query);

    const [orders, cards, drivers] = await Promise.all([
      this.prisma.storeOrder.findMany({
        where,
        orderBy: [{ confirmedDeliveryDate: 'asc' }, { createdAt: 'desc' }],
        take: 100,
        include: scheduleOrderInclude,
      }),
      this.buildCards(),
      this.driversService.listActive(),
    ]);

    return {
      data: orders.map((order) => this.toScheduleDto(order)),
      meta: { cards, drivers },
    };
  }

  async listDay(date: string) {
    const targetDate = this.parseDateString(date, 'La fecha de agenda no es valida.');
    const where: Prisma.StoreOrderWhereInput = {
      confirmedDeliveryDate: this.dayRange(targetDate),
    };

    const [orders, drivers] = await Promise.all([
      this.prisma.storeOrder.findMany({
        where,
        orderBy: [{ deliveryTimeRange: 'asc' }, { createdAt: 'desc' }],
        include: scheduleOrderInclude,
      }),
      this.driversService.listActive(),
    ]);

    return { date, data: orders.map((order) => this.toScheduleDto(order)), meta: { drivers } };
  }

  async program(orderId: string, input: ProgramStoreDeliveryInput, actor: InternalAuthUser) {
    const order = await this.assertOrderExists(orderId);
    this.assertOrderCanBeScheduled(order);
    // FRD 08 — flujo lineal: no se puede programar la entrega sin pago confirmado
    // (o efectivo contra entrega). Evita saltarse la etapa de pago.
    if (!isPaymentClearedForScheduling(order.clientPaymentStatus, order.paymentMethodRequested)) {
      throw new BadRequestException('No puedes programar la entrega hasta que el pago esté confirmado.');
    }
    this.assertValidScheduleDate(input.confirmedDeliveryDate, order.createdAt);

    await this.prisma.$transaction(async (tx) => {
      await tx.storeOrder.update({
        where: { id: orderId },
        data: {
          deliveryStatus: STORE_DELIVERY_STATUS.PROGRAMADA,
          confirmedDeliveryDate: input.confirmedDeliveryDate,
          deliveryTimeRange: input.deliveryTimeRange,
        },
      });

      await this.timelineService.registerEvent(tx, {
        orderId,
        statusType: STORE_ORDER_TIMELINE_STATUS_TYPE.DELIVERY_STATUS,
        previousStatus: order.deliveryStatus,
        newStatus: STORE_DELIVERY_STATUS.PROGRAMADA,
        comment:
          input.comment ??
          `Entrega programada para el ${this.formatDate(input.confirmedDeliveryDate)} (${input.deliveryTimeRange}).`,
        createdByInternalUserId: actor.id,
        createdByRole: STORE_TIMELINE_ROLE.INTERNAL_USER,
      });
    });

    return this.getScheduleOrder(orderId);
  }

  async reschedule(orderId: string, input: RescheduleStoreDeliveryInput, actor: InternalAuthUser) {
    const order = await this.assertOrderExists(orderId);
    this.assertOrderCanBeScheduled(order);
    this.assertValidScheduleDate(input.newConfirmedDeliveryDate, order.createdAt);

    await this.prisma.$transaction(async (tx) => {
      await tx.storeOrder.update({
        where: { id: orderId },
        data: {
          deliveryStatus: STORE_DELIVERY_STATUS.REPROGRAMADA,
          confirmedDeliveryDate: input.newConfirmedDeliveryDate,
          deliveryTimeRange: input.deliveryTimeRange,
        },
      });

      await this.timelineService.registerEvent(tx, {
        orderId,
        statusType: STORE_ORDER_TIMELINE_STATUS_TYPE.DELIVERY_STATUS,
        previousStatus: order.deliveryStatus,
        newStatus: STORE_DELIVERY_STATUS.REPROGRAMADA,
        comment: `Motivo: ${input.reasonCode}.${input.comment ? ` Comentario: ${input.comment}.` : ''} Nueva fecha: ${this.formatDate(input.newConfirmedDeliveryDate)} (${input.deliveryTimeRange}).`,
        createdByInternalUserId: actor.id,
        createdByRole: STORE_TIMELINE_ROLE.INTERNAL_USER,
      });
    });

    return this.getScheduleOrder(orderId);
  }

  async assignDriver(orderId: string, input: AssignStoreDeliveryDriverInput, actor: InternalAuthUser) {
    const [order, driver] = await Promise.all([this.assertOrderExists(orderId), this.driversService.assertActive(input.driverId)]);
    this.assertOrderCanReceiveDriver(order);

    if (order.assignedDriverId) {
      throw new BadRequestException('El pedido ya tiene mensajero asignado. Usa cambiar mensajero.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.storeOrder.update({
        where: { id: orderId },
        data: {
          assignedDriverId: driver.id,
          deliveryStatus: STORE_DELIVERY_STATUS.ASIGNADA,
        },
      });

      await tx.storeDeliveryAssignmentHistory.create({
        data: {
          orderId,
          previousDriverId: null,
          newDriverId: driver.id,
          comment: input.comment ?? null,
          createdByInternalUserId: actor.id,
        },
      });

      await this.timelineService.registerEvent(tx, {
        orderId,
        statusType: STORE_ORDER_TIMELINE_STATUS_TYPE.DELIVERY_STATUS,
        previousStatus: order.deliveryStatus,
        newStatus: STORE_DELIVERY_STATUS.ASIGNADA,
        comment: input.comment ?? `Mensajero asignado: ${driver.fullName}.`,
        createdByInternalUserId: actor.id,
        createdByRole: STORE_TIMELINE_ROLE.INTERNAL_USER,
      });
    });

    await this.notificationsService
      .notifySystemDriver(
        driver.id,
        'Nuevo pedido asignado',
        `Te asignaron el pedido ${order.orderNumber}. Revísalo en tus entregas.`,
        { event: 'store.driver_order_assigned', orderId, orderNumber: order.orderNumber },
        'INFO',
      )
      .catch(() => undefined);

    return this.getScheduleOrder(orderId);
  }

  async changeDriver(orderId: string, input: ChangeStoreDeliveryDriverInput, actor: InternalAuthUser) {
    const [order, driver] = await Promise.all([this.assertOrderExists(orderId), this.driversService.assertActive(input.driverId)]);
    this.assertOrderCanReceiveDriver(order);

    if (!order.assignedDriverId) {
      throw new BadRequestException('El pedido no tiene mensajero asignado.');
    }

    if (order.assignedDriverId === driver.id) {
      throw new BadRequestException('Selecciona un mensajero diferente.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.storeOrder.update({
        where: { id: orderId },
        data: {
          assignedDriverId: driver.id,
          deliveryStatus: STORE_DELIVERY_STATUS.ASIGNADA,
        },
      });

      await tx.storeDeliveryAssignmentHistory.create({
        data: {
          orderId,
          previousDriverId: order.assignedDriverId,
          newDriverId: driver.id,
          reasonCode: input.reasonCode,
          comment: input.comment ?? null,
          createdByInternalUserId: actor.id,
        },
      });

      await this.timelineService.registerEvent(tx, {
        orderId,
        statusType: STORE_ORDER_TIMELINE_STATUS_TYPE.DELIVERY_STATUS,
        previousStatus: order.deliveryStatus,
        newStatus: STORE_DELIVERY_STATUS.ASIGNADA,
        comment: `Cambio de mensajero. Motivo: ${input.reasonCode}.${input.comment ? ` Comentario: ${input.comment}.` : ''} Nuevo mensajero: ${driver.fullName}.`,
        createdByInternalUserId: actor.id,
        createdByRole: STORE_TIMELINE_ROLE.INTERNAL_USER,
      });
    });

    await this.notificationsService
      .notifySystemDriver(
        driver.id,
        'Nuevo pedido asignado',
        `Te asignaron el pedido ${order.orderNumber}. Revísalo en tus entregas.`,
        { event: 'store.driver_order_assigned', orderId, orderNumber: order.orderNumber },
        'INFO',
      )
      .catch(() => undefined);

    return this.getScheduleOrder(orderId);
  }

  async cancelSchedule(orderId: string, input: CancelStoreDeliveryScheduleInput, actor: InternalAuthUser) {
    const order = await this.assertOrderExists(orderId);

    if (order.orderStatus === STORE_ORDER_STATUS.CANCELADO) {
      throw new BadRequestException('El pedido esta cancelado.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.storeOrder.update({
        where: { id: orderId },
        data: {
          deliveryStatus: STORE_DELIVERY_STATUS.PENDIENTE_PROGRAMACION,
          assignedDriverId: null,
          confirmedDeliveryDate: null,
          deliveryTimeRange: null,
        },
      });

      await tx.storeDeliveryAssignmentHistory.create({
        data: {
          orderId,
          previousDriverId: order.assignedDriverId,
          newDriverId: null,
          reasonCode: input.reasonCode,
          comment: input.comment ?? null,
          createdByInternalUserId: actor.id,
        },
      });

      await this.timelineService.registerEvent(tx, {
        orderId,
        statusType: STORE_ORDER_TIMELINE_STATUS_TYPE.DELIVERY_STATUS,
        previousStatus: order.deliveryStatus,
        newStatus: STORE_DELIVERY_STATUS.PENDIENTE_PROGRAMACION,
        comment: `Programacion logistica cancelada. Motivo: ${input.reasonCode}.${input.comment ? ` Comentario: ${input.comment}.` : ''}`,
        createdByInternalUserId: actor.id,
        createdByRole: STORE_TIMELINE_ROLE.INTERNAL_USER,
      });
    });

    return this.getScheduleOrder(orderId);
  }

  private buildWhere(query: ListScheduleQuery) {
    const date = query.date ? this.parseDateString(query.date, 'La fecha no es valida.') : undefined;
    const deliveryStatus = query.deliveryStatus?.trim();
    const driverId = query.driverId?.trim();
    const order = query.order?.trim();
    const customer = query.customer?.trim();

    return {
      ...(date ? { confirmedDeliveryDate: this.dayRange(date) } : {}),
      ...(deliveryStatus ? { deliveryStatus } : {}),
      ...(driverId === 'none' ? { assignedDriverId: null } : driverId ? { assignedDriverId: driverId } : {}),
      ...(order ? { orderNumber: { contains: order, mode: 'insensitive' as const } } : {}),
      ...(customer
        ? {
            OR: [
              { customer: { fullName: { contains: customer, mode: 'insensitive' as const } } },
              { customer: { phone: { contains: customer } } },
              { customer: { code: { contains: customer, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    } satisfies Prisma.StoreOrderWhereInput;
  }

  private async buildCards() {
    const today = this.dateOnly(new Date());
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const [pendientes, hoy, manana, reprogramadas, asignadas, sinMensajero] = await Promise.all([
      this.prisma.storeOrder.count({ where: { deliveryStatus: STORE_DELIVERY_STATUS.PENDIENTE_PROGRAMACION } }),
      this.prisma.storeOrder.count({ where: { confirmedDeliveryDate: this.dayRange(today) } }),
      this.prisma.storeOrder.count({ where: { confirmedDeliveryDate: this.dayRange(tomorrow) } }),
      this.prisma.storeOrder.count({ where: { deliveryStatus: STORE_DELIVERY_STATUS.REPROGRAMADA } }),
      this.prisma.storeOrder.count({ where: { deliveryStatus: STORE_DELIVERY_STATUS.ASIGNADA } }),
      this.prisma.storeOrder.count({
        where: {
          orderStatus: { not: STORE_ORDER_STATUS.CANCELADO },
          confirmedDeliveryDate: { not: null },
          assignedDriverId: null,
        },
      }),
    ]);

    return { pendientes, hoy, manana, reprogramadas, asignadas, sinMensajero };
  }

  private async getScheduleOrder(orderId: string) {
    const order = await this.prisma.storeOrder.findUnique({
      where: { id: orderId },
      include: scheduleOrderInclude,
    });

    if (!order) {
      throw new NotFoundException('Pedido no encontrado.');
    }

    return this.toScheduleDto(order);
  }

  private async assertOrderExists(orderId: string) {
    const order = await this.prisma.storeOrder.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Pedido no encontrado.');
    }
    return order;
  }

  private assertOrderCanBeScheduled(order: { orderStatus: string; createdAt: Date }) {
    if (order.orderStatus === STORE_ORDER_STATUS.CANCELADO) {
      throw new BadRequestException('No se puede programar un pedido cancelado.');
    }
  }

  private assertOrderCanReceiveDriver(order: {
    orderStatus: string;
    deliveryStatus: string;
    confirmedDeliveryDate: Date | null;
    deliveryTimeRange: string | null;
  }) {
    if (order.orderStatus === STORE_ORDER_STATUS.CANCELADO) {
      throw new BadRequestException('No se puede asignar mensajero a un pedido cancelado.');
    }
    if (!order.confirmedDeliveryDate || !order.deliveryTimeRange) {
      throw new BadRequestException('El pedido debe tener fecha y rango horario confirmados.');
    }
    const blockedStatuses: string[] = [STORE_DELIVERY_STATUS.EN_RUTA, STORE_DELIVERY_STATUS.ENTREGADA];
    if (blockedStatuses.includes(order.deliveryStatus)) {
      throw new BadRequestException('No se puede modificar mensajero de un pedido en ruta o entregado.');
    }
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

  private parseDateString(value: string, message: string) {
    const date = new Date(`${value}T00:00:00`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(date.getTime())) {
      throw new BadRequestException(message);
    }
    return date;
  }

  private dateOnly(date: Date) {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  private dayRange(date: Date) {
    const start = this.dateOnly(date);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);
    return { gte: start, lt: end };
  }

  private formatDate(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  private toScheduleDto(order: Prisma.StoreOrderGetPayload<{ include: typeof scheduleOrderInclude }>) {
    const activePayment = order.payments[0] ?? null;
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      orderStatus: order.orderStatus,
      deliveryStatus: order.deliveryStatus,
      clientPaymentStatus: order.clientPaymentStatus,
      paymentMethodRequested: order.paymentMethodRequested,
      totalAmount: Number(order.totalAmount),
      suggestedDeliveryDate: order.suggestedDeliveryDate,
      confirmedDeliveryDate: order.confirmedDeliveryDate,
      deliveryTimeRange: order.deliveryTimeRange,
      createdAt: order.createdAt,
      customer: order.customer,
      assignedDriver: order.assignedDriver,
      activePayment: activePayment
        ? {
            id: activePayment.id,
            paymentMethod: activePayment.paymentMethod,
            paymentStatus: activePayment.paymentStatus,
            amount: Number(activePayment.amount),
          }
        : null,
    };
  }
}
