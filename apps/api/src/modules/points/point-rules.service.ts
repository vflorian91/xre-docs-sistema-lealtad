import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PointMovementType, Prisma } from '@prisma/client';
import { FastifyRequest } from 'fastify';
import { AuditService } from '../audit/audit.service';
import { InternalAuthUser } from '../auth/auth.types';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreatePointAdjustmentInput } from './point-adjustment.schemas';
import { CreatePointRuleInput, ListPointRulesInput } from './point-rule.schemas';

@Injectable()
export class PointRulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async listRules(input: ListPointRulesInput) {
    const where: Prisma.PointRuleWhereInput = {
      ...(input.search ? { name: { contains: input.search, mode: 'insensitive' } } : {}),
      ...(input.status === 'ACTIVE' ? { isActive: true } : {}),
      ...(input.status === 'INACTIVE' ? { isActive: false } : {}),
    };
    const total = await this.prisma.pointRule.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / input.limit));
    const page = Math.min(input.page, totalPages);

    const data = await this.prisma.pointRule.findMany({
      where,
      orderBy: [{ isActive: 'desc' }, { startsAt: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * input.limit,
      take: input.limit,
      include: { brand: { select: { id: true, code: true, name: true } } },
    });

    return {
      data,
      meta: {
        page,
        limit: input.limit,
        total,
        totalPages,
      },
    };
  }

  async getActiveRule(brandItemId?: string | null) {
    const now = new Date();
    const rules = await this.prisma.pointRule.findMany({
      where: {
        isActive: true,
        startsAt: { lte: now },
        AND: [
          { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
          { OR: [{ brandItemId: null }, ...(brandItemId ? [{ brandItemId }] : [])] },
        ],
      },
      orderBy: { startsAt: 'desc' },
    });

    if (rules.length === 0) {
      throw new NotFoundException('No existe una regla de puntos activa.');
    }

    return (
      rules.find((rule) => brandItemId && rule.brandItemId === brandItemId)
      ?? rules.find((rule) => rule.brandItemId === null)
      ?? rules[0]
    );
  }

  async getRule(id: string) {
    const rule = await this.prisma.pointRule.findUnique({
      where: { id },
      include: { brand: { select: { id: true, code: true, name: true } } },
    });

    if (!rule) {
      throw new NotFoundException('Regla de puntos no encontrada.');
    }

    return rule;
  }

  async createRule(input: CreatePointRuleInput, actor: InternalAuthUser, request: FastifyRequest) {
    if (input.endsAt && input.startsAt && input.endsAt <= input.startsAt) {
      throw new BadRequestException('La fecha final debe ser posterior a la fecha inicial.');
    }

    if (input.brandItemId) {
      await this.assertActiveBrand(input.brandItemId);
    }

    const now = new Date();
    const startsInFuture = input.startsAt > now;
    const rule = await this.prisma.$transaction(async (tx) => {
      if (input.activateNow) {
        if (startsInFuture) {
          await tx.pointRule.updateMany({
            where: {
              isActive: true,
              brandItemId: input.brandItemId,
              startsAt: { lt: input.startsAt },
              OR: [{ endsAt: null }, { endsAt: { gt: input.startsAt } }],
            },
            data: { endsAt: input.startsAt },
          });
        } else {
          await tx.pointRule.updateMany({
            where: { isActive: true, brandItemId: input.brandItemId },
            data: { isActive: false, endsAt: now },
          });
        }
      }

      return tx.pointRule.create({
        data: {
          name: input.name,
          amountPerPoint: input.amountPerPoint.toFixed(2),
          pointValueAmount: input.pointValueAmount.toFixed(5),
          minimumAmount: input.minimumAmount.toFixed(2),
          maxPointsPerPurchase: input.maxPointsPerPurchase ?? null,
          pointsExpirationDays: input.pointsExpirationDays ?? undefined,
          roundingMode: input.roundingMode,
          startsAt: input.startsAt,
          endsAt: input.endsAt ?? undefined,
          isActive: input.activateNow,
          brandItemId: input.brandItemId,
          createdByInternalUserId: actor.id,
        },
      });
    });

    await this.auditService.record({
      actorType: 'INTERNAL_USER',
      actorInternalUserId: actor.id,
      action: 'points.rules.create',
      module: 'points',
      entityType: 'PointRule',
      entityId: rule.id,
      metadata: {
        name: rule.name,
        amountPerPoint: rule.amountPerPoint.toString(),
        pointValueAmount: rule.pointValueAmount.toString(),
        minimumAmount: rule.minimumAmount.toString(),
        maxPointsPerPurchase: rule.maxPointsPerPurchase,
        pointsExpirationDays: rule.pointsExpirationDays,
        isActive: rule.isActive,
      },
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });

    return rule;
  }

  async activateRule(id: string, actor: InternalAuthUser, request: FastifyRequest) {
    const existing = await this.prisma.pointRule.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Regla de puntos no encontrada.');
    }

    const rule = await this.prisma.$transaction(async (tx) => {
      await tx.pointRule.updateMany({
        where: { isActive: true, brandItemId: existing.brandItemId },
        data: { isActive: false, endsAt: new Date() },
      });

      return tx.pointRule.update({
        where: { id },
        data: {
          isActive: true,
          startsAt: existing.startsAt > new Date() ? new Date() : existing.startsAt,
        },
      });
    });

    await this.auditService.record({
      actorType: 'INTERNAL_USER',
      actorInternalUserId: actor.id,
      action: 'points.rules.activate',
      module: 'points',
      entityType: 'PointRule',
      entityId: rule.id,
      metadata: {
        previousActiveRuleId: existing.id,
        activatedRuleName: rule.name,
      },
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });

    return rule;
  }

  async createAdjustment(input: CreatePointAdjustmentInput, actor: InternalAuthUser, request: FastifyRequest) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: input.customerId },
      select: { id: true, code: true, fullName: true },
    });

    if (!customer) {
      throw new NotFoundException('Cliente no encontrado.');
    }

    if (input.points < 0) {
      const balance = await this.prisma.pointMovement.aggregate({
        where: {
          customerId: customer.id,
          status: 'AVAILABLE',
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        _sum: { points: true },
      });

      const currentPoints = balance._sum.points ?? 0;
      if (currentPoints + input.points < 0) {
        throw new BadRequestException('No puedes dejar al cliente con puntos negativos.');
      }
    }

    const movement = await this.prisma.pointMovement.create({
      data: {
        customerId: customer.id,
        points: input.points,
        description: input.description,
        type: input.points > 0 ? PointMovementType.ADMIN_ADJUSTMENT_POSITIVE : PointMovementType.ADMIN_ADJUSTMENT_NEGATIVE,
        status: 'AVAILABLE',
      },
    });

    await this.auditService.record({
      actorType: 'INTERNAL_USER',
      actorInternalUserId: actor.id,
      action: 'points.adjustment.create',
      module: 'points',
      entityType: 'Customer',
      entityId: customer.id,
      metadata: {
        customerCode: customer.code,
        customerName: customer.fullName,
        points: input.points,
        description: input.description,
        pointMovementId: movement.id,
      },
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });

    if (input.points > 0) {
      await this.notificationsService.notifyPointsEarned(customer.id, input.points, 'ajuste manual', {
        pointMovementId: movement.id,
        event: 'points.adjustment.positive',
        description: input.description,
      });
    } else if (input.points < 0) {
      await this.notificationsService.notifyPointsReversed(customer.id, Math.abs(input.points), 'ajuste manual', {
        pointMovementId: movement.id,
        event: 'points.adjustment.negative',
        description: input.description,
      });
    }

    return movement;
  }

  private async assertActiveBrand(brandItemId: string) {
    const brand = await this.prisma.catalogItem.findFirst({
      where: { id: brandItemId, isActive: true, catalog: { code: 'BRANDS', isActive: true } },
    });
    if (!brand) {
      throw new BadRequestException('La marca seleccionada no existe o esta inactiva.');
    }
  }
}
