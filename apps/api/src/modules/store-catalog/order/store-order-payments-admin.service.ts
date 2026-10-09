import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { InternalAuthUser } from '../../auth/auth.types';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { StoreOrderTimelineService } from './store-order-timeline.service';
import {
  ConfirmStoreOrderPaymentInput,
  MarkStoreOrderPaymentNoPaidInput,
  RegisterStoreOrderVisaLinkInput,
  RejectStoreOrderPaymentInput,
} from './store-order-payment-admin.schemas';
import {
  STORE_ORDER_STATUS,
  STORE_ORDER_TIMELINE_STATUS_TYPE,
  STORE_PAYMENT_METHOD,
  STORE_PAYMENT_STATUS,
  STORE_SETTLEMENT_STATUS,
  STORE_TIMELINE_ROLE,
} from './store-order.constants';

const RECEIPT_URL_PATTERN = /^\/api\/media\/assets\/([^/]+)\/content$/;

@Injectable()
export class StoreOrderPaymentsAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timelineService: StoreOrderTimelineService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async registerVisaLink(orderId: string, input: RegisterStoreOrderVisaLinkInput, actor: InternalAuthUser) {
    const { order, payment } = await this.getActiveOrderAndPayment(orderId);

    if (payment.paymentMethod !== STORE_PAYMENT_METHOD.VISA_LINK_MANUAL) {
      throw new BadRequestException('Este pedido no solicito pago por Visa Link.');
    }

    // Acepta también la solicitud del cliente (VISA_LINK_SOLICITADO) además de los estados previos.
    const allowedStatuses: string[] = [
      STORE_PAYMENT_STATUS.PENDIENTE_LINK,
      STORE_PAYMENT_STATUS.VISA_LINK_SOLICITADO,
      STORE_PAYMENT_STATUS.LINK_ENVIADO,
    ];
    if (!allowedStatuses.includes(payment.paymentStatus)) {
      throw new BadRequestException('El pago no se encuentra en un estado valido para registrar un enlace.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.storeOrderPayment.update({
        where: { id: payment.id },
        data: {
          paymentStatus: STORE_PAYMENT_STATUS.LINK_ENVIADO,
          visaLinkUrl: input.visaLinkUrl,
          visaLinkSentAt: new Date(),
          visaLinkSentByInternalUserId: actor.id,
        },
      });

      await tx.storeOrder.update({
        where: { id: orderId },
        data: { clientPaymentStatus: STORE_PAYMENT_STATUS.LINK_ENVIADO },
      });

