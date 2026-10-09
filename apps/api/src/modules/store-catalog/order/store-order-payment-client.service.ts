import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CustomerAuthUser } from '../../auth/auth.types';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { StoreBankAccountsService } from '../bank-accounts/store-bank-accounts.service';
import { StoreOrdersService } from './store-orders.service';
import { StoreOrderTimelineService } from './store-order-timeline.service';
import { RegisterCashInput, ReportDepositInput, ReportTransferInput, ReportVisaLinkInput } from './store-order-payment-client.schemas';
import {
  STORE_CLIENT_VISIBLE_LABELS,
  STORE_ORDER_TIMELINE_STATUS_TYPE,
  STORE_PAYMENT_METHOD,
  STORE_PAYMENT_STATUS,
  STORE_TIMELINE_ROLE,
  mapClientVisibleStatus,
} from './store-order.constants';

type ReportContext = {
  method: typeof STORE_PAYMENT_METHOD.DEPOSITO_BANCARIO | typeof STORE_PAYMENT_METHOD.TRANSFERENCIA_BANCARIA;
  voucherNumber?: string;
  authorizationCode?: string;
};

@Injectable()
export class StoreOrderPaymentClientService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bankAccountsService: StoreBankAccountsService,
    private readonly timelineService: StoreOrderTimelineService,
    private readonly notificationsService: NotificationsService,
    private readonly ordersService: StoreOrdersService,
  ) {}

  reportDeposit(customer: CustomerAuthUser, orderId: string, input: ReportDepositInput) {
    return this.report(customer, orderId, input, {
      method: STORE_PAYMENT_METHOD.DEPOSITO_BANCARIO,
      voucherNumber: input.depositSlipNumber,
    });
  }

  reportTransfer(customer: CustomerAuthUser, orderId: string, input: ReportTransferInput) {
    return this.report(customer, orderId, input, {
      method: STORE_PAYMENT_METHOD.TRANSFERENCIA_BANCARIA,
      authorizationCode: input.authorizationNumber,
    });
  }

  /** Visa Link: el cliente solicita el enlace de pago. No aprueba nada; notifica al admin. */
  async requestVisaLink(customer: CustomerAuthUser, orderId: string) {
    const { order, payment } = await this.loadOwnedOrderPayment(customer, orderId);
    if (payment.paymentMethod !== STORE_PAYMENT_METHOD.VISA_LINK_MANUAL) {
      throw new BadRequestException('Este pedido no usa Visa Link como método de pago.');
    }
    if (payment.paymentStatus === STORE_PAYMENT_STATUS.PAGO_CONFIRMADO) {
      throw new BadRequestException('El pago de este pedido ya fue aprobado.');
    }
    // Idempotente: si ya fue solicitado o enviado, devolvemos el estado actual.
    if (
      payment.paymentStatus === STORE_PAYMENT_STATUS.VISA_LINK_SOLICITADO ||
      payment.paymentStatus === STORE_PAYMENT_STATUS.LINK_ENVIADO
    ) {
      return this.ordersService.getOrder(customer, orderId);
    }

    const previous = payment.paymentStatus;
    await this.prisma.$transaction(async (tx) => {
      await tx.storeOrderPayment.update({
        where: { id: payment.id },
        data: { paymentStatus: STORE_PAYMENT_STATUS.VISA_LINK_SOLICITADO, visaLinkRequestedAt: new Date() },
      });
      await tx.storeOrder.update({
        where: { id: orderId },
        data: { clientPaymentStatus: STORE_PAYMENT_STATUS.VISA_LINK_SOLICITADO },
      });
      await this.timelineService.registerEvent(tx, {
        orderId,
        statusType: STORE_ORDER_TIMELINE_STATUS_TYPE.PAYMENT_STATUS,
        previousStatus: previous,
        newStatus: STORE_PAYMENT_STATUS.VISA_LINK_SOLICITADO,
        comment: 'VISA_LINK_REQUESTED · El cliente solicitó el enlace de pago.',
        createdByClientId: customer.id,
        createdByRole: STORE_TIMELINE_ROLE.CLIENT,
      });
    });

    await this.notificationsService
      .notifySystemInternal(
        'Visa Link solicitado',
        `${order.customer.fullName} solicitó el Visa Link del pedido ${order.orderNumber}. Genera y envía el enlace de pago.`,
        { event: 'store.visa_link_requested', orderId, orderNumber: order.orderNumber },
        'WARNING',
      )
      .catch(() => undefined);

    return this.ordersService.getOrder(customer, orderId);
  }

  /** Visa Link: el cliente consulta el enlace (solo si ya fue enviado) y el estado. */
  async getVisaLink(customer: CustomerAuthUser, orderId: string) {
    const { order, payment } = await this.loadOwnedOrderPayment(customer, orderId);
    const visibleStatus = mapClientVisibleStatus({
      orderStatus: order.orderStatus,
      paymentStatus: order.clientPaymentStatus,
      deliveryStatus: order.deliveryStatus,
    });
    const sent = payment.paymentStatus === STORE_PAYMENT_STATUS.LINK_ENVIADO;
    return {
      paymentStatus: payment.paymentStatus,
      visaLinkUrl: sent ? payment.visaLinkUrl : null,
      visaLinkSentAt: payment.visaLinkSentAt,
      visaLinkRequestedAt: payment.visaLinkRequestedAt,
      clientVisibleStatus: visibleStatus,
      clientVisibleLabel: STORE_CLIENT_VISIBLE_LABELS[visibleStatus],
    };
  }

  /** Visa Link: el cliente reporta su pago (comprobante + autorización). No aprueba. */
  async reportVisaLink(customer: CustomerAuthUser, orderId: string, input: ReportVisaLinkInput) {
    const { order, payment } = await this.loadOwnedOrderPayment(customer, orderId);
    if (payment.paymentMethod !== STORE_PAYMENT_METHOD.VISA_LINK_MANUAL) {
      throw new BadRequestException('Este pedido no usa Visa Link como método de pago.');
    }
    if (payment.paymentStatus === STORE_PAYMENT_STATUS.PAGO_CONFIRMADO) {
      throw new BadRequestException('El pago de este pedido ya fue aprobado.');
    }
    if (
      payment.paymentStatus !== STORE_PAYMENT_STATUS.LINK_ENVIADO &&
      payment.paymentStatus !== STORE_PAYMENT_STATUS.COMPROBANTE_ENVIADO &&
      payment.paymentStatus !== STORE_PAYMENT_STATUS.PAGO_RECHAZADO
    ) {
      throw new BadRequestException('Aún no puedes reportar el pago: espera a que te enviemos el Visa Link.');
    }

    const previous = payment.paymentStatus;
    await this.prisma.$transaction(async (tx) => {
      await tx.storeOrderPayment.update({
        where: { id: payment.id },
        data: {
          paymentStatus: STORE_PAYMENT_STATUS.COMPROBANTE_ENVIADO,
          receiptFileUrl: input.receiptFileUrl,
          receiptFileName: input.receiptFileName ?? null,
          receiptUploadedAt: new Date(),
          authorizationCode: input.authorizationNumber,
          reportedByCustomerAt: new Date(),
          rejectionReason: null,
          notes: input.notes ?? payment.notes,
        },
      });
      await tx.storeOrder.update({
        where: { id: orderId },
        data: { clientPaymentStatus: STORE_PAYMENT_STATUS.COMPROBANTE_ENVIADO },
      });
      await this.timelineService.registerEvent(tx, {
        orderId,
        statusType: STORE_ORDER_TIMELINE_STATUS_TYPE.PAYMENT_STATUS,
        previousStatus: previous,
        newStatus: STORE_PAYMENT_STATUS.COMPROBANTE_ENVIADO,
        comment: `VISA_LINK_PAYMENT_REPORTED_BY_CUSTOMER · PAYMENT_PROOF_UPLOADED · autorización ${input.authorizationNumber}`,
        createdByClientId: customer.id,
        createdByRole: STORE_TIMELINE_ROLE.CLIENT,
      });
    });

    await this.notificationsService
      .notifySystemInternal(
        'Pago Visa Link reportado',
        `${order.customer.fullName} reportó el pago Visa Link del pedido ${order.orderNumber}. Revisa el comprobante para aprobar o rechazar.`,
        { event: 'store.visa_link_payment_reported', orderId, orderNumber: order.orderNumber },
        'WARNING',
      )
      .catch(() => undefined);

    return this.ordersService.getOrder(customer, orderId);
  }

  /**
   * Efectivo contra entrega: el cliente reporta cuánto efectivo tendrá disponible al recibir.
   * NO es un pago recibido ni aprobado: queda en CONTRA_ENTREGA_PENDIENTE para coordinación.
   */
  async registerCashPayment(customer: CustomerAuthUser, orderId: string, input: RegisterCashInput) {
    const { order, payment } = await this.loadOwnedOrderPayment(customer, orderId);
    if (payment.paymentMethod !== STORE_PAYMENT_METHOD.EFECTIVO_CONTRA_ENTREGA) {
      throw new BadRequestException('Este pedido no usa efectivo contra entrega como método de pago.');
    }
    if (payment.paymentStatus === STORE_PAYMENT_STATUS.PAGO_CONFIRMADO) {
      throw new BadRequestException('El pago de este pedido ya fue aprobado.');
    }
    if (payment.paymentStatus === STORE_PAYMENT_STATUS.COMPROBANTE_ENVIADO) {
      throw new BadRequestException('Este pedido tiene un comprobante bancario en revisión. No puedes cambiar a efectivo.');
    }

    const previous = payment.paymentStatus;
    await this.prisma.$transaction(async (tx) => {
      await tx.storeOrderPayment.update({
        where: { id: payment.id },
        data: {
          paymentMethod: STORE_PAYMENT_METHOD.EFECTIVO_CONTRA_ENTREGA,
          paymentStatus: STORE_PAYMENT_STATUS.CONTRA_ENTREGA_PENDIENTE,
          cashAvailableAmount: input.cashAvailableAmount,
          reportedByCustomerAt: new Date(),
          notes: input.notes ?? payment.notes,
        },
      });
      await tx.storeOrder.update({
        where: { id: orderId },
        data: { clientPaymentStatus: STORE_PAYMENT_STATUS.CONTRA_ENTREGA_PENDIENTE },
      });
      await this.timelineService.registerEvent(tx, {
        orderId,
        statusType: STORE_ORDER_TIMELINE_STATUS_TYPE.PAYMENT_STATUS,
        previousStatus: previous,
        newStatus: STORE_PAYMENT_STATUS.CONTRA_ENTREGA_PENDIENTE,
        comment: `CASH_PAYMENT_REGISTERED · CASH_PAYMENT_PENDING_DELIVERY · efectivo disponible Q${input.cashAvailableAmount}`,
        createdByClientId: customer.id,
        createdByRole: STORE_TIMELINE_ROLE.CLIENT,
      });
    });

    await this.notificationsService
      .notifySystemInternal(
        'Pago en efectivo registrado',
        `${order.customer.fullName} pagará en efectivo contra entrega el pedido ${order.orderNumber} (efectivo disponible Q${input.cashAvailableAmount}). Programa la entrega.`,
        { event: 'store.cash_payment_registered', orderId, orderNumber: order.orderNumber, cashAvailableAmount: input.cashAvailableAmount },
        'INFO',
      )
      .catch(() => undefined);

    return this.ordersService.getOrder(customer, orderId);
  }

  private async loadOwnedOrderPayment(customer: CustomerAuthUser, orderId: string) {
    const order = await this.prisma.storeOrder.findFirst({
      where: { id: orderId, customerId: customer.id },
      include: { payments: { orderBy: { createdAt: 'desc' }, take: 1 }, customer: { select: { fullName: true } } },
    });
    if (!order) {
      throw new NotFoundException('Pedido no encontrado.');
    }
    if (order.orderStatus === 'CANCELADO') {
      throw new BadRequestException('No puedes gestionar el pago de un pedido cancelado.');
    }
    const payment = order.payments[0];
    if (!payment) {
      throw new BadRequestException('Este pedido no tiene un registro de pago.');
    }
    return { order, payment };
  }

  private async report(
    customer: CustomerAuthUser,
    orderId: string,
    input: ReportDepositInput | ReportTransferInput,
    context: ReportContext,
  ) {
    const order = await this.prisma.storeOrder.findFirst({
      where: { id: orderId, customerId: customer.id },
      include: { payments: { orderBy: { createdAt: 'desc' }, take: 1 }, customer: { select: { fullName: true } } },
    });
    if (!order) {
      throw new NotFoundException('Pedido no encontrado.');
    }
    if (order.orderStatus === 'CANCELADO') {
      throw new BadRequestException('No puedes reportar el pago de un pedido cancelado.');
    }
    if (order.paymentMethodRequested !== context.method) {
      throw new BadRequestException(
        context.method === STORE_PAYMENT_METHOD.DEPOSITO_BANCARIO
          ? 'El método de pago de este pedido no es depósito bancario.'
          : 'El método de pago de este pedido no es transferencia bancaria.',
      );
    }

    const payment = order.payments[0];
    if (!payment) {
      throw new BadRequestException('Este pedido no tiene un registro de pago.');
    }
    if (payment.paymentStatus === STORE_PAYMENT_STATUS.PAGO_CONFIRMADO) {
      throw new BadRequestException('El pago de este pedido ya fue aprobado.');
    }

    const account = await this.bankAccountsService.getActiveOrThrow(input.selectedBankAccountId);
    const previousPaymentStatus = payment.paymentStatus;

    await this.prisma.$transaction(async (tx) => {
      await tx.storeOrderPayment.update({
        where: { id: payment.id },
        data: {
          paymentStatus: STORE_PAYMENT_STATUS.COMPROBANTE_ENVIADO,
          selectedBankAccountId: account.id,
          bankNameSnapshot: account.bankName,
          accountHolderSnapshot: account.accountHolder,
          accountNumberSnapshot: account.accountNumber,
          accountTypeSnapshot: account.accountType,
          receiptFileUrl: input.receiptFileUrl,
          receiptFileName: input.receiptFileName ?? null,
          receiptUploadedAt: new Date(),
          voucherNumber: context.voucherNumber ?? payment.voucherNumber,
          authorizationCode: context.authorizationCode ?? payment.authorizationCode,
          reportedByCustomerAt: new Date(),
          // Si venía rechazado, limpiamos el motivo al reintentar.
          rejectionReason: null,
          notes: input.notes ?? payment.notes,
        },
      });

      await tx.storeOrder.update({
        where: { id: orderId },
        data: { clientPaymentStatus: STORE_PAYMENT_STATUS.COMPROBANTE_ENVIADO },
      });

      await this.timelineService.registerEvent(tx, {
        orderId,
        statusType: STORE_ORDER_TIMELINE_STATUS_TYPE.PAYMENT_STATUS,
        previousStatus: previousPaymentStatus,
        newStatus: STORE_PAYMENT_STATUS.COMPROBANTE_ENVIADO,
        comment: `BANK_ACCOUNT_SELECTED · ${account.bankName} (${account.accountNumber})`,
        createdByClientId: customer.id,
        createdByRole: STORE_TIMELINE_ROLE.CLIENT,
      });
      await this.timelineService.registerEvent(tx, {
        orderId,
        statusType: STORE_ORDER_TIMELINE_STATUS_TYPE.PAYMENT_STATUS,
        previousStatus: previousPaymentStatus,
        newStatus: STORE_PAYMENT_STATUS.COMPROBANTE_ENVIADO,
        comment: `PAYMENT_PROOF_UPLOADED · ${input.receiptFileName ?? 'comprobante'}`,
        createdByClientId: customer.id,
        createdByRole: STORE_TIMELINE_ROLE.CLIENT,
      });
      await this.timelineService.registerEvent(tx, {
        orderId,
        statusType: STORE_ORDER_TIMELINE_STATUS_TYPE.PAYMENT_STATUS,
        previousStatus: previousPaymentStatus,
        newStatus: STORE_PAYMENT_STATUS.COMPROBANTE_ENVIADO,
        comment: `PAYMENT_REPORTED_BY_CUSTOMER · ${context.method}${context.voucherNumber ? ` · boleta ${context.voucherNumber}` : ''}${context.authorizationCode ? ` · autorización ${context.authorizationCode}` : ''}`,
        createdByClientId: customer.id,
        createdByRole: STORE_TIMELINE_ROLE.CLIENT,
      });
    });

    await this.notificationsService
      .notifySystemInternal(
        'Pago reportado por cliente',
        `${order.customer.fullName} reportó el pago del pedido ${order.orderNumber} (${context.method === STORE_PAYMENT_METHOD.DEPOSITO_BANCARIO ? 'depósito' : 'transferencia'}). Revisa el comprobante para aprobar o rechazar.`,
        { event: 'store.payment_reported', orderId, orderNumber: order.orderNumber, method: context.method },
        'WARNING',
      )
      .catch(() => undefined);

    return this.ordersService.getOrder(customer, orderId);
  }
}
