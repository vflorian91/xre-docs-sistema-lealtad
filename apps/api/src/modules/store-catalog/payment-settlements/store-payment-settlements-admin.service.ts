import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { InternalAuthUser } from '../../auth/auth.types';
import { PrismaService } from '../../database/prisma.service';
import { StoreOrderTimelineService } from '../order/store-order-timeline.service';
import { STORE_ORDER_TIMELINE_STATUS_TYPE, STORE_PAYMENT_STATUS, STORE_SETTLEMENT_STATUS, STORE_TIMELINE_ROLE } from '../order/store-order.constants';
import { StorePaymentSettlementNumberService } from './store-payment-settlement-number.service';
import { STORE_PAYMENT_SETTLEMENT_STATUS, STORE_SETTLEMENT_ELIGIBLE_PAYMENT_METHODS } from './store-payment-settlement.constants';
import {
  AnnulStorePaymentSettlementInput,
  CreateStorePaymentSettlementInput,
  MarkStorePaymentSettlementIncidentInput,
  ReleaseStorePaymentSettlementIncidentInput,
} from './store-payment-settlement.schemas';

type ListQuery = Record<string, string | undefined>;

const orderSelectForPayment = {
  id: true,
  orderNumber: true,
  totalAmount: true,
  confirmedDeliveryDate: true,
  customer: { select: { id: true, fullName: true, phone: true } },
  assignedDriver: { select: { id: true, fullName: true } },
};

