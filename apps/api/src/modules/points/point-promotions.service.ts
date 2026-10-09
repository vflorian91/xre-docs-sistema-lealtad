import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PointPromotion, Prisma } from '@prisma/client';
import { FastifyRequest } from 'fastify';
import { AuditService } from '../audit/audit.service';
import { InternalAuthUser } from '../auth/auth.types';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreatePointPromotionInput, ListPointPromotionsInput } from './point-promotion.schemas';

type PromotionContext = {
  amount: number;
  storeId: string;
  brandItemId?: string | null;
  shoeTypeId?: string | null;
  customerLevel?: string | null;
  purchasedAt?: Date;
};

@Injectable()
export class PointPromotionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async list(input: ListPointPromotionsInput) {
    const where: Prisma.PointPromotionWhereInput = {
      ...(input.search ? { name: { contains: input.search, mode: 'insensitive' } } : {}),
      ...(input.status ? { status: input.status } : {}),
    };
    const total = await this.prisma.pointPromotion.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / input.limit));
    const page = Math.min(input.page, totalPages);
    const data = await this.prisma.pointPromotion.findMany({
      where,
      orderBy: [{ status: 'asc' }, { startsAt: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * input.limit,
      take: input.limit,
      include: { store: { select: { id: true, code: true, name: true } }, brand: { select: { id: true, code: true, name: true } } },
    });

    return {
      data,
      meta: { page, limit: input.limit, total, totalPages },
    };
  }

  async get(id: string) {
    const promotion = await this.prisma.pointPromotion.findUnique({
      where: { id },
      include: { store: { select: { id: true, code: true, name: true } }, brand: { select: { id: true, code: true, name: true } }, pointMovements: { take: 1, select: { id: true } } },
    });

    if (!promotion) {
      throw new NotFoundException('Promocion no encontrada.');
    }

    return {
      ...promotion,
      hasUsage: promotion.pointMovements.length > 0,
    };
  }

  async listActiveForUser(user: InternalAuthUser) {
    const now = new Date();
    const storeId = user.activeStoreId;

    const promotions = await this.prisma.pointPromotion.findMany({
      where: {
        status: 'ACTIVE',
        startsAt: { lte: now },
        endsAt: { gte: now },
        OR: [
          { storeId: null },
          ...(storeId ? [{ storeId }] : []),
        ],
      },
      orderBy: [{ priority: 'asc' }, { endsAt: 'asc' }, { createdAt: 'desc' }],
      take: 10,
      include: { store: { select: { id: true, code: true, name: true } } },
    });

    return promotions.map((promotion) => ({
      id: promotion.id,
      name: promotion.name,
      type: promotion.type,
      multiplier: promotion.multiplier,
      bonusPoints: promotion.bonusPoints,
      minimumAmount: promotion.minimumAmount,
      startsAt: promotion.startsAt,
      endsAt: promotion.endsAt,
      targetLevels: promotion.targetLevels,
      store: promotion.store,
      priority: promotion.priority,
    }));
  }

  async create(input: CreatePointPromotionInput, actor: InternalAuthUser, request: FastifyRequest) {
    await this.assertNoConflict(input);
    await this.assertReferences(input);

    const promotion = await this.prisma.pointPromotion.create({
      data: {
        name: input.name,
        type: input.type,
        multiplier: this.resolveMultiplier(input),
        bonusPoints: input.bonusPoints ?? undefined,
        minimumAmount: input.minimumAmount == null ? undefined : input.minimumAmount.toFixed(2),
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        targetLevels: this.sortLevels(input.targetLevels),
        storeId: input.storeId ?? undefined,
        brandItemId: input.brandItemId ?? undefined,
        zoneId: input.zoneId ?? undefined,
        departmentId: input.departmentId ?? undefined,
        municipalityId: input.municipalityId ?? undefined,
        shoeTypeId: input.shoeTypeId ?? undefined,
        priority: this.resolvePriority(input),
        createdByInternalUserId: actor.id,
      },
    });

    await this.auditService.record({
      actorType: 'INTERNAL_USER',
      actorInternalUserId: actor.id,
      action: 'points.promotions.create',
      module: 'points',
      entityType: 'PointPromotion',
      entityId: promotion.id,
      metadata: { name: promotion.name, type: promotion.type, startsAt: promotion.startsAt.toISOString(), endsAt: promotion.endsAt.toISOString() },
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });

    await this.notificationsService.notifyPointPromotionCreated({
      promotionId: promotion.id,
      name: promotion.name,
      startsAt: promotion.startsAt,
      endsAt: promotion.endsAt,
      targetLevels: promotion.targetLevels,
    });

    return promotion;
  }

  async finish(id: string, actor: InternalAuthUser, request: FastifyRequest) {
    const existing = await this.prisma.pointPromotion.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Promocion no encontrada.');
    }

    if (existing.status !== 'ACTIVE') {
      throw new BadRequestException('Solo se pueden finalizar promociones activas.');
    }

    const promotion = await this.prisma.pointPromotion.update({
      where: { id },
      data: { status: 'ENDED', endsAt: new Date() },
    });

    await this.auditService.record({
      actorType: 'INTERNAL_USER',
      actorInternalUserId: actor.id,
      action: 'points.promotions.finish',
      module: 'points',
      entityType: 'PointPromotion',
      entityId: promotion.id,
      metadata: { name: promotion.name },
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });

    return promotion;
  }

  async findApplicablePromotion(context: PromotionContext) {
    const purchasedAt = context.purchasedAt ?? new Date();
    const promotions = await this.prisma.pointPromotion.findMany({
      where: {
        status: 'ACTIVE',
        startsAt: { lte: purchasedAt },
        endsAt: { gte: purchasedAt },
        OR: [{ minimumAmount: null }, { minimumAmount: { lte: context.amount } }],
        AND: [
          { OR: [{ storeId: null }, { storeId: context.storeId }] },
          { OR: [{ brandItemId: null }, { brandItemId: context.brandItemId ?? '__NO_BRAND__' }] },
          { OR: [{ shoeTypeId: null }, { shoeTypeId: context.shoeTypeId ?? '__NO_SHOE_TYPE__' }] },
          { OR: [{ targetLevels: { isEmpty: true } }, ...(context.customerLevel ? [{ targetLevels: { has: context.customerLevel } }] : [])] },
        ],
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    });

    return promotions[0] ?? null;
  }

  async markUsed(id: string) {
    await this.prisma.pointPromotion.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  applyPromotion(basePoints: number, promotion: PointPromotion | null) {
    if (!promotion) return basePoints;

    if (promotion.type === 'FIXED_BONUS') {
      return Math.max(0, basePoints + (promotion.bonusPoints ?? 0));
    }

    const multiplier = Number(promotion.multiplier ?? 1);
    return Math.max(0, Math.floor(basePoints * multiplier));
  }

  private async assertNoConflict(input: CreatePointPromotionInput) {
    const conflict = await this.prisma.pointPromotion.findFirst({
      where: {
        status: 'ACTIVE',
        type: input.type,
        storeId: input.storeId ?? null,
        brandItemId: input.brandItemId ?? null,
        targetLevels: { equals: this.sortLevels(input.targetLevels) },
        shoeTypeId: input.shoeTypeId ?? null,
        startsAt: { lte: input.endsAt },
        endsAt: { gte: input.startsAt },
      },
    });

    if (conflict) {
      throw new ConflictException('Ya existe una promocion activa conflictiva para el mismo alcance, periodo y condicion.');
    }
  }

  private sortLevels(levels?: string[] | null) {
    return [...(levels ?? [])].sort();
  }

  private async assertReferences(input: CreatePointPromotionInput) {
    if (input.storeId) {
      const store = await this.prisma.store.findUnique({ where: { id: input.storeId }, select: { status: true } });
      if (!store || store.status !== 'ACTIVE') {
        throw new BadRequestException('La tienda seleccionada no esta activa.');
      }
    }

    if (input.brandItemId) {
      const brand = await this.prisma.catalogItem.findFirst({
        where: { id: input.brandItemId, isActive: true, catalog: { code: 'BRANDS', isActive: true } },
      });
      if (!brand) {
        throw new BadRequestException('La marca seleccionada no existe o esta inactiva.');
      }
    }

    if (input.shoeTypeId) {
      const item = await this.prisma.catalogItem.findUnique({ where: { id: input.shoeTypeId }, include: { catalog: true } });
      if (!item || !item.isActive || !item.catalog.isActive || item.catalog.code !== 'SHOE_TYPES') {
        throw new BadRequestException('Tipo de calzado invalido o inactivo.');
      }
    }
  }

  private resolveMultiplier(input: CreatePointPromotionInput) {
    if (input.type === 'DOUBLE_POINTS') return '2.00';
    if (input.type === 'TRIPLE_POINTS') return '3.00';
    return input.multiplier == null ? undefined : input.multiplier.toFixed(2);
  }

  private resolvePriority(input: CreatePointPromotionInput) {
    if (input.targetLevels?.length) return 20;
    if (input.storeId) return 30;
    if (input.brandItemId) return 40;
    if (input.shoeTypeId) return 60;
    return 100;
  }
}