      await this.timelineService.registerEvent(tx, {
        orderId,
        statusType: STORE_ORDER_TIMELINE_STATUS_TYPE.PAYMENT_STATUS,
        previousStatus: payment.paymentStatus,
        newStatus: STORE_PAYMENT_STATUS.LINK_ENVIADO,
        comment: `VISA_LINK_SENT_TO_CUSTOMER · ${input.comment ?? 'Enlace de pago Visa Link enviado al cliente.'}`,
        createdByInternalUserId: actor.id,
        createdByRole: STORE_TIMELINE_ROLE.INTERNAL_USER,
      });
    });

    await this.notificationsService
      .notifySystemCustomer(
        order.customerId,
        'Tu Visa Link está listo',
        `El enlace de pago de tu pedido ${order.orderNumber} ya está disponible. Ábrelo, paga y reporta tu comprobante en la app.`,
        { event: 'store.visa_link_sent', orderId, orderNumber: order.orderNumber },
        'INFO',
      )
      .catch(() => undefined);

    return this.getPaymentSummary(orderId);
  }

  async confirmPayment(orderId: string, input: ConfirmStoreOrderPaymentInput, actor: InternalAuthUser) {
    const { order, payment } = await this.getActiveOrderAndPayment(orderId);

    if (payment.paymentMethod === STORE_PAYMENT_METHOD.VISA_LINK_MANUAL) {
      if (!payment.visaLinkUrl) {
        throw new BadRequestException('No puedes confirmar un pago Visa Link sin un enlace registrado.');
      }
      // Se puede confirmar cuando el enlace fue enviado o cuando el cliente ya reportó el pago.
      if (
        payment.paymentStatus !== STORE_PAYMENT_STATUS.LINK_ENVIADO &&
        payment.paymentStatus !== STORE_PAYMENT_STATUS.COMPROBANTE_ENVIADO
      ) {
        throw new BadRequestException('El pago Visa Link solo puede confirmarse cuando el enlace ya fue enviado o el cliente reportó el pago.');
      }
    } else if (
      payment.paymentStatus !== STORE_PAYMENT_STATUS.PENDIENTE_PAGO &&
      payment.paymentStatus !== STORE_PAYMENT_STATUS.PENDIENTE_CONFIRMACION &&
      payment.paymentStatus !== STORE_PAYMENT_STATUS.COMPROBANTE_ENVIADO
    ) {
      throw new BadRequestException('El pago no se encuentra en un estado valido para confirmarse.');
    }

    if (Number(input.amount) !== Number(order.totalAmount)) {
      throw new BadRequestException('El monto debe coincidir exactamente con el total del pedido. No se permiten cobros parciales.');
    }

    if (payment.paymentMethod === STORE_PAYMENT_METHOD.VISA_LINK_MANUAL) {
      // Si el cliente ya reportó el pago (autorización + comprobante), el admin solo aprueba.
      const hasReportedProof = Boolean(payment.receiptFileUrl) && Boolean(payment.authorizationCode);
      if (!hasReportedProof && (!input.authorizationCode || !input.referenceNumber || !input.receiptFileUrl || !input.receiptFileName)) {
        throw new BadRequestException('Para pago Visa Link son obligatorios: numero de autorizacion, numero de referencia y comprobante.');
      }
      if (input.receiptFileUrl) {
        await this.assertReceiptBelongsToSystem(input.receiptFileUrl);
      }
    }

    if (
      payment.paymentMethod === STORE_PAYMENT_METHOD.TRANSFERENCIA_BANCARIA ||
      payment.paymentMethod === STORE_PAYMENT_METHOD.DEPOSITO_BANCARIO
    ) {
      // Si el cliente ya reportó el pago (subió comprobante), el admin solo aprueba: no
      // necesita volver a subir el comprobante ni la referencia.
      const hasReportedReceipt = Boolean(payment.receiptFileUrl);
      if (!hasReportedReceipt && (!input.referenceNumber || !input.receiptFileUrl || !input.receiptFileName)) {
        throw new BadRequestException('Para transferencia o deposito son obligatorios: numero de referencia y comprobante.');
      }
      if (input.receiptFileUrl) {
        await this.assertReceiptBelongsToSystem(input.receiptFileUrl);
      }
    }

    const settlementStatus = STORE_SETTLEMENT_STATUS.PENDIENTE_LIQUIDAR;

    await this.prisma.$transaction(async (tx) => {
      await tx.storeOrderPayment.update({
        where: { id: payment.id },
        data: {
          paymentStatus: STORE_PAYMENT_STATUS.PAGO_CONFIRMADO,
          amount: input.amount,
          paidAt: input.paidAt,
          // Preserva lo reportado por el cliente si el admin no lo reemplaza.
          authorizationCode: input.authorizationCode ?? payment.authorizationCode ?? null,
          voucherNumber: input.voucherNumber ?? payment.voucherNumber ?? null,
          referenceNumber: input.referenceNumber ?? payment.referenceNumber ?? null,
          notes: input.notes ?? payment.notes ?? null,
          reviewedByInternalUserId: actor.id,
          reviewedAt: new Date(),
          confirmedByInternalUserId: actor.id,
          settlementStatus,
          ...(input.receiptFileUrl
            ? {
                receiptFileUrl: input.receiptFileUrl,
                receiptFileName: input.receiptFileName,
                receiptUploadedAt: new Date(),
                receiptUploadedByInternalUserId: actor.id,
              }
            : {}),
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
        comment: `Pago confirmado por el administrador (${payment.paymentMethod}).`,
        createdByInternalUserId: actor.id,
        createdByRole: STORE_TIMELINE_ROLE.INTERNAL_USER,
      });
    });

    await this.notificationsService
      .notifySystemCustomer(
        order.customerId,
        'Pago confirmado',
        `Tu pago del pedido ${order.orderNumber} fue confirmado. Estamos preparando tu pedido.`,
        { event: 'store.payment_approved', orderId, orderNumber: order.orderNumber },
        'SUCCESS',
      )
      .catch(() => undefined);

    return this.getPaymentSummary(orderId);
  }

  async rejectPayment(orderId: string, input: RejectStoreOrderPaymentInput, actor: InternalAuthUser) {
    const { order, payment } = await this.getActiveOrderAndPayment(orderId);

    await this.prisma.$transaction(async (tx) => {
      await tx.storeOrderPayment.update({
        where: { id: payment.id },
        data: {
          paymentStatus: STORE_PAYMENT_STATUS.PAGO_RECHAZADO,
          settlementStatus: STORE_SETTLEMENT_STATUS.NO_APLICA,
          notes: input.comment ?? null,
          rejectionReason: input.reason,
          reviewedByInternalUserId: actor.id,
          reviewedAt: new Date(),
        },
      });

      await tx.storeOrder.update({
        where: { id: orderId },
        data: { clientPaymentStatus: STORE_PAYMENT_STATUS.PAGO_RECHAZADO },
      });

      await this.timelineService.registerEvent(tx, {
        orderId,
        statusType: STORE_ORDER_TIMELINE_STATUS_TYPE.PAYMENT_STATUS,
        previousStatus: payment.paymentStatus,
        newStatus: STORE_PAYMENT_STATUS.PAGO_RECHAZADO,
        comment: `Motivo: ${input.reason}.${input.comment ? ` Comentario: ${input.comment}.` : ''}`,
        createdByInternalUserId: actor.id,
        createdByRole: STORE_TIMELINE_ROLE.INTERNAL_USER,
      });
    });

    await this.notificationsService
      .notifySystemCustomer(
        order.customerId,
        'Pago rechazado',
        `Tu pago del pedido ${order.orderNumber} fue rechazado. Motivo: ${input.reason}. Puedes cargar un nuevo comprobante desde la app.`,
        { event: 'store.payment_rejected', orderId, orderNumber: order.orderNumber, reason: input.reason },
        'WARNING',
      )
      .catch(() => undefined);

    return this.getPaymentSummary(orderId);
  }

  async markNoPaid(orderId: string, input: MarkStoreOrderPaymentNoPaidInput, actor: InternalAuthUser) {
    const { payment } = await this.getActiveOrderAndPayment(orderId);

    await this.prisma.$transaction(async (tx) => {
      await tx.storeOrderPayment.update({
        where: { id: payment.id },
        data: { paymentStatus: STORE_PAYMENT_STATUS.NO_PAGADO, settlementStatus: STORE_SETTLEMENT_STATUS.NO_APLICA, notes: input.comment ?? null },
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
        comment: `Motivo: ${input.reason}.${input.comment ? ` Comentario: ${input.comment}.` : ''}`,
        createdByInternalUserId: actor.id,
        createdByRole: STORE_TIMELINE_ROLE.INTERNAL_USER,
      });
    });

    return this.getPaymentSummary(orderId);
  }

  private async getActiveOrderAndPayment(orderId: string) {
    const order = await this.prisma.storeOrder.findUnique({
      where: { id: orderId },
      include: { payments: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    if (!order) {
      throw new NotFoundException('Pedido no encontrado.');
    }

    if (order.orderStatus === STORE_ORDER_STATUS.CANCELADO) {
      throw new BadRequestException('No se pueden gestionar pagos de un pedido cancelado.');
    }

    const payment = order.payments[0];
    if (!payment) {
      throw new NotFoundException('Este pedido no tiene un registro de pago.');
    }

    return { order, payment };
  }

  private async assertReceiptBelongsToSystem(receiptFileUrl: string) {
    const match = RECEIPT_URL_PATTERN.exec(receiptFileUrl);
    if (!match) {
      throw new BadRequestException('El comprobante debe subirse desde el sistema. No se aceptan enlaces externos.');
    }

    const asset = await this.prisma.mediaAsset.findUnique({ where: { id: match[1] } });
    if (!asset || asset.purpose !== 'STORE_PAYMENT_RECEIPT') {
      throw new BadRequestException('El comprobante debe subirse desde el sistema. No se aceptan enlaces externos.');
    }
  }

  private async getPaymentSummary(orderId: string) {
    const order = await this.prisma.storeOrder.findUnique({
      where: { id: orderId },
      include: { payments: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    const payment = order?.payments[0] as (Record<string, unknown> & { amount: Prisma.Decimal }) | undefined;

    return {
      orderId,
      clientPaymentStatus: order?.clientPaymentStatus,
      payment: payment ? { ...payment, amount: Number(payment.amount) } : null,
    };
  }
}
