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
import { InternalAuthUser } from '../auth/auth.types';
import { PrismaService } from '../database/prisma.service';
import { LoyaltyLevelsService } from '../loyalty-levels/loyalty-levels.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PointPromotionsService } from '../points/point-promotions.service';
import { PointRulesService } from '../points/point-rules.service';
import { SettingsService } from '../settings/settings.service';
import { ApprovePurchaseInput, PurchaseEntryInput, PurchaseSearchInput, RejectPurchaseInput, ReversePurchaseInput } from './purchase.schemas';

interface PurchaseContext {
  store: {
    id: string;
    code: string;
    name: string;
    brandId: string | null;
  };
  customer: {
    id: string;
    code: string;
    fullName: string;
    taxId: string | null;
    status: string;
    loyaltyLevel: string;
  };
  pointRule: Prisma.PointRuleGetPayload<Record<string, never>>;
}

@Injectable()
export class PurchasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly pointRulesService: PointRulesService,
    private readonly pointPromotionsService: PointPromotionsService,
    private readonly settingsService: SettingsService,
    private readonly notificationsService: NotificationsService,
    private readonly loyaltyLevelsService: LoyaltyLevelsService,
  ) {}

  async preview(input: PurchaseEntryInput, actor: InternalAuthUser) {
    const context = await this.resolveContext(input, actor);
    const basePoints = this.calculateBasePoints(input.amount, context.pointRule);
    const promotion = await this.pointPromotionsService.findApplicablePromotion({
      amount: input.amount,
      storeId: context.store.id,
      brandItemId: context.store.brandId,
      shoeTypeId: input.shoeTypeId,
      customerLevel: context.customer.loyaltyLevel,
    });
    const points = this.pointPromotionsService.applyPromotion(basePoints, promotion);
    const review = await this.resolveReviewDecision(input.amount, points);

    return {
      customer: context.customer,
      store: context.store,
      invoiceNumber: input.invoiceNumber,
      amount: input.amount,
      pointsCalculated: points,
      requiresReview: review.requiresReview,
      reviewReasons: review.reasons,
      status: review.requiresReview ? 'PENDING_REVIEW' : 'APPROVED',
      pointRule: {
        id: context.pointRule.id,
        name: context.pointRule.name,
        amountPerPoint: context.pointRule.amountPerPoint.toString(),
        pointValueAmount: context.pointRule.pointValueAmount.toString(),
        minimumAmount: context.pointRule.minimumAmount.toString(),
        maxPointsPerPurchase: context.pointRule.maxPointsPerPurchase,
        pointsExpirationDays: context.pointRule.pointsExpirationDays,
      },
      promotion,
      basePointsCalculated: basePoints,
    };
  }

  async create(input: PurchaseEntryInput, actor: InternalAuthUser, request: FastifyRequest) {
    const context = await this.resolveContext(input, actor);
    const basePoints = this.calculateBasePoints(input.amount, context.pointRule);
    const promotion = await this.pointPromotionsService.findApplicablePromotion({
      amount: input.amount,
      storeId: context.store.id,
      brandItemId: context.store.brandId,
      shoeTypeId: input.shoeTypeId,
      customerLevel: context.customer.loyaltyLevel,
    });
    const points = this.pointPromotionsService.applyPromotion(basePoints, promotion);
    const pointsExpireAt = this.calculatePointExpiration(context.pointRule.pointsExpirationDays);
    const pointRuleSnapshot = this.pointRuleSnapshot(context.pointRule, input.amount, basePoints, points);
    const pointPromotionSnapshot = promotion ? this.pointPromotionSnapshot(promotion, basePoints, points) : undefined;
    const review = await this.resolveReviewDecision(input.amount, points);

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const duplicate = await tx.purchase.findUnique({
          where: {
            storeId_invoiceNumber: {
              storeId: context.store.id,
              invoiceNumber: input.invoiceNumber,
            },
          },
          select: {
            id: true,
            invoiceNumber: true,
            amount: true,
            createdAt: true,
          },
        });

        if (duplicate) {
          throw new ConflictException({
            message: 'Ya existe una compra registrada con este No. de factura en la tienda activa.',
            duplicate: {
              id: duplicate.id,
              invoiceNumber: duplicate.invoiceNumber,
              amount: duplicate.amount.toString(),
              createdAt: duplicate.createdAt,
            },
          });
        }

        const purchase = await tx.purchase.create({
          data: {
            customerId: input.customerId,
            storeId: context.store.id,
            internalUserId: actor.id,
            invoiceNumber: input.invoiceNumber,
            externalSource: input.externalSource,
            externalInvoiceId: input.externalInvoiceId,
            externalSyncedAt: input.externalSource && input.externalInvoiceId ? new Date() : undefined,
            amount: input.amount.toFixed(2),
            shoeTypeId: input.shoeTypeId,
            categoryId: input.categoryId,
            brandId: input.brandId,
            pointsCalculated: points,
            status: review.requiresReview ? 'PENDING_REVIEW' : 'APPROVED',
            externalPayload: review.requiresReview
              ? {
                  ...(input.externalSource && input.externalInvoiceId ? { externalSource: input.externalSource, externalInvoiceId: input.externalInvoiceId } : {}),
                  review: {
                    reasons: review.reasons,
                    pointRule: pointRuleSnapshot,
                    promotionApplied: pointPromotionSnapshot ?? null,
                  },
                }
              : undefined,
          },
          include: this.purchaseInclude,
        });

        const pointMovement =
          !review.requiresReview && points > 0
            ? await tx.pointMovement.create({
                data: {
                  customerId: input.customerId,
                  purchaseId: purchase.id,
                  pointRuleId: context.pointRule.id,
                  pointPromotionId: promotion?.id,
                  type: 'PURCHASE_EARNED',
                  status: 'AVAILABLE',
                  points,
                  basePointsCalculated: basePoints,
                  pointsBeforePromotion: basePoints,
                  pointRuleSnapshot,
                  pointPromotionSnapshot,
                  description: `Puntos por factura No. ${input.invoiceNumber}`,
                  expiresAt: pointsExpireAt,
                },
              })
            : null;

        if (!review.requiresReview) {
          await this.loyaltyLevelsService.recalculateCustomerLevel(input.customerId, tx);
        }

        return { purchase, pointMovement };
      });

      await this.auditService.record({
        actorType: 'INTERNAL_USER',
        actorInternalUserId: actor.id,
        action: 'purchases.create',
        module: 'purchases',
        entityType: 'Purchase',
        entityId: result.purchase.id,
        storeId: context.store.id,
        metadata: {
          customerId: input.customerId,
          customerCode: context.customer.code,
          invoiceNumber: input.invoiceNumber,
          externalSource: input.externalSource,
          externalInvoiceId: input.externalInvoiceId,
          amount: input.amount.toFixed(2),
          pointsCalculated: points,
          status: review.requiresReview ? 'PENDING_REVIEW' : 'APPROVED',
          reviewReasons: review.reasons,
          basePointsCalculated: basePoints,
          pointRule: pointRuleSnapshot,
          promotionApplied: pointPromotionSnapshot ?? null,
          pointsExpireAt: pointsExpireAt?.toISOString() ?? null,
          pointMovementId: result.pointMovement?.id ?? null,
        },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });

      if (!review.requiresReview && promotion && result.pointMovement) {
        await this.pointPromotionsService.markUsed(promotion.id);
      }

      if (!review.requiresReview && result.pointMovement) {
        await this.notificationsService.notifyPointsEarned(input.customerId, points, `la factura ${input.invoiceNumber}`, {
          purchaseId: result.purchase.id,
          pointMovementId: result.pointMovement.id,
          promotionId: promotion?.id ?? null,
          storeId: context.store.id,
        });
      }

      return result;
    } catch (error) {
      if (error instanceof ConflictException) {
        await this.auditService.record({
          actorType: 'INTERNAL_USER',
          actorInternalUserId: actor.id,
          action: 'purchases.duplicate_invoice_attempt',
          module: 'purchases',
          entityType: 'Purchase',
          storeId: context.store.id,
          metadata: {
            customerId: input.customerId,
            invoiceNumber: input.invoiceNumber,
            externalSource: input.externalSource,
            externalInvoiceId: input.externalInvoiceId,
            amount: input.amount.toFixed(2),
          },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        });
        throw error;
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Ya existe una compra registrada con este No. de factura en la tienda activa.');
      }

      throw error;
    }
  }

  async search(input: PurchaseSearchInput, actor: InternalAuthUser) {
    const storeIds = this.resolveReadableStoreIds(input.scope, actor);
    const where: Prisma.PurchaseWhereInput = {
      ...(storeIds ? { storeId: { in: storeIds } } : {}),
      customerId: input.customerId,
      invoiceNumber: input.invoiceNumber ? { contains: input.invoiceNumber, mode: 'insensitive' } : undefined,
      status: input.status,
      shoeTypeId: input.shoeTypeId,
      purchasedAt: {
        ...(input.from ? { gte: input.from } : {}),
        ...(input.to ? { lte: input.to } : {}),
      },
      ...(input.search
        ? {
            OR: [
              { invoiceNumber: { contains: input.search, mode: 'insensitive' } },
              { customer: { fullName: { contains: input.search, mode: 'insensitive' } } },
              { customer: { code: { contains: input.search, mode: 'insensitive' } } },
              { customer: { taxId: { contains: input.search.toUpperCase().replace(/[^0-9A-Z-]/g, '') || input.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const total = await this.prisma.purchase.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / input.limit));
    const page = Math.min(input.page, totalPages);

    const purchases = await this.prisma.purchase.findMany({
      where,
      orderBy: { purchasedAt: 'desc' },
      skip: (page - 1) * input.limit,
      take: input.limit,
      include: this.purchaseInclude,
    });

    const brandNameByItemId = await this.resolveBrandNames(
      purchases.map((purchase) => purchase.store.brandId).filter((brandId): brandId is string => Boolean(brandId)),
    );

    return {
      data: purchases.map((purchase) => ({
        ...purchase,
        store: {
          ...purchase.store,
          brandName: purchase.store.brandId ? brandNameByItemId.get(purchase.store.brandId) ?? null : null,
        },
        appliedPromotion: purchase.pointMovements.find((movement) => movement.pointPromotionId)?.pointPromotionSnapshot ?? null,
        appliedPromotionName:
          (purchase.pointMovements.find((movement) => movement.pointPromotionId)?.pointPromotionSnapshot as { name?: string } | null)?.name
          ?? 'Regla general de puntos',
      })),
      meta: {
        page,
        limit: input.limit,
        total,
        totalPages,
      },
    };
  }

  async get(id: string, actor: InternalAuthUser) {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id },
      include: this.purchaseInclude,
    });

    if (!purchase) {
      throw new NotFoundException('Compra no encontrada.');
    }

    if (!actor.permissions.includes('purchases.read_all') && !actor.storeIds.includes(purchase.storeId)) {
      throw new ForbiddenException('No puedes consultar compras de una tienda no asignada.');
    }

    return purchase;
  }

  async approve(id: string, input: ApprovePurchaseInput, actor: InternalAuthUser, request: FastifyRequest) {
    const existingPurchase = await this.prisma.purchase.findUnique({
      where: { id },
      include: this.purchaseInclude,
    });

    if (!existingPurchase) {
      throw new NotFoundException('Compra no encontrada.');
    }

    if (!actor.storeIds.includes(existingPurchase.storeId)) {
      throw new ForbiddenException('No puedes aprobar compras de una tienda no asignada.');
    }

    if (existingPurchase.status !== 'PENDING_REVIEW') {
      throw new BadRequestException('Solo se pueden aprobar compras pendientes de revision.');
    }

    const [pointRule, promotion] = await Promise.all([
      this.pointRulesService.getActiveRule(existingPurchase.store.brandId),
      this.pointPromotionsService.findApplicablePromotion({
        amount: Number(existingPurchase.amount),
        storeId: existingPurchase.storeId,
        brandItemId: existingPurchase.store.brandId,
        shoeTypeId: existingPurchase.shoeTypeId,
        customerLevel: existingPurchase.customer.loyaltyLevel,
      }),
    ]);
    const basePoints = this.calculateBasePoints(Number(existingPurchase.amount), pointRule);
    const points = this.pointPromotionsService.applyPromotion(basePoints, promotion);
    const pointsExpireAt = this.calculatePointExpiration(pointRule.pointsExpirationDays);
    const pointRuleSnapshot = this.pointRuleSnapshot(pointRule, Number(existingPurchase.amount), basePoints, points);
    const pointPromotionSnapshot = promotion ? this.pointPromotionSnapshot(promotion, basePoints, points) : undefined;

    const result = await this.prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.update({
        where: { id },
        data: {
          status: 'APPROVED',
          pointsCalculated: points,
        },
        include: this.purchaseInclude,
      });

      const pointMovement =
        points > 0
          ? await tx.pointMovement.create({
              data: {
                customerId: purchase.customerId,
                purchaseId: purchase.id,
                pointRuleId: pointRule.id,
                pointPromotionId: promotion?.id,
                type: 'PURCHASE_EARNED',
                status: 'AVAILABLE',
                points,
                basePointsCalculated: basePoints,
                pointsBeforePromotion: basePoints,
                pointRuleSnapshot,
                pointPromotionSnapshot,
                description: `Puntos por aprobacion de factura No. ${purchase.invoiceNumber}`,
                expiresAt: pointsExpireAt,
              },
            })
          : null;

      await this.loyaltyLevelsService.recalculateCustomerLevel(purchase.customerId, tx);

      const refreshedPurchase = await tx.purchase.findUniqueOrThrow({
        where: { id },
        include: this.purchaseInclude,
      });

      return { purchase: refreshedPurchase, pointMovement };
    });

    await this.auditService.record({
      actorType: 'INTERNAL_USER',
      actorInternalUserId: actor.id,
      action: 'purchases.review_approve',
      module: 'purchases',
      entityType: 'Purchase',
      entityId: id,
      storeId: existingPurchase.storeId,
      metadata: {
        customerId: existingPurchase.customerId,
        invoiceNumber: existingPurchase.invoiceNumber,
        amount: existingPurchase.amount.toString(),
        reason: input.reason ?? null,
        pointsCalculated: points,
        pointMovementId: result.pointMovement?.id ?? null,
        promotionApplied: pointPromotionSnapshot ?? null,
      },
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });

    if (promotion && result.pointMovement) {
      await this.pointPromotionsService.markUsed(promotion.id);
    }

    if (result.pointMovement) {
      await this.notificationsService.notifyPointsEarned(existingPurchase.customerId, points, `la factura ${existingPurchase.invoiceNumber}`, {
        purchaseId: result.purchase.id,
        pointMovementId: result.pointMovement.id,
        promotionId: promotion?.id ?? null,
        storeId: existingPurchase.storeId,
      });
    }

    return result.purchase;
  }

  async reject(id: string, input: RejectPurchaseInput, actor: InternalAuthUser, request: FastifyRequest) {
    const existingPurchase = await this.prisma.purchase.findUnique({
      where: { id },
      include: this.purchaseInclude,
    });

    if (!existingPurchase) {
      throw new NotFoundException('Compra no encontrada.');
    }

    if (!actor.storeIds.includes(existingPurchase.storeId)) {
      throw new ForbiddenException('No puedes rechazar compras de una tienda no asignada.');
    }

    if (existingPurchase.status !== 'PENDING_REVIEW') {
      throw new BadRequestException('Solo se pueden rechazar compras pendientes de revision.');
    }

    const purchase = await this.prisma.purchase.update({
      where: { id },
      data: {
        status: 'REJECTED',
        pointsCalculated: 0,
      },
      include: this.purchaseInclude,
    });

    await this.auditService.record({
      actorType: 'INTERNAL_USER',
      actorInternalUserId: actor.id,
      action: 'purchases.review_reject',
      module: 'purchases',
      entityType: 'Purchase',
      entityId: id,
      storeId: existingPurchase.storeId,
      metadata: {
        customerId: existingPurchase.customerId,
        invoiceNumber: existingPurchase.invoiceNumber,
        amount: existingPurchase.amount.toString(),
        reason: input.reason,
      },
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });

    return purchase;
  }

  async reverse(id: string, input: ReversePurchaseInput, actor: InternalAuthUser, request: FastifyRequest) {
    const existingPurchase = await this.prisma.purchase.findUnique({
      where: { id },
      include: this.purchaseInclude,
    });

    if (!existingPurchase) {
      throw new NotFoundException('Compra no encontrada.');
    }

    if (!actor.storeIds.includes(existingPurchase.storeId)) {
      throw new ForbiddenException('No puedes reversar compras de una tienda no asignada.');
    }

    if (existingPurchase.status !== 'APPROVED') {
      throw new BadRequestException('Solo se pueden reversar compras aprobadas.');
    }

    const reversalExists = existingPurchase.pointMovements.some(
      (movement) => movement.type === 'PURCHASE_REVERSED' && movement.status === 'REVERSED',
    );

    if (reversalExists) {
      throw new ConflictException('Esta compra ya fue reversada.');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.update({
        where: { id },
        data: { status: 'REVERSED' },
        include: this.purchaseInclude,
      });

      const earnedMovementIds = purchase.pointMovements
        .filter((movement) => movement.type === 'PURCHASE_EARNED' && movement.status === 'AVAILABLE')
        .map((movement) => movement.id);

      if (earnedMovementIds.length > 0) {
        await tx.pointMovement.updateMany({
          where: { id: { in: earnedMovementIds } },
          data: { status: 'REVERSED' },
        });
      }

      const reversalMovement =
        purchase.pointsCalculated > 0
          ? await tx.pointMovement.create({
              data: {
                customerId: purchase.customerId,
                purchaseId: purchase.id,
                type: 'PURCHASE_REVERSED',
                status: 'REVERSED',
                points: -purchase.pointsCalculated,
                description: `Reversa de factura No. ${purchase.invoiceNumber}: ${input.reason}`,
              },
            })
          : null;

      await this.loyaltyLevelsService.recalculateCustomerLevel(purchase.customerId, tx);

      const refreshedPurchase = await tx.purchase.findUniqueOrThrow({
        where: { id },
        include: this.purchaseInclude,
      });

      return { purchase: refreshedPurchase, reversalMovement };
    });

    await this.auditService.record({
      actorType: 'INTERNAL_USER',
      actorInternalUserId: actor.id,
      action: 'purchases.reverse',
      module: 'purchases',
      entityType: 'Purchase',
      entityId: id,
      storeId: existingPurchase.storeId,
      metadata: {
        customerId: existingPurchase.customerId,
        invoiceNumber: existingPurchase.invoiceNumber,
        amount: existingPurchase.amount.toString(),
        pointsReversed: existingPurchase.pointsCalculated,
        reason: input.reason,
        reversalMovementId: result.reversalMovement?.id ?? null,
      },
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });

    if (result.reversalMovement) {
      await this.notificationsService.notifyPointsReversed(existingPurchase.customerId, existingPurchase.pointsCalculated, `la factura ${existingPurchase.invoiceNumber}`, {
        purchaseId: result.purchase.id,
        pointMovementId: result.reversalMovement.id,
        storeId: existingPurchase.storeId,
        reason: input.reason,
      });
    }

    return result.purchase;
  }

  private async resolveContext(input: PurchaseEntryInput, actor: InternalAuthUser): Promise<PurchaseContext> {
    const activeStoreId = actor.activeStoreId;

    if (!activeStoreId) {
      throw new BadRequestException('Debes seleccionar una tienda activa antes de registrar compras.');
    }

    if (!actor.storeIds.includes(activeStoreId)) {
      throw new ForbiddenException('La tienda activa no pertenece al usuario autenticado.');
    }

    const [store, customer] = await Promise.all([
      this.prisma.store.findUnique({
        where: { id: activeStoreId },
        select: {
          id: true,
          code: true,
          name: true,
          status: true,
          brandId: true,
        },
      }),
      this.prisma.customer.findUnique({
        where: { id: input.customerId },
        select: {
          id: true,
          code: true,
          fullName: true,
          taxId: true,
          status: true,
          loyaltyLevel: true,
        },
      }),
    ]);

    if (!store) {
      throw new NotFoundException('Tienda activa no encontrada.');
    }

    const pointRule = await this.pointRulesService.getActiveRule(store.brandId);

    if (store.status !== 'ACTIVE') {
      throw new BadRequestException('La tienda activa esta inactiva.');
    }

    if (!customer) {
      throw new NotFoundException('Cliente no encontrado.');
    }

    if (customer.status !== 'ACTIVE') {
      throw new BadRequestException('No puedes registrar compras para un cliente inactivo o bloqueado.');
    }

    if (!customer.taxId) {
      throw new BadRequestException('El cliente seleccionado no tiene NIT registrado.');
    }

    if (customer.taxId !== input.customerTaxId) {
      throw new BadRequestException('El NIT ingresado no corresponde al cliente seleccionado.');
    }

    await this.assertCatalogItem(input.shoeTypeId, 'SHOE_TYPES', 'Tipo de producto invalido o inactivo.');

    if (input.categoryId) {
      await this.assertCatalogItem(input.categoryId, 'PRODUCT_CATEGORIES', 'Categoria invalida o inactiva.');
    }

    if (input.brandId) {
      await this.assertCatalogItem(input.brandId, 'BRANDS', 'Marca invalida o inactiva.');
    }

    return {
      store,
      customer,
      pointRule,
    };
  }

  private async assertCatalogItem(itemId: string, catalogCode: string, message: string) {
    const item = await this.prisma.catalogItem.findUnique({
      where: { id: itemId },
      include: {
        catalog: true,
        parentItem: {
          include: {
            catalog: true,
            parentItem: true,
          },
        },
      },
    });

    if (!item || !item.isActive || !item.catalog.isActive || item.catalog.code !== catalogCode || !this.hasActiveParentChain(item)) {
      throw new BadRequestException(message);
    }
  }

  private hasActiveParentChain(item: { parentItem?: ({ isActive: boolean; parentItem?: { isActive: boolean } | null }) | null }) {
    if (!item.parentItem) return true;
    if (!item.parentItem.isActive) return false;
    if (item.parentItem.parentItem && !item.parentItem.parentItem.isActive) return false;

    return true;
  }

  private calculateBasePoints(amount: number, pointRule: Prisma.PointRuleGetPayload<Record<string, never>>) {
    const amountPerPoint = Number(pointRule.amountPerPoint);

    if (amountPerPoint <= 0) {
      throw new BadRequestException('La configuracion de puntos no es valida.');
    }

    if (amount < Number(pointRule.minimumAmount)) {
      return 0;
    }

    const rawPoints = amount / amountPerPoint;
    const roundedPoints = Math.floor(rawPoints);
    const cappedPoints =
      pointRule.maxPointsPerPurchase && roundedPoints > pointRule.maxPointsPerPurchase
        ? pointRule.maxPointsPerPurchase
        : roundedPoints;

    return Math.max(0, cappedPoints);
  }

  private pointRuleSnapshot(pointRule: Prisma.PointRuleGetPayload<Record<string, never>>, amount: number, basePoints: number, finalPoints: number) {
    return {
      id: pointRule.id,
      name: pointRule.name,
      amountPerPoint: pointRule.amountPerPoint.toString(),
      pointValueAmount: pointRule.pointValueAmount.toString(),
      minimumAmount: pointRule.minimumAmount.toString(),
      maxPointsPerPurchase: pointRule.maxPointsPerPurchase,
      pointsExpirationDays: pointRule.pointsExpirationDays,
      invoiceAmount: amount.toFixed(2),
      basePointsCalculated: basePoints,
      pointsAccredited: finalPoints,
    } satisfies Prisma.InputJsonValue;
  }

  private pointPromotionSnapshot(promotion: Prisma.PointPromotionGetPayload<Record<string, never>>, basePoints: number, finalPoints: number) {
    return {
      id: promotion.id,
      name: promotion.name,
      type: promotion.type,
      multiplier: promotion.multiplier?.toString() ?? null,
      bonusPoints: promotion.bonusPoints,
      minimumAmount: promotion.minimumAmount?.toString() ?? null,
      priority: promotion.priority,
      basePointsCalculated: basePoints,
      pointsAccredited: finalPoints,
    } satisfies Prisma.InputJsonValue;
  }

  private calculatePointExpiration(expirationDays: number | null) {
    if (!expirationDays) return null;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expirationDays);
    return expiresAt;
  }

  private async resolveReviewDecision(amount: number, points: number) {
    const setting = await this.settingsService.getPurchaseReview();

    if (!setting.isEnabled) {
      return { requiresReview: false, reasons: [] as string[] };
    }

    const reasons: string[] = [];

    if (setting.amountThreshold !== null && amount >= setting.amountThreshold) {
      reasons.push(`Monto igual o mayor a Q${setting.amountThreshold.toFixed(2)}.`);
    }

    if (setting.pointsThreshold !== null && points >= setting.pointsThreshold) {
      reasons.push(`Puntos calculados iguales o mayores a ${setting.pointsThreshold}.`);
    }

    return {
      requiresReview: reasons.length > 0,
      reasons,
    };
  }

  private async resolveBrandNames(brandItemIds: string[]) {
    const uniqueIds = [...new Set(brandItemIds)];
    if (uniqueIds.length === 0) {
      return new Map<string, string>();
    }

    const items = await this.prisma.catalogItem.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, name: true },
    });

    return new Map(items.map((item) => [item.id, item.name]));
  }

  private resolveReadableStoreIds(scope: PurchaseSearchInput['scope'], actor: InternalAuthUser) {
    if (scope === 'ALL') {
      if (!actor.permissions.includes('purchases.read_all')) {
        throw new ForbiddenException('No tienes permiso para consultar compras de todas las tiendas y marcas.');
      }
      return undefined;
    }

    if (scope === 'ALL_ASSIGNED') {
      if (actor.storeIds.length === 0) {
        throw new ForbiddenException('No tienes tiendas asignadas.');
      }

      return actor.storeIds;
    }

    if (!actor.activeStoreId) {
      throw new BadRequestException('Debes seleccionar una tienda activa para consultar compras.');
    }

    if (!actor.storeIds.includes(actor.activeStoreId)) {
      throw new ForbiddenException('La tienda activa no pertenece al usuario autenticado.');
    }

    return [actor.activeStoreId];
  }

  private readonly purchaseInclude = {
    customer: {
      select: {
        id: true,
        code: true,
        fullName: true,
        phone: true,
        taxId: true,
        loyaltyLevel: true,
      },
    },
    store: {
      select: {
        id: true,
        code: true,
        name: true,
        brandId: true,
      },
    },
    internalUser: {
      select: {
        id: true,
        fullName: true,
        email: true,
      },
    },
    pointMovements: true,
  } satisfies Prisma.PurchaseInclude;
}
