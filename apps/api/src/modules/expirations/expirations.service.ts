import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

type ExpirationRunInput = {
  now?: Date;
  limit?: number;
  actorInternalUserId?: string;
  ipAddress?: string;
  userAgent?: string;
};

@Injectable()
export class ExpirationsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ExpirationsService.name);
  private interval?: NodeJS.Timeout;
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
  ) {}

  onModuleInit() {
    if (this.configService.get<string>('EXPIRATION_JOB_ENABLED') === 'false') return;

    const intervalMs = this.resolveIntervalMs();
    this.interval = setInterval(() => {
      void this.runAutomated();
    }, intervalMs);
    this.interval.unref?.();
  }

  onModuleDestroy() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  async run(input: ExpirationRunInput = {}) {
    if (this.isRunning) {
      return {
        skipped: true,
        reason: 'expiration_job_already_running',
      };
    }

    this.isRunning = true;
    const now = input.now ?? new Date();
    const limit = Math.min(Math.max(input.limit ?? 500, 1), 2000);

    try {
      const [points, promotionalBalance, redemptions] = await Promise.all([
        this.expirePoints(now, limit),
        this.expirePromotionalBalance(now, limit),
        this.expireRedemptions(now, Math.min(limit, 200)),
      ]);

      const result = {
        skipped: false,
        now: now.toISOString(),
        pointsExpired: points.count,
        promotionalBalanceExpired: promotionalBalance.count,
        redemptionsExpired: redemptions.count,
      };

      if (points.count > 0 || promotionalBalance.count > 0 || redemptions.count > 0 || input.actorInternalUserId) {
        await this.auditService.record({
          actorType: input.actorInternalUserId ? 'INTERNAL_USER' : 'SYSTEM',
          actorInternalUserId: input.actorInternalUserId,
          action: input.actorInternalUserId ? 'expirations.run_manual' : 'expirations.run_automatic',
          module: 'expirations',
          metadata: result,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        });
      }

      return result;
    } finally {
      this.isRunning = false;
    }
  }

  private async runAutomated() {
    try {
      await this.run();
    } catch (error) {
      this.logger.error('Expiration job failed', error);
    }
  }

  private async expirePoints(now: Date, limit: number) {
    const movements = await this.prisma.pointMovement.findMany({
      where: {
        status: 'AVAILABLE',
        points: { gt: 0 },
        expiresAt: { lte: now },
      },
      select: { id: true },
      take: limit,
      orderBy: { expiresAt: 'asc' },
    });

    if (movements.length === 0) return { count: 0 };

    const updated = await this.prisma.pointMovement.updateMany({
      where: { id: { in: movements.map((movement) => movement.id) }, status: 'AVAILABLE' },
      data: {
        status: 'EXPIRED',
        type: 'EXPIRED',
        description: 'Puntos vencidos automaticamente.',
      },
    });

    return { count: updated.count };
  }

  private async expirePromotionalBalance(now: Date, limit: number) {
    const movements = await this.prisma.promotionalBalanceMovement.findMany({
      where: {
        status: 'AVAILABLE',
        amount: { gt: 0 },
        expiresAt: { lte: now },
      },
      select: { id: true },
      take: limit,
      orderBy: { expiresAt: 'asc' },
    });

    if (movements.length === 0) return { count: 0 };

    const updated = await this.prisma.promotionalBalanceMovement.updateMany({
      where: { id: { in: movements.map((movement) => movement.id) }, status: 'AVAILABLE' },
      data: {
        status: 'EXPIRED',
        type: 'EXPIRED',
        description: 'Saldo promocional vencido automaticamente.',
      },
    });

    return { count: updated.count };
  }

  private async expireRedemptions(now: Date, limit: number) {
    const requestedRedemptions = await this.prisma.redemptionRequest.findMany({
      where: {
        status: 'APPROVED',
        expiresAt: { lte: now },
      },
      take: limit,
      orderBy: { expiresAt: 'asc' },
      select: { id: true },
    });

    let count = 0;

    for (const redemptionRequest of requestedRedemptions) {
      const expired = await this.prisma.$transaction(async (tx) => {
        const lockedRequest = await tx.redemptionRequest.findUnique({
          where: { id: redemptionRequest.id },
          select: {
            id: true,
            requestCode: true,
            status: true,
            customerId: true,
            productId: true,
            pointsReserved: true,
          },
        });

        if (!lockedRequest || lockedRequest.status !== 'APPROVED') return null;

        await tx.pointMovement.create({
          data: {
            customerId: lockedRequest.customerId,
            type: 'REDEMPTION_RELEASED',
            status: 'AVAILABLE',
            points: lockedRequest.pointsReserved,
            description: `Vencimiento de canje ${lockedRequest.requestCode}: El canje aprobado no fue recogido a tiempo.`,
          },
        });

        await tx.redeemableProduct.update({
          where: { id: lockedRequest.productId },
          data: { reservedStock: { decrement: 1 } },
        });

        return tx.redemptionRequest.update({
          where: { id: lockedRequest.id },
          data: {
            status: 'EXPIRED',
            cancelledAt: now,
            cancellationReason: 'El canje aprobado no fue recogido antes de su vencimiento.',
          },
        });
      });

      if (expired) {
        count += 1;
        await this.notificationsService.notifySystemCustomer(
          expired.customerId,
          'Canje vencido',
          `Tu canje ${expired.requestCode} vencio porque no fue recogido a tiempo.`,
          { redemptionRequestId: expired.id, requestCode: expired.requestCode },
        );
      }
    }

    return { count };
  }

  private resolveIntervalMs() {
    const rawValue = this.configService.get<string>('EXPIRATION_JOB_INTERVAL_MS');
    const parsedValue = rawValue ? Number(rawValue) : 60 * 60 * 1000;

    if (!Number.isFinite(parsedValue) || parsedValue < 60_000) {
      return 60 * 60 * 1000;
    }

    return parsedValue;
  }
}
