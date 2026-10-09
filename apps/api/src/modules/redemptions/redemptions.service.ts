import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { FastifyRequest } from 'fastify';
import { AuditService } from '../audit/audit.service';
import { CustomerAuthUser, InternalAuthUser } from '../auth/auth.types';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SettingsService } from '../settings/settings.service';
import {
  CancelRedemptionInput,
  ConfirmDeliveryInput,
  DeliverRedemptionInput,
  ListRedemptionsInput,
  RedeemPointsByAmountInput,
  RejectRedemptionInput,
  RequestRedemptionInput,
  TransitionCommentInput,
} from './redemption.schemas';

type RedemptionRequestWithRelations = Prisma.RedemptionRequestGetPayload<{
  include: RedemptionsService['requestInclude'];
}>;

const ACTIVE_STATUSES = ['PENDING_APPROVAL', 'APPROVED', 'SENT_TO_STORE', 'READY'] as const;

@Injectable()
export class RedemptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly settingsService: SettingsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async listCustomer(customer: CustomerAuthUser) {
    return this.prisma.redemptionRequest.findMany({
      where: { customerId: customer.id },
      orderBy: { requestedAt: 'desc' },
      take: 50,
      include: this.customerRequestInclude,
    });
  }

  async listAdmin(input: ListRedemptionsInput, actor: InternalAuthUser) {
    const storeFilter = actor.storeIds.length === 0 ? {} : { pickupStoreId: { in: actor.storeIds } };
    const requestDateRange = this.dateRange(input.requestedAt);
    const deliveryDateRange = this.dateRange(input.deliveredAt);
    const where: Prisma.RedemptionRequestWhereInput = {
      status: input.status ?? (input.workflow === 'STORE_ACTIVE' ? { in: ['SENT_TO_STORE', 'READY'] } : undefined),
      requestCode: input.requestCode ? { contains: input.requestCode, mode: 'insensitive' } : undefined,
      customerId: input.customerId,
      requestedAt: requestDateRange,
      deliveredAt: deliveryDateRange,
      customer: input.customer ? { fullName: { contains: input.customer, mode: 'insensitive' } } : undefined,
      productNameSnapshot: input.product ? { contains: input.product, mode: 'insensitive' } : undefined,
      pickupStore: input.store ? { name: { contains: input.store, mode: 'insensitive' } } : undefined,
      ...storeFilter,
    };
    const total = await this.prisma.redemptionRequest.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / input.take));
    const page = Math.min(input.page, totalPages);
    const data = await this.prisma.redemptionRequest.findMany({
      where,
      orderBy: { requestedAt: 'desc' },
      skip: (page - 1) * input.take,
      take: input.take,
      include: this.requestInclude,
    });

    return { data, meta: { page, limit: input.take, total, totalPages } };
  }

  private dateRange(value?: string) {
    if (!value) return undefined;
    const start = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(start.getTime())) return undefined;
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return { gte: start, lt: end };
  }

  async get(id: string, actor: InternalAuthUser) {
    const storeFilter = actor.storeIds.length === 0 ? {} : { pickupStoreId: { in: actor.storeIds } };
    const redemptionRequest = await this.prisma.redemptionRequest.findFirst({
      where: {
        id,
        ...storeFilter,
      },
      include: this.requestInclude,
    });

    if (!redemptionRequest) {
      throw new NotFoundException('Solicitud de canje no encontrada.');
    }

    const auditTrail = await this.prisma.auditLog.findMany({
      where: {
        entityType: 'RedemptionRequest',
        entityId: redemptionRequest.id,
      },
      orderBy: { createdAt: 'asc' },
      include: {
        actorInternalUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
            roleAssignments: {
              take: 1,
              select: {
                role: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        actorCustomer: {
          select: {
            id: true,
            code: true,
            fullName: true,
          },
        },
      },
    });

    return { ...redemptionRequest, auditTrail };
  }

  async validateCode(code: string, actor: InternalAuthUser) {
    const normalizedCode = code.trim();
    const storeFilter = actor.storeIds.length === 0 ? {} : { pickupStoreId: { in: actor.storeIds } };
    const redemptionRequest = await this.prisma.redemptionRequest.findFirst({
      where: {
        OR: [{ validationCode: normalizedCode }, { requestCode: normalizedCode }],
        ...storeFilter,
      },
      include: this.requestInclude,
    });

    if (!redemptionRequest) {
      throw new NotFoundException('Codigo de validacion de canje no encontrado.');
    }

    return {
      isValid: redemptionRequest.status === 'READY',
      canDeliver: redemptionRequest.status === 'READY',
      redemption: redemptionRequest,
    };
  }

  async request(input: RequestRedemptionInput, customer: CustomerAuthUser, request: FastifyRequest) {
    try {
      return await this.requestInternal(input, customer, request);
    } catch (error) {
      await this.recordFailedRedemptionRequest(input, customer, request, error);
      throw error;
    }
  }

  private async recordFailedRedemptionRequest(
    input: RequestRedemptionInput,
    customer: CustomerAuthUser,
    request: FastifyRequest,
    error: unknown,
  ) {
    const reason = error instanceof Error ? error.message : 'Error desconocido al procesar el canje.';
    const product = await this.prisma.redeemableProduct
      .findUnique({ where: { id: input.productId }, select: { code: true, name: true, requiresApproval: true } })
      .catch(() => null);

    await this.auditService
      .record({
        actorType: 'CUSTOMER',
        actorCustomerId: customer.id,
        action: 'redemption_requests.request_failed',
        module: 'redemption_requests',
        entityType: 'RedeemableProduct',
        entityId: input.productId,
        metadata: {
          motivo: reason,
          productId: input.productId,
          productCode: product?.code ?? null,
          productName: product?.name ?? null,
          requiereAprobacion: product?.requiresApproval ?? null,
          flujo: product?.requiresApproval ? 'CON_APROBACION' : 'CANJE_INMEDIATO',
        },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      })
      .catch(() => undefined);

    await this.notificationsService
      .notifySystemInternal(
        'Canje no aprobado',
        `No se pudo procesar el canje de ${product?.name ?? 'un premio'} solicitado por un cliente: ${reason}`,
        { event: 'redemption.request_failed', productId: input.productId, motivo: reason },
        'WARNING',
      )
      .catch(() => undefined);
  }

  private async requestInternal(input: RequestRedemptionInput, customer: CustomerAuthUser, request: FastifyRequest) {
    const [customerRow, product] = await Promise.all([
      this.prisma.customer.findUnique({
        where: { id: customer.id },
        select: { id: true, code: true, fullName: true, status: true, brandItemId: true, registrationStoreId: true },
      }),
      this.prisma.redeemableProduct.findUnique({
        where: { id: input.productId },
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          pointsValue: true,
          stock: true,
          reservedStock: true,
          imageUrl: true,
          isActive: true,
          isPublished: true,
          requiresApproval: true,
          isGiftCard: true,
          redemptionLimitPerCustomer: true,
          brandItemId: true,
        },
      }),
    ]);

    if (!customerRow) {
      throw new NotFoundException('Cliente no encontrado.');
    }

    if (customerRow.status !== 'ACTIVE') {
      throw new BadRequestException('No puedes solicitar canjes con un cliente inactivo o bloqueado.');
    }

    if (!product) {
      throw new NotFoundException('Producto canjeable no encontrado.');
    }

    if (!product.isActive || !product.isPublished) {
      throw new BadRequestException('Este producto no esta disponible para canje.');
    }

    const pickupStore = await this.resolvePickupStore({
      pickupStoreId: input.pickupStoreId,
      brandItemId: product.brandItemId ?? customerRow.brandItemId,
      registrationStoreId: customerRow.registrationStoreId,
    });

    if (!pickupStore) {
      throw new NotFoundException('No hay una tienda activa disponible para asignar este canje.');
    }

    if (pickupStore.status !== 'ACTIVE') {
      throw new BadRequestException('La tienda de recoleccion seleccionada no esta activa.');
    }

    const availableStock = product.stock === null ? null : product.stock - product.reservedStock;

    if (availableStock !== null && availableStock <= 0) {
      throw new BadRequestException('Este producto no tiene stock disponible.');
    }

    if (product.redemptionLimitPerCustomer) {
      const existingCount = await this.prisma.redemptionRequest.count({
        where: {
          customerId: customer.id,
          productId: product.id,
          status: { notIn: ['REJECTED', 'CANCELLED', 'EXPIRED'] },
        },
      });

      if (existingCount >= product.redemptionLimitPerCustomer) {
        throw new BadRequestException('Alcanzaste el limite de canjes permitidos para este producto.');
      }
    }

    const requestCode = await this.generateCode();
    const requiresApproval = product.requiresApproval;
    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      // Serializa canjes del mismo cliente para impedir doble gasto concurrente.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${customer.id}))`;
      // Serializa movimientos del mismo producto para impedir sobre-reserva del último stock.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${product.id}))`;

      const pointAggregate = await tx.pointMovement.aggregate({
        where: { customerId: customer.id, status: 'AVAILABLE', OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
        _sum: { points: true },
      });
      const availablePoints = pointAggregate._sum.points ?? 0;

      if (availablePoints < product.pointsValue) {
        throw new BadRequestException('No tienes puntos suficientes para solicitar este producto.');
      }

      const stockSnapshot = await tx.redeemableProduct.findUnique({
        where: { id: product.id },
        select: { stock: true, reservedStock: true },
      });
      const txAvailableStock = stockSnapshot?.stock === null ? null : (stockSnapshot?.stock ?? 0) - (stockSnapshot?.reservedStock ?? 0);

      if (!stockSnapshot || (txAvailableStock !== null && txAvailableStock <= 0)) {
        throw new ConflictException('El stock del producto se agoto antes de confirmar el canje.');
      }

      if (stockSnapshot.stock !== null && requiresApproval) {
        await tx.redeemableProduct.update({
          where: { id: product.id },
          data: {
            reservedStock: { increment: 1 },
          },
        });
      } else if (stockSnapshot.stock !== null) {
        await tx.redeemableProduct.update({
          where: { id: product.id },
          data: {
            stock: { decrement: 1 },
          },
        });
      } else if (requiresApproval) {
        await tx.redeemableProduct.update({
          where: { id: product.id },
          data: { reservedStock: { increment: 1 } },
        });
      }

      const redemptionRequest = await tx.redemptionRequest.create({
        data: {
          requestCode,
          customerId: customer.id,
          productId: product.id,
          productNameSnapshot: product.name,
          productPointsSnapshot: product.pointsValue,
          productImageUrlSnapshot: product.imageUrl,
          productDescriptionSnapshot: product.description,
          productIsGiftCardSnapshot: product.isGiftCard,
          pickupStoreId: pickupStore.id,
          status: requiresApproval ? 'PENDING_APPROVAL' : 'DELIVERED',
          approvedAt: null,
          deliveredAt: requiresApproval ? null : now,
          deliveredToName: requiresApproval ? null : customerRow.fullName,
          validationCode: requestCode,
          validationQrPayload: this.validationQrPayload({ requestCode }),
          operationalValidations: this.operationalValidationsSnapshot({
            customerActive: true,
            pointsSufficient: true,
            productAvailable: true,
          }),
          pointsReserved: product.pointsValue,
        },
      });

      const pointMovement = await tx.pointMovement.create({
        data: {
          customerId: customer.id,
          type: requiresApproval ? 'REDEMPTION_RESERVED' : 'REDEMPTION_USED',
          status: 'AVAILABLE',
          points: -product.pointsValue,
          description: requiresApproval
            ? `Reserva de canje ${redemptionRequest.requestCode}: ${product.name}`
            : `Canje aplicado ${redemptionRequest.requestCode}: ${product.name}`,
        },
      });

      const updatedRequest = await tx.redemptionRequest.update({
        where: { id: redemptionRequest.id },
        data: { pointMovementId: pointMovement.id },
        include: this.requestInclude,
      });

      return { redemptionRequest: updatedRequest, pointMovement, availablePoints };
    });

    if (product.stock !== null) {
      const currentStock = await this.prisma.redeemableProduct.findUnique({
        where: { id: product.id },
        select: { stock: true, reservedStock: true },
      });
      if (currentStock && currentStock.stock !== null && currentStock.stock <= currentStock.reservedStock) {
        const deactivated = await this.prisma.redeemableProduct.updateMany({
          where: { id: product.id, isActive: true },
          data: { isActive: false },
        });
        if (deactivated.count === 1) {
          await this.notificationsService.notifySystemInternal(
            'Premio sin stock',
            `${product.name} agotó su stock y fue retirado automáticamente del catálogo del cliente.`,
            { event: 'reward.stock_exhausted', productId: product.id, productCode: product.code },
            'WARNING',
          );
        }
      }
    }

    await this.auditService.record({
      actorType: 'CUSTOMER',
      actorCustomerId: customer.id,
      action: 'redemption_requests.request',
      module: 'redemption_requests',
      entityType: 'RedemptionRequest',
      entityId: result.redemptionRequest.id,
      metadata: {
        requestCode: result.redemptionRequest.requestCode,
        productId: product.id,
        productCode: product.code,
        pointsReserved: product.pointsValue,
        pointMovementId: result.pointMovement.id,
        availablePointsBefore: result.availablePoints,
        availablePointsAfter: result.availablePoints - product.pointsValue,
        status: result.redemptionRequest.status,
        newStatus: result.redemptionRequest.status,
        validationCode: result.redemptionRequest.validationCode,
      },
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });

    await this.notificationsService.notifySystemInternal(
      requiresApproval ? 'Nuevo canje pendiente de aprobacion' : 'Nuevo canje entregado',
      requiresApproval
        ? `${customerRow.fullName} solicito ${result.redemptionRequest.requestCode} por ${product.name}. Requiere aprobacion antes de prepararse.`
        : `${customerRow.fullName} canjeo ${result.redemptionRequest.requestCode} por ${product.name}. El canje quedo aplicado de inmediato.`,
      { redemptionRequestId: result.redemptionRequest.id, requestCode: result.redemptionRequest.requestCode },
    );

    await this.notificationsService.notifySystemCustomer(
      customer.id,
      requiresApproval ? 'Tu canje esta pendiente de aprobacion' : 'Tu canje fue aplicado',
      requiresApproval
        ? `Tu solicitud ${result.redemptionRequest.requestCode} por ${product.name} fue registrada y esta pendiente de aprobacion.`
        : `Tu canje ${result.redemptionRequest.requestCode} por ${product.name} fue aplicado de inmediato.`,
      { redemptionRequestId: result.redemptionRequest.id, requestCode: result.redemptionRequest.requestCode },
    );

    return result.redemptionRequest;
  }

  async redeemPointsByAmount(input: RedeemPointsByAmountInput, actor: InternalAuthUser, request: FastifyRequest) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: input.customerId },
      select: { id: true, code: true, fullName: true, status: true },
    });

    if (!customer) {
      throw new NotFoundException('Cliente no encontrado.');
    }

    if (customer.status !== 'ACTIVE') {
      throw new BadRequestException('No puedes canjear puntos de un cliente inactivo o bloqueado.');
    }

    const description = input.description?.trim() || `Canje manual de ${input.points.toLocaleString('es-GT')} puntos registrado por administrador.`;
    const { movement, availablePoints } = await this.prisma.$transaction(async (tx) => {
      // Serializa los descuentos del mismo cliente para impedir doble gasto concurrente.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${customer.id}))`;

      const pointAggregate = await tx.pointMovement.aggregate({
        where: { customerId: customer.id, status: 'AVAILABLE', OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
        _sum: { points: true },
      });
      const lockedAvailablePoints = pointAggregate._sum.points ?? 0;

      if (lockedAvailablePoints < input.points) {
        throw new BadRequestException('El cliente no tiene suficientes puntos disponibles para este canje.');
      }

      const createdMovement = await tx.pointMovement.create({
        data: {
          customerId: customer.id,
          type: 'REDEMPTION_USED',
          status: 'AVAILABLE',
          points: -input.points,
          description,
        },
      });

      return { movement: createdMovement, availablePoints: lockedAvailablePoints };
    });

    await this.auditService.record({
      actorType: 'INTERNAL_USER',
      actorInternalUserId: actor.id,
      action: 'redemption_requests.manual_points_redeem',
      module: 'redemption_requests',
      entityType: 'PointMovement',
      entityId: movement.id,
      metadata: {
        customerId: customer.id,
        customerCode: customer.code,
        points: input.points,
        availablePointsBefore: availablePoints,
        availablePointsAfter: availablePoints - input.points,
      },
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });

    await this.notificationsService.notifySystemCustomer(
      customer.id,
      'Canje de puntos realizado',
      `Se canjearon ${input.points.toLocaleString('es-GT')} puntos de tu cuenta.`,
      { event: 'points.manual_redeem', points: input.points, pointMovementId: movement.id },
      'SUCCESS',
    );

    return {
      customerId: customer.id,
      pointMovementId: movement.id,
      pointsRedeemed: input.points,
      availablePoints: availablePoints - input.points,
    };
  }

  private async resolvePickupStore(input: { pickupStoreId?: string; brandItemId?: string | null; registrationStoreId?: string | null }) {
    const select = { id: true, code: true, name: true, status: true } satisfies Prisma.StoreSelect;

    if (input.pickupStoreId) {
      return this.prisma.store.findUnique({ where: { id: input.pickupStoreId }, select });
    }

    if (input.registrationStoreId) {
      const registrationStore = await this.prisma.store.findFirst({
        where: {
          id: input.registrationStoreId,
          status: 'ACTIVE',
          ...(input.brandItemId ? { brandId: input.brandItemId } : {}),
        },
        select,
      });
      if (registrationStore) return registrationStore;
    }

    if (input.brandItemId) {
      const brandStore = await this.prisma.store.findFirst({
        where: { brandId: input.brandItemId, status: 'ACTIVE' },
        orderBy: { createdAt: 'asc' },
        select,
      });
      if (brandStore) return brandStore;
    }

    return this.prisma.store.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
      select,
    });
  }

  async cancelCustomer(id: string, input: CancelRedemptionInput, customer: CustomerAuthUser, request: FastifyRequest) {
    const redemptionRequest = await this.prisma.redemptionRequest.findUnique({
      where: { id },
      include: this.requestInclude,
    });

    if (!redemptionRequest || redemptionRequest.customerId !== customer.id) {
      throw new NotFoundException('Solicitud de canje no encontrada.');
    }

    if (redemptionRequest.status !== 'PENDING_APPROVAL' && redemptionRequest.status !== 'APPROVED') {
      throw new BadRequestException('Solo puedes cancelar canjes pendientes o aprobados que aun no se hayan enviado a tienda.');
    }

    return this.releaseRequest(redemptionRequest, 'CANCELLED', input.reason, {
      actorType: 'CUSTOMER',
      actorCustomerId: customer.id,
      action: 'redemption_requests.customer_cancel',
      request,
    });
  }

  async confirmDeliveryByCustomer(input: ConfirmDeliveryInput, customer: CustomerAuthUser, request: FastifyRequest) {
    const normalizedCode = input.code.trim().replace(/^RDM:/i, '').trim().toUpperCase();
    if (!normalizedCode) {
      throw new BadRequestException('Codigo de canje invalido.');
    }

    const redemptionRequest = await this.prisma.redemptionRequest.findFirst({
      where: {
        customerId: customer.id,
        OR: [{ validationCode: normalizedCode }, { requestCode: normalizedCode }],
      },
      include: this.requestInclude,
    });

    if (!redemptionRequest) {
      throw new NotFoundException('No encontramos un canje tuyo con ese codigo.');
    }

    if (redemptionRequest.status === 'DELIVERED') {
      throw new BadRequestException('Este canje ya fue entregado.');
    }

    if (redemptionRequest.status !== 'READY') {
      throw new BadRequestException('Este canje aun no esta listo para recoger. Espera a que la tienda lo prepare.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (redemptionRequest.pointMovementId) {
        await tx.pointMovement.update({
          where: { id: redemptionRequest.pointMovementId },
          data: {
            type: 'REDEMPTION_USED',
            description: `Canje entregado ${redemptionRequest.requestCode}: ${redemptionRequest.productNameSnapshot}`,
          },
        });
      }

      await tx.redeemableProduct.update({
        where: { id: redemptionRequest.productId },
        data: {
          reservedStock: { decrement: 1 },
          ...(redemptionRequest.product.stock !== null ? { stock: { decrement: 1 } } : {}),
        },
      });

      return tx.redemptionRequest.update({
        where: { id: redemptionRequest.id },
        data: {
          status: 'DELIVERED',
          deliveredAt: new Date(),
          deliveredToName: redemptionRequest.customer.fullName,
          deliveryObservation: 'Entrega confirmada por el cliente al escanear el QR.',
        },
        include: this.requestInclude,
      });
    });

    await this.auditService.record({
      actorType: 'CUSTOMER',
      actorCustomerId: customer.id,
      action: 'redemption_requests.customer_confirm_delivery',
      module: 'redemption_requests',
      entityType: 'RedemptionRequest',
      entityId: updated.id,
      metadata: {
        requestCode: updated.requestCode,
        validationCode: updated.validationCode,
        previousStatus: redemptionRequest.status,
      },
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });

    await this.notificationsService.notifySystemInternal(
      'Canje entregado (confirmado por cliente)',
      `${updated.customer.fullName} confirmo la entrega de ${updated.requestCode} por ${updated.productNameSnapshot} escaneando el QR.`,
      { redemptionRequestId: updated.id, requestCode: updated.requestCode },
    );

    await this.notificationsService.notifySystemCustomer(
      customer.id,
      'Canje entregado',
      `Confirmaste la entrega de ${updated.requestCode} por ${updated.productNameSnapshot}. Gracias por canjear tus puntos.`,
      { redemptionRequestId: updated.id, requestCode: updated.requestCode },
      'SUCCESS',
    );

    return {
      id: updated.id,
      requestCode: updated.requestCode,
      status: updated.status,
      productName: updated.productNameSnapshot,
      pointsReserved: updated.pointsReserved,
      deliveredAt: updated.deliveredAt,
      store: updated.pickupStore ? { name: updated.pickupStore.name } : null,
    };
  }

  async cancelInternal(id: string, input: CancelRedemptionInput, actor: InternalAuthUser, request: FastifyRequest) {
    const redemptionRequest = await this.getActiveOrThrow(id, actor);

    return this.releaseRequest(redemptionRequest, 'CANCELLED', input.reason, {
      actorType: 'INTERNAL_USER',
      actorInternalUserId: actor.id,
      action: 'redemption_requests.cancel',
      request,
    }, actor.id);
  }

  async reject(id: string, input: RejectRedemptionInput, actor: InternalAuthUser, request: FastifyRequest) {
    const redemptionRequest = await this.getActiveOrThrow(id, actor);

    if (!ACTIVE_STATUSES.includes(redemptionRequest.status as typeof ACTIVE_STATUSES[number])) {
      throw new BadRequestException('Solo puedes rechazar solicitudes activas.');
    }

    return this.releaseRequest(redemptionRequest, 'REJECTED', input.reason, {
      actorType: 'INTERNAL_USER',
      actorInternalUserId: actor.id,
      action: 'redemption_requests.reject',
      request,
    }, actor.id);
  }

  async approve(id: string, input: TransitionCommentInput, actor: InternalAuthUser, request: FastifyRequest) {
    const redemptionRequest = await this.getActiveOrThrow(id, actor);

    if (redemptionRequest.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Solo puedes aprobar solicitudes pendientes de aprobacion.');
    }

    const now = new Date();
    const updated = await this.prisma.redemptionRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewStartedAt: redemptionRequest.reviewStartedAt ?? redemptionRequest.requestedAt,
        approvedAt: now,
        approvedByInternalUserId: actor.id,
        managedByInternalUserId: actor.id,
        approvalComment: input.comment || 'Canje aprobado. Cliente con puntos suficientes y premio disponible.',
        operationalValidations: this.operationalValidationsSnapshot({
          customerActive: redemptionRequest.customer.status === 'ACTIVE',
          pointsSufficient: true,
          productAvailable: true,
        }),
      },
      include: this.requestInclude,
    });

    await this.recordAndNotify(
      updated,
      actor,
      request,
      'redemption_requests.approve',
      'Tu canje fue aprobado',
      `Tu solicitud ${updated.requestCode} fue aprobada y sera enviada a tienda.`,
      { previousStatus: redemptionRequest.status, comment: updated.approvalComment },
    );

    return updated;
  }

  async markSentToStore(id: string, input: TransitionCommentInput, actor: InternalAuthUser, request: FastifyRequest) {
    const redemptionRequest = await this.getActiveOrThrow(id, actor);

    if (redemptionRequest.status !== 'APPROVED') {
      throw new BadRequestException('Solo puedes enviar a tienda las solicitudes aprobadas.');
    }

    const now = new Date();
    const updated = await this.prisma.redemptionRequest.update({
      where: { id },
      data: {
        status: 'SENT_TO_STORE',
        sentToStoreAt: now,
        sentToStoreByInternalUserId: actor.id,
        sentToStoreComment: input.comment || 'Canje enviado a tienda para preparación.',
        managedByInternalUserId: actor.id,
      },
      include: this.requestInclude,
    });

    await this.recordAndNotify(
      updated,
      actor,
      request,
      'redemption_requests.mark_sent_to_store',
      'Tu canje va en camino a la tienda',
      `Tu solicitud ${updated.requestCode} fue enviada a la tienda de recoleccion.`,
      { previousStatus: redemptionRequest.status, comment: updated.sentToStoreComment },
    );

    return updated;
  }

  async markReady(id: string, input: TransitionCommentInput, actor: InternalAuthUser, request: FastifyRequest) {
    const redemptionRequest = await this.getActiveOrThrow(id, actor);

    if (redemptionRequest.status !== 'SENT_TO_STORE') {
      throw new BadRequestException('Solo puedes marcar como listas las solicitudes enviadas a tienda.');
    }

    const now = new Date();
    const updated = await this.prisma.redemptionRequest.update({
      where: { id },
      data: {
        status: 'READY',
        readyAt: now,
        preparedByInternalUserId: actor.id,
        preparationComment: input.comment || 'Premio preparado y listo para entrega en tienda.',
        managedByInternalUserId: actor.id,
      },
      include: this.requestInclude,
    });

    await this.recordAndNotify(
      updated,
      actor,
      request,
      'redemption_requests.mark_ready',
      'Tu canje esta listo para recoger',
      `Tu solicitud ${updated.requestCode} esta lista para recoger en tienda.`,
      { previousStatus: redemptionRequest.status, comment: updated.preparationComment },
    );

    return updated;
  }

  async markDelivered(id: string, input: DeliverRedemptionInput, actor: InternalAuthUser, request: FastifyRequest) {
    const redemptionRequest = await this.getActiveOrThrow(id, actor);

    if (redemptionRequest.status !== 'READY') {
      throw new BadRequestException('Solo puedes marcar como entregadas las solicitudes listas para recoger.');
    }

    const submittedCode = input.validationCode?.trim();
    if (submittedCode && submittedCode !== redemptionRequest.validationCode && submittedCode !== redemptionRequest.requestCode) {
      throw new BadRequestException('El codigo de validacion no corresponde a esta solicitud de canje.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (redemptionRequest.pointMovementId) {
        await tx.pointMovement.update({
          where: { id: redemptionRequest.pointMovementId },
          data: {
            type: 'REDEMPTION_USED',
            description: `Canje entregado ${redemptionRequest.requestCode}: ${redemptionRequest.productNameSnapshot}`,
          },
        });
      }

      await tx.redeemableProduct.update({
        where: { id: redemptionRequest.productId },
        data: {
          reservedStock: { decrement: 1 },
          ...(redemptionRequest.product.stock !== null ? { stock: { decrement: 1 } } : {}),
        },
      });

      return tx.redemptionRequest.update({
        where: { id },
        data: {
          status: 'DELIVERED',
          deliveredAt: new Date(),
          deliveredByInternalUserId: actor.id,
          deliveredToName: input.deliveredToName || redemptionRequest.customer.fullName,
          deliveryObservation: input.observation || 'Premio entregado al cliente.',
          deliveryEvidenceUrl: input.evidenceUrl,
          managedByInternalUserId: actor.id,
        },
        include: this.requestInclude,
      });
    });

    await this.recordAndNotify(
      updated,
      actor,
      request,
      'redemption_requests.mark_delivered',
      'Canje entregado',
      `Tu solicitud ${updated.requestCode} fue entregada. Gracias por canjear tus puntos.`,
      {
        previousStatus: redemptionRequest.status,
        deliveredToName: updated.deliveredToName,
        validationCode: updated.validationCode,
        comment: updated.deliveryObservation,
      },
    );

    return updated;
  }

  private async getActiveOrThrow(id: string, actor?: InternalAuthUser) {
    const redemptionRequest = await this.prisma.redemptionRequest.findUnique({
      where: { id },
      include: this.requestInclude,
    });

    if (!redemptionRequest) {
      throw new NotFoundException('Solicitud de canje no encontrada.');
    }

    if (actor && actor.storeIds.length > 0 && !actor.storeIds.includes(redemptionRequest.pickupStoreId)) {
      throw new ForbiddenException('No puedes gestionar solicitudes de canje de una tienda no asignada.');
    }

    return redemptionRequest;
  }

  private async releaseRequest(
    redemptionRequest: RedemptionRequestWithRelations,
    status: 'CANCELLED' | 'REJECTED' | 'EXPIRED',
    reason: string,
    audit: {
      actorType: 'CUSTOMER' | 'INTERNAL_USER';
      actorCustomerId?: string;
      actorInternalUserId?: string;
      action: string;
      request: FastifyRequest;
    },
    managedByInternalUserId?: string,
  ) {
    if (!ACTIVE_STATUSES.includes(redemptionRequest.status as typeof ACTIVE_STATUSES[number])) {
      throw new BadRequestException('Solo puedes liberar solicitudes activas.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const existingRelease = await tx.pointMovement.findFirst({
        where: {
          customerId: redemptionRequest.customerId,
          type: 'REDEMPTION_RELEASED',
          description: { contains: redemptionRequest.requestCode },
        },
        select: { id: true },
      });

      if (existingRelease) {
        throw new ConflictException('Esta solicitud ya tiene una liberacion de puntos registrada.');
      }

      await tx.pointMovement.create({
        data: {
          customerId: redemptionRequest.customerId,
          type: 'REDEMPTION_RELEASED',
          status: 'AVAILABLE',
          points: redemptionRequest.pointsReserved,
          description: `${this.releaseLabel(status)} de canje ${redemptionRequest.requestCode}: ${reason}`,
        },
      });

      await tx.redeemableProduct.update({
        where: { id: redemptionRequest.productId },
        data: { reservedStock: { decrement: 1 } },
      });

      const statusTimestampField = status === 'REJECTED' ? 'rejectedAt' : status === 'CANCELLED' ? 'cancelledAt' : undefined;
      const reasonField = status === 'REJECTED' ? 'rejectionReason' : 'cancellationReason';

      return tx.redemptionRequest.update({
        where: { id: redemptionRequest.id },
        data: {
          status,
          ...(statusTimestampField ? { [statusTimestampField]: new Date() } : { cancelledAt: new Date() }),
          [reasonField]: reason,
          ...(status === 'REJECTED' && managedByInternalUserId ? { rejectedByInternalUserId: managedByInternalUserId } : {}),
          ...(status === 'CANCELLED' && managedByInternalUserId ? { cancelledByInternalUserId: managedByInternalUserId } : {}),
          ...(managedByInternalUserId ? { managedByInternalUserId } : {}),
        },
        include: this.requestInclude,
      });
    });

    await this.auditService.record({
      actorType: audit.actorType,
      actorCustomerId: audit.actorCustomerId,
      actorInternalUserId: audit.actorInternalUserId,
      action: audit.action,
      module: 'redemption_requests',
      entityType: 'RedemptionRequest',
      entityId: updated.id,
      metadata: {
        requestCode: updated.requestCode,
        customerId: updated.customerId,
        customerCode: updated.customer.code,
        productId: updated.productId,
        pointsReleased: updated.pointsReserved,
        reason,
        previousStatus: redemptionRequest.status,
        status: updated.status,
        newStatus: updated.status,
        comment: reason,
      },
      ipAddress: audit.request.ip,
      userAgent: audit.request.headers['user-agent'],
    });

    await this.notificationsService.notifySystemCustomer(
      updated.customerId,
      this.releaseCustomerTitle(status),
      `Tu solicitud ${updated.requestCode} fue ${this.releaseLabel(status).toLowerCase()}: ${reason}`,
      { redemptionRequestId: updated.id, requestCode: updated.requestCode, reason },
    );

    return updated;
  }

  private releaseLabel(status: 'CANCELLED' | 'REJECTED' | 'EXPIRED') {
    if (status === 'CANCELLED') return 'Cancelacion';
    if (status === 'REJECTED') return 'Rechazo';
    return 'Vencimiento';
  }

  private releaseCustomerTitle(status: 'CANCELLED' | 'REJECTED' | 'EXPIRED') {
    if (status === 'CANCELLED') return 'Canje cancelado';
    if (status === 'REJECTED') return 'Canje rechazado';
    return 'Canje vencido';
  }

  private async recordAndNotify(
    updated: RedemptionRequestWithRelations,
    actor: InternalAuthUser,
    request: FastifyRequest,
    action: string,
    customerTitle: string,
    customerBody: string,
    metadata: Record<string, unknown> = {},
  ) {
    await this.auditService.record({
      actorType: 'INTERNAL_USER',
      actorInternalUserId: actor.id,
      action,
      module: 'redemption_requests',
      entityType: 'RedemptionRequest',
      entityId: updated.id,
      metadata: {
        requestCode: updated.requestCode,
        customerId: updated.customerId,
        productId: updated.productId,
        status: updated.status,
        newStatus: updated.status,
        ...metadata,
      },
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });

    await this.notificationsService.notifySystemCustomer(updated.customerId, customerTitle, customerBody, {
      redemptionRequestId: updated.id,
      requestCode: updated.requestCode,
    });
  }

  private validationQrPayload(input: { requestCode: string }) {
    return {
      type: 'LOYALTY_REDEMPTION',
      requestCode: input.requestCode,
      validationCode: input.requestCode,
    };
  }

  private operationalValidationsSnapshot(input: { customerActive: boolean; pointsSufficient: boolean; productAvailable: boolean }) {
    return {
      customerActive: input.customerActive,
      pointsSufficient: input.pointsSufficient,
      productAvailable: input.productAvailable,
      capturedAt: new Date().toISOString(),
    };
  }

  private async generateCode() {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const letterPart = Array.from({ length: 4 }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
      const digitPart = Math.floor(100000 + Math.random() * 900000);
      const code = `${letterPart}${digitPart}`;
      const existing = await this.prisma.redemptionRequest.findUnique({
        where: { requestCode: code },
        select: { id: true },
      });

      if (!existing) {
        return code;
      }
    }

    throw new ConflictException('No se pudo generar un codigo de canje unico. Intenta de nuevo.');
  }

  private readonly requestInclude = {
    customer: {
      select: {
        id: true,
        code: true,
        fullName: true,
        phone: true,
        email: true,
        status: true,
        loyaltyLevel: true,
        registrationSource: true,
      },
    },
    product: {
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        pointsValue: true,
        stock: true,
        imageUrl: true,
        requiresApproval: true,
        isGiftCard: true,
        category: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    },
    pickupStore: {
      select: {
        id: true,
        code: true,
        name: true,
      },
    },
    managedByInternalUser: {
      select: {
        id: true,
        fullName: true,
        email: true,
        roleAssignments: {
          take: 1,
          select: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    },
    approvedByInternalUser: {
      select: {
        id: true,
        fullName: true,
        email: true,
        roleAssignments: { take: 1, select: { role: { select: { id: true, name: true } } } },
      },
    },
    sentToStoreByInternalUser: {
      select: {
        id: true,
        fullName: true,
        email: true,
        roleAssignments: { take: 1, select: { role: { select: { id: true, name: true } } } },
      },
    },
    preparedByInternalUser: {
      select: {
        id: true,
        fullName: true,
        email: true,
        roleAssignments: { take: 1, select: { role: { select: { id: true, name: true } } } },
      },
    },
    deliveredByInternalUser: {
      select: {
        id: true,
        fullName: true,
        email: true,
        roleAssignments: { take: 1, select: { role: { select: { id: true, name: true } } } },
      },
    },
    rejectedByInternalUser: {
      select: {
        id: true,
        fullName: true,
        email: true,
        roleAssignments: { take: 1, select: { role: { select: { id: true, name: true } } } },
      },
    },
    cancelledByInternalUser: {
      select: {
        id: true,
        fullName: true,
        email: true,
        roleAssignments: { take: 1, select: { role: { select: { id: true, name: true } } } },
      },
    },
    pointMovement: true,
  } as const;

  private readonly customerRequestInclude = {
    product: {
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        pointsValue: true,
        imageUrl: true,
        requiresApproval: true,
        isGiftCard: true,
      },
    },
    pickupStore: {
      select: {
        id: true,
        code: true,
        name: true,
      },
    },
  } as const;
}