@Injectable()
export class StorePaymentSettlementsAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numberService: StorePaymentSettlementNumberService,
    private readonly timelineService: StoreOrderTimelineService,
  ) {}

  async getSummary() {
    const eligible = [...STORE_SETTLEMENT_ELIGIBLE_PAYMENT_METHODS];
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const pendingWhere: Prisma.StoreOrderPaymentWhereInput = {
      paymentStatus: STORE_PAYMENT_STATUS.PAGO_CONFIRMADO,
      settlementStatus: STORE_SETTLEMENT_STATUS.PENDIENTE_LIQUIDAR,
      paymentMethod: { in: eligible },
    };

    const [pendingAggregate, pendingByMethod, settledThisMonth, activeSettlementsThisMonth, incidentsCount] = await Promise.all([
      this.prisma.storeOrderPayment.aggregate({ where: pendingWhere, _sum: { amount: true }, _count: true }),
      this.prisma.storeOrderPayment.groupBy({ by: ['paymentMethod'], where: pendingWhere, _sum: { amount: true } }),
      this.prisma.storeOrderPayment.aggregate({
        where: { settlementStatus: STORE_SETTLEMENT_STATUS.LIQUIDADO, settledAt: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      this.prisma.storePaymentSettlement.count({
        where: { status: STORE_PAYMENT_SETTLEMENT_STATUS.ACTIVA, createdAt: { gte: startOfMonth } },
      }),
      this.prisma.storeOrderPayment.count({ where: { settlementStatus: STORE_SETTLEMENT_STATUS.CON_INCIDENCIA } }),
    ]);

    const pendingByMethodMap = new Map(pendingByMethod.map((row) => [row.paymentMethod, Number(row._sum.amount ?? 0)]));

    return {
      totalPendingAmount: Number(pendingAggregate._sum.amount ?? 0),
      totalPendingCount: pendingAggregate._count,
      pendingEfectivo: pendingByMethodMap.get('EFECTIVO_CONTRA_ENTREGA') ?? 0,
      pendingVisaLink: pendingByMethodMap.get('VISA_LINK_MANUAL') ?? 0,
      pendingTransferencia: pendingByMethodMap.get('TRANSFERENCIA_BANCARIA') ?? 0,
      pendingDeposito: pendingByMethodMap.get('DEPOSITO_BANCARIO') ?? 0,
      totalSettledThisMonth: Number(settledThisMonth._sum.amount ?? 0),
      activeSettlementsThisMonth,
      incidentsCount,
    };
  }

  async listPending(query: ListQuery = {}) {
    const eligible = [...STORE_SETTLEMENT_ELIGIBLE_PAYMENT_METHODS];
    const paymentMethod = query.paymentMethod?.trim();
    const dateFrom = this.parseOptionalDate(query.dateFrom);
    const dateTo = this.parseOptionalDate(query.dateTo);
    const search = query.search?.trim();
    const driverId = query.driverId?.trim();

    const where: Prisma.StoreOrderPaymentWhereInput = {
      paymentStatus: STORE_PAYMENT_STATUS.PAGO_CONFIRMADO,
      settlementStatus: STORE_SETTLEMENT_STATUS.PENDIENTE_LIQUIDAR,
      paymentMethod: { in: paymentMethod ? [paymentMethod] : eligible },
      ...(dateFrom || dateTo ? { paidAt: { ...(dateFrom ? { gte: dateFrom } : {}), ...(dateTo ? { lte: dateTo } : {}) } } : {}),
      ...(driverId ? { order: { assignedDriverId: driverId } } : {}),
      ...(search
        ? {
            OR: [
              { order: { orderNumber: { contains: search, mode: 'insensitive' } } },
              { order: { customer: { fullName: { contains: search, mode: 'insensitive' } } } },
              { referenceNumber: { contains: search, mode: 'insensitive' } },
              { authorizationCode: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const payments = await this.prisma.storeOrderPayment.findMany({
      where,
      orderBy: { paidAt: 'asc' },
      include: { order: { select: orderSelectForPayment } },
    });

    return payments.map((payment) => this.toPendingDto(payment));
  }

  async listAdmin(query: ListQuery = {}) {
    const page = this.parsePositiveInt(query.page, 1);
    const limit = Math.min(this.parsePositiveInt(query.limit, 10), 50);
    const skip = (page - 1) * limit;
    const status = query.status?.trim();
    const paymentMethod = query.paymentMethod?.trim();
    const search = query.search?.trim();
    const dateFrom = this.parseOptionalDate(query.dateFrom);
    const dateTo = this.parseOptionalDate(query.dateTo);

    const where: Prisma.StorePaymentSettlementWhereInput = {
      ...(status ? { status } : {}),
      ...(paymentMethod ? { paymentMethod } : {}),
      ...(dateFrom || dateTo ? { settlementDate: { ...(dateFrom ? { gte: dateFrom } : {}), ...(dateTo ? { lte: dateTo } : {}) } } : {}),
      ...(search
        ? { OR: [{ settlementNumber: { contains: search, mode: 'insensitive' } }, { reference: { contains: search, mode: 'insensitive' } }] }
        : {}),
    };

    const [settlements, total] = await Promise.all([
      this.prisma.storePaymentSettlement.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      this.prisma.storePaymentSettlement.count({ where }),
    ]);

    const userNames = await this.collectUserNames(settlements);

    return {
      data: settlements.map((settlement) => this.toListDto(settlement, userNames)),
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  async getAdmin(settlementId: string) {
    const settlement = await this.prisma.storePaymentSettlement.findUnique({
      where: { id: settlementId },
      include: {
        items: {
          include: { order: { select: orderSelectForPayment }, payment: { select: { receiptFileUrl: true, receiptFileName: true } } },
        },
      },
    });

    if (!settlement) {
      throw new NotFoundException('Liquidacion no encontrada.');
    }

    const userNames = await this.collectUserNames([settlement]);
    return this.toDetailDto(settlement, userNames);
  }

  async create(input: CreateStorePaymentSettlementInput, actor: InternalAuthUser) {
    const eligible = [...STORE_SETTLEMENT_ELIGIBLE_PAYMENT_METHODS];
    const uniqueIds = Array.from(new Set(input.paymentIds));

    const payments = await this.prisma.storeOrderPayment.findMany({
      where: { id: { in: uniqueIds } },
      include: { order: { select: { id: true, orderStatus: true } } },
    });

    if (payments.length !== uniqueIds.length) {
      throw new BadRequestException('Uno o mas pagos seleccionados no existen.');
    }

    for (const payment of payments) {
      if (!eligible.includes(payment.paymentMethod as (typeof eligible)[number])) {
        throw new BadRequestException(`El metodo de pago "${payment.paymentMethod}" no es elegible para liquidacion.`);
      }
      if (payment.paymentStatus !== STORE_PAYMENT_STATUS.PAGO_CONFIRMADO) {
        throw new BadRequestException('Todos los pagos deben estar confirmados.');
      }
      if (payment.settlementStatus !== STORE_SETTLEMENT_STATUS.PENDIENTE_LIQUIDAR) {
        throw new BadRequestException('Todos los pagos deben estar pendientes de liquidar.');
      }
      if (payment.settlementId) {
        throw new BadRequestException('Uno o mas pagos ya pertenecen a otra liquidacion.');
      }
    }

    const totalAmount = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const distinctMethods = new Set(payments.map((payment) => payment.paymentMethod));
    const headerPaymentMethod = distinctMethods.size === 1 ? payments[0].paymentMethod : null;

    const settlement = await this.prisma.$transaction(async (tx) => {
      const settlementNumber = await this.numberService.nextSettlementNumber(tx, input.settlementDate);

      const created = await tx.storePaymentSettlement.create({
        data: {
          settlementNumber,
          settlementDate: input.settlementDate,
          paymentMethod: headerPaymentMethod,
          totalPayments: payments.length,
          totalAmount,
          status: STORE_PAYMENT_SETTLEMENT_STATUS.ACTIVA,
          reference: input.reference ?? null,
          comment: input.comment ?? null,
          createdByInternalUserId: actor.id,
        },
      });

      await tx.storePaymentSettlementItem.createMany({
        data: payments.map((payment) => ({
          settlementId: created.id,
          paymentId: payment.id,
          orderId: payment.orderId,
          amount: payment.amount,
          paymentMethod: payment.paymentMethod,
          authorizationCode: payment.authorizationCode,
          voucherNumber: payment.voucherNumber,
          referenceNumber: payment.referenceNumber,
          paidAt: payment.paidAt,
        })),
      });

      for (const payment of payments) {
        await tx.storeOrderPayment.update({
          where: { id: payment.id },
          data: {
            settlementStatus: STORE_SETTLEMENT_STATUS.LIQUIDADO,
            settlementId: created.id,
            settledAt: new Date(),
            settledByInternalUserId: actor.id,
          },
        });

        await this.timelineService.registerEvent(tx, {
          orderId: payment.orderId,
          statusType: STORE_ORDER_TIMELINE_STATUS_TYPE.PAYMENT_STATUS,
          previousStatus: STORE_SETTLEMENT_STATUS.PENDIENTE_LIQUIDAR,
          newStatus: STORE_SETTLEMENT_STATUS.LIQUIDADO,
          comment: `Pago incluido en la liquidacion ${settlementNumber}.`,
          createdByInternalUserId: actor.id,
          createdByRole: STORE_TIMELINE_ROLE.INTERNAL_USER,
        });
      }

      return created;
    });

    return this.getAdmin(settlement.id);
  }

  async annul(settlementId: string, input: AnnulStorePaymentSettlementInput, actor: InternalAuthUser) {
    const settlement = await this.prisma.storePaymentSettlement.findUnique({
      where: { id: settlementId },
      include: { items: true },
    });

    if (!settlement) {
      throw new NotFoundException('Liquidacion no encontrada.');
    }

    if (settlement.status !== STORE_PAYMENT_SETTLEMENT_STATUS.ACTIVA) {
      throw new BadRequestException('Solo se puede anular una liquidacion activa.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.storePaymentSettlement.update({
        where: { id: settlementId },
        data: {
          status: STORE_PAYMENT_SETTLEMENT_STATUS.ANULADA,
          annulledByInternalUserId: actor.id,
          annulledAt: new Date(),
          annulmentReason: input.annulmentReason,
        },
      });

      for (const item of settlement.items) {
        await tx.storeOrderPayment.update({
          where: { id: item.paymentId },
          data: {
            settlementStatus: STORE_SETTLEMENT_STATUS.PENDIENTE_LIQUIDAR,
            settlementId: null,
            settledAt: null,
            settledByInternalUserId: null,
          },
        });

        await this.timelineService.registerEvent(tx, {
          orderId: item.orderId,
          statusType: STORE_ORDER_TIMELINE_STATUS_TYPE.PAYMENT_STATUS,
          previousStatus: STORE_SETTLEMENT_STATUS.LIQUIDADO,
          newStatus: STORE_SETTLEMENT_STATUS.PENDIENTE_LIQUIDAR,
          comment: `Liquidacion ${settlement.settlementNumber} anulada. Motivo: ${input.annulmentReason}.`,
          createdByInternalUserId: actor.id,
          createdByRole: STORE_TIMELINE_ROLE.INTERNAL_USER,
        });
      }
    });

    return this.getAdmin(settlementId);
  }

  async markIncident(paymentId: string, input: MarkStorePaymentSettlementIncidentInput, actor: InternalAuthUser) {
    const payment = await this.assertPayment(paymentId);

    if (payment.settlementStatus !== STORE_SETTLEMENT_STATUS.PENDIENTE_LIQUIDAR) {
      throw new BadRequestException('Solo se puede marcar incidencia en pagos pendientes de liquidar.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.storeOrderPayment.update({
        where: { id: paymentId },
        data: { settlementStatus: STORE_SETTLEMENT_STATUS.CON_INCIDENCIA },
      });

      await this.timelineService.registerEvent(tx, {
        orderId: payment.orderId,
        statusType: STORE_ORDER_TIMELINE_STATUS_TYPE.PAYMENT_STATUS,
        previousStatus: STORE_SETTLEMENT_STATUS.PENDIENTE_LIQUIDAR,
        newStatus: STORE_SETTLEMENT_STATUS.CON_INCIDENCIA,
        comment: `Motivo: ${input.reasonCode}.${input.comment ? ` Comentario: ${input.comment}.` : ''}`,
        createdByInternalUserId: actor.id,
        createdByRole: STORE_TIMELINE_ROLE.INTERNAL_USER,
      });
    });

    return { success: true };
  }

  async releaseIncident(paymentId: string, input: ReleaseStorePaymentSettlementIncidentInput, actor: InternalAuthUser) {
    const payment = await this.assertPayment(paymentId);

    if (payment.settlementStatus !== STORE_SETTLEMENT_STATUS.CON_INCIDENCIA) {
      throw new BadRequestException('Solo se puede liberar un pago que esta en incidencia.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.storeOrderPayment.update({
        where: { id: paymentId },
        data: { settlementStatus: STORE_SETTLEMENT_STATUS.PENDIENTE_LIQUIDAR },
      });

      await this.timelineService.registerEvent(tx, {
        orderId: payment.orderId,
        statusType: STORE_ORDER_TIMELINE_STATUS_TYPE.PAYMENT_STATUS,
        previousStatus: STORE_SETTLEMENT_STATUS.CON_INCIDENCIA,
        newStatus: STORE_SETTLEMENT_STATUS.PENDIENTE_LIQUIDAR,
        comment: input.comment ?? 'Incidencia liberada por el administrador.',
        createdByInternalUserId: actor.id,
        createdByRole: STORE_TIMELINE_ROLE.INTERNAL_USER,
      });
    });

    return { success: true };
  }

  async exportCsv(type: 'pending' | 'settlements', query: ListQuery = {}) {
    if (type === 'pending') {
      const rows = await this.listPending(query);
      const header = ['Pedido', 'Cliente', 'Metodo', 'Monto', 'Referencia', 'Autorizacion', 'Mensajero', 'Fecha de pago'];
      const lines = rows.map((row) =>
        [row.orderNumber, row.customer.fullName, row.paymentMethod, row.amount, row.referenceNumber ?? '', row.authorizationCode ?? '', row.driver?.fullName ?? '', row.paidAt ?? '']
          .map((value) => this.csvEscape(value))
          .join(','),
      );
      return [header.join(','), ...lines].join('\n');
    }

    const result = await this.listAdmin({ ...query, limit: '1000', page: '1' });
    const header = ['No. liquidacion', 'Fecha', 'Metodo', 'Cantidad de pagos', 'Monto total', 'Estado', 'Creado por'];
    const lines = result.data.map((row) =>
      [row.settlementNumber, row.settlementDate, row.paymentMethod ?? 'Mixto', row.totalPayments, row.totalAmount, row.status, row.createdByName ?? '']
        .map((value) => this.csvEscape(value))
        .join(','),
    );
    return [header.join(','), ...lines].join('\n');
  }

  private csvEscape(value: unknown) {
    const text = value === null || value === undefined ? '' : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  private async assertPayment(paymentId: string) {
    const payment = await this.prisma.storeOrderPayment.findUnique({ where: { id: paymentId } });
    if (!payment) {
      throw new NotFoundException('Pago no encontrado.');
    }
    return payment;
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

  private async collectUserNames(settlements: Array<{ createdByInternalUserId: string | null; annulledByInternalUserId: string | null }>) {
    const ids = new Set<string>();
    for (const settlement of settlements) {
      if (settlement.createdByInternalUserId) ids.add(settlement.createdByInternalUserId);
      if (settlement.annulledByInternalUserId) ids.add(settlement.annulledByInternalUserId);
    }
    if (ids.size === 0) return new Map<string, string>();

    const users = await this.prisma.internalUser.findMany({ where: { id: { in: Array.from(ids) } }, select: { id: true, fullName: true } });
    return new Map(users.map((user) => [user.id, user.fullName]));
  }

  private toPendingDto(payment: {
    id: string;
    orderId: string;
    paymentMethod: string;
    amount: Prisma.Decimal;
    referenceNumber: string | null;
    authorizationCode: string | null;
    voucherNumber: string | null;
    paidAt: Date | null;
    order: {
      id: string;
      orderNumber: string;
      confirmedDeliveryDate: Date | null;
      customer: { id: string; fullName: string; phone: string };
      assignedDriver: { id: string; fullName: string } | null;
    };
  }) {
    return {
      paymentId: payment.id,
      orderId: payment.orderId,
      orderNumber: payment.order.orderNumber,
      customer: payment.order.customer,
      driver: payment.order.assignedDriver,
      confirmedDeliveryDate: payment.order.confirmedDeliveryDate,
      paymentMethod: payment.paymentMethod,
      amount: Number(payment.amount),
      referenceNumber: payment.referenceNumber,
      authorizationCode: payment.authorizationCode,
      voucherNumber: payment.voucherNumber,
      paidAt: payment.paidAt,
    };
  }

  private toListDto(
    settlement: {
      id: string;
      settlementNumber: string;
      settlementDate: Date;
      paymentMethod: string | null;
      totalPayments: number;
      totalAmount: Prisma.Decimal;
      status: string;
      createdByInternalUserId: string | null;
      createdAt: Date;
    },
    userNames: Map<string, string>,
  ) {
    return {
      id: settlement.id,
      settlementNumber: settlement.settlementNumber,
      settlementDate: settlement.settlementDate,
      paymentMethod: settlement.paymentMethod,
      totalPayments: settlement.totalPayments,
      totalAmount: Number(settlement.totalAmount),
      status: settlement.status,
      createdByName: settlement.createdByInternalUserId ? userNames.get(settlement.createdByInternalUserId) ?? null : null,
      createdAt: settlement.createdAt,
    };
  }

  private toDetailDto(
    settlement: {
      id: string;
      settlementNumber: string;
      settlementDate: Date;
      paymentMethod: string | null;
      totalPayments: number;
      totalAmount: Prisma.Decimal;
      status: string;
      reference: string | null;
      comment: string | null;
      createdByInternalUserId: string | null;
      annulledByInternalUserId: string | null;
      annulledAt: Date | null;
      annulmentReason: string | null;
      createdAt: Date;
      items: Array<{
        id: string;
        paymentId: string;
        orderId: string;
        amount: Prisma.Decimal;
        paymentMethod: string;
        authorizationCode: string | null;
        voucherNumber: string | null;
        referenceNumber: string | null;
        paidAt: Date | null;
        order: {
          id: string;
          orderNumber: string;
          customer: { id: string; fullName: string; phone: string };
          assignedDriver: { id: string; fullName: string } | null;
        };
        payment: { receiptFileUrl: string | null; receiptFileName: string | null };
      }>;
    },
    userNames: Map<string, string>,
  ) {
    return {
      id: settlement.id,
      settlementNumber: settlement.settlementNumber,
      settlementDate: settlement.settlementDate,
      paymentMethod: settlement.paymentMethod,
      totalPayments: settlement.totalPayments,
      totalAmount: Number(settlement.totalAmount),
      status: settlement.status,
      reference: settlement.reference,
      comment: settlement.comment,
      createdByName: settlement.createdByInternalUserId ? userNames.get(settlement.createdByInternalUserId) ?? null : null,
      annulledByName: settlement.annulledByInternalUserId ? userNames.get(settlement.annulledByInternalUserId) ?? null : null,
      annulledAt: settlement.annulledAt,
      annulmentReason: settlement.annulmentReason,
      createdAt: settlement.createdAt,
      items: settlement.items.map((item) => ({
        id: item.id,
        orderId: item.orderId,
        orderNumber: item.order.orderNumber,
        customer: item.order.customer,
        driver: item.order.assignedDriver,
        amount: Number(item.amount),
        paymentMethod: item.paymentMethod,
        authorizationCode: item.authorizationCode,
        voucherNumber: item.voucherNumber,
        referenceNumber: item.referenceNumber,
        paidAt: item.paidAt,
        receiptFileUrl: item.payment.receiptFileUrl,
        receiptFileName: item.payment.receiptFileName,
      })),
    };
  }
}
