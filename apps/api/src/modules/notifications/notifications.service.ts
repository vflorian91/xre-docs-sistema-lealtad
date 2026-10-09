import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationAudience, NotificationRecipientStatus, Prisma } from '@prisma/client';
import { FastifyRequest } from 'fastify';
import { AuditService } from '../audit/audit.service';
import { CustomerAuthUser, InternalAuthUser } from '../auth/auth.types';
import { PrismaService } from '../database/prisma.service';
import { CreateNotificationInput, UpdateNotificationInput } from './notification.schemas';

type CustomerSegmentCriteria = NonNullable<CreateNotificationInput['customerSegment']>;

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async listAdmin(page = 1, limit = 10) {
    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          customer: { select: { id: true, code: true, fullName: true } },
          internalUser: { select: { id: true, fullName: true, email: true } },
          role: { select: { id: true, name: true } },
          createdByInternalUser: { select: { id: true, fullName: true, email: true } },
        },
      }),
      this.prisma.notification.count(),
    ]);

    return { data: notifications, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
  }

  async listForInternal(actor: InternalAuthUser) {
    const now = new Date();
    const notifications = await this.prisma.notification.findMany({
      where: {
        AND: [
          this.activeWhere(now),
          {
            OR: [
              { audience: 'GLOBAL_INTERNAL' },
              { audience: 'INTERNAL_USER', internalUserId: actor.id },
              { audience: 'ROLE', role: { name: { in: actor.roles } } },
            ],
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        recipients: {
          where: { internalUserId: actor.id },
          take: 1,
        },
      },
    });

    return notifications.map((notification) => this.toRecipientNotification(notification));
  }

  async listForCustomer(customer: CustomerAuthUser) {
    const now = new Date();
    const notifications = await this.prisma.notification.findMany({
      where: {
        AND: [
          this.activeWhere(now),
          {
            OR: [
              { audience: 'GLOBAL_CUSTOMERS' },
              { audience: 'CUSTOMER', customerId: customer.id },
              { audience: 'CUSTOMER_SEGMENT', recipients: { some: { customerId: customer.id } } },
            ],
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        recipients: {
          where: { customerId: customer.id },
          take: 1,
        },
      },
    });

    return notifications.map((notification) => this.toRecipientNotification(notification));
  }

  async countUnreadForInternal(actor: InternalAuthUser) {
    const now = new Date();
    return this.prisma.notification.count({
      where: {
        AND: [
          this.activeWhere(now),
          {
            OR: [
              { audience: 'GLOBAL_INTERNAL' },
              { audience: 'INTERNAL_USER', internalUserId: actor.id },
              { audience: 'ROLE', role: { name: { in: actor.roles } } },
            ],
          },
        ],
        recipients: { none: { internalUserId: actor.id, status: 'READ' } },
      },
    });
  }

  async notifySystemInternal(title: string, body: string, metadata?: Record<string, unknown>, type = 'SYSTEM') {
    return this.prisma.notification.create({
      data: {
        title,
        body,
        type,
        channel: 'INTERNAL',
        audience: 'GLOBAL_INTERNAL',
        startsAt: new Date(),
        metadata: this.systemMetadata(metadata),
      },
    });
  }

  async notifySystemCustomer(customerId: string, title: string, body: string, metadata?: Record<string, unknown>, type = 'SYSTEM') {
    return this.prisma.notification.create({
      data: {
        title,
        body,
        type,
        channel: 'INTERNAL',
        audience: 'CUSTOMER',
        customerId,
        startsAt: new Date(),
        metadata: this.systemMetadata(metadata),
      },
    });
  }

  async notifySystemDriver(driverId: string, title: string, body: string, metadata?: Record<string, unknown>, type = 'SYSTEM') {
    return this.prisma.notification.create({
      data: {
        title,
        body,
        type,
        channel: 'INTERNAL',
        audience: 'DRIVER',
        driverId,
        startsAt: new Date(),
        metadata: this.systemMetadata(metadata),
      },
    });
  }

  async listForDriver(driverId: string) {
    const now = new Date();
    const notifications = await this.prisma.notification.findMany({
      where: {
        AND: [this.activeWhere(now), { audience: 'DRIVER', driverId }],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { recipients: { where: { driverId }, take: 1 } },
    });
    return notifications.map((notification) => this.toRecipientNotification(notification));
  }

  async countUnreadForDriver(driverId: string) {
    const now = new Date();
    return this.prisma.notification.count({
      where: {
        AND: [this.activeWhere(now), { audience: 'DRIVER', driverId }],
        recipients: { none: { driverId, status: 'READ' } },
      },
    });
  }

  async markDriverRead(notificationId: string, driverId: string) {
    const notification = await this.prisma.notification.findFirst({ where: { id: notificationId, audience: 'DRIVER', driverId } });
    if (!notification) {
      throw new NotFoundException('Notificación no encontrada.');
    }
    return this.prisma.notificationRecipient.upsert({
      where: { notificationId_driverId: { notificationId, driverId } },
      update: { status: 'READ', readAt: new Date() },
      create: { notificationId, driverId, status: 'READ', readAt: new Date() },
    });
  }

  async markAllDriverRead(driverId: string) {
    const now = new Date();
    const notifications = await this.prisma.notification.findMany({
      where: {
        AND: [this.activeWhere(now), { audience: 'DRIVER', driverId }],
        recipients: { none: { driverId, status: 'READ' } },
      },
      select: { id: true },
      take: 50,
    });
    if (notifications.length === 0) return { updated: 0 };
    const readAt = new Date();
    await this.prisma.$transaction(
      notifications.map(({ id }) =>
        this.prisma.notificationRecipient.upsert({
          where: { notificationId_driverId: { notificationId: id, driverId } },
          update: { status: 'READ', readAt },
          create: { notificationId: id, driverId, status: 'READ', readAt },
        }),
      ),
    );
    return { updated: notifications.length };
  }

  async notifyPointsEarned(customerId: string, points: number, reference: string, metadata?: Record<string, unknown>) {
    if (points <= 0) return null;

    return this.notifySystemCustomer(
      customerId,
      'Puntos acreditados',
      `Se acreditaron ${points.toLocaleString('es-GT')} puntos por ${reference}.`,
      { ...metadata, points, reference, event: 'points.earned' },
      'SUCCESS',
    );
  }

  async notifyPointsReversed(customerId: string, points: number, reference: string, metadata?: Record<string, unknown>) {
    if (points <= 0) return null;

    return this.notifySystemCustomer(
      customerId,
      'Puntos reversados',
      `Se reversaron ${points.toLocaleString('es-GT')} puntos de ${reference}.`,
      { ...metadata, points, reference, event: 'points.reversed' },
      'WARNING',
    );
  }

  async notifyPointPromotionCreated(input: { promotionId: string; name: string; startsAt: Date; endsAt: Date; targetLevels?: string[] }) {
    const segment = await this.resolveCustomerSegmentByLevels(input.targetLevels ?? []);

    if (segment.customerIds.length === 0) {
      return null;
    }

    const notification = await this.prisma.notification.create({
      data: {
        title: 'Nueva promocion de puntos',
        body: `${input.name} esta disponible del ${this.formatDate(input.startsAt)} al ${this.formatDate(input.endsAt)}.`,
        type: 'PROMOTION',
        channel: 'INTERNAL',
        audience: 'CUSTOMER_SEGMENT',
        startsAt: input.startsAt > new Date() ? input.startsAt : new Date(),
        expiresAt: input.endsAt,
        metadata: this.systemMetadata({
          event: 'points.promotion.created',
          promotionId: input.promotionId,
          promotionName: input.name,
          segment: segment.summary,
          recipientCount: segment.customerIds.length,
        }),
        recipients: {
          createMany: {
            data: segment.customerIds.map((customerId) => ({ customerId })),
            skipDuplicates: true,
          },
        },
      },
    });

    return notification;
  }

  async create(input: CreateNotificationInput, actor: InternalAuthUser, request: FastifyRequest) {
    const segment = input.audience === 'CUSTOMER_SEGMENT' ? await this.resolveCustomerSegment(input.customerSegment ?? {}) : null;

    const notification = await this.prisma.notification.create({
      data: {
        title: input.title,
        body: input.body,
        type: input.type,
        channel: 'INTERNAL',
        audience: input.audience,
        customerId: input.audience === 'CUSTOMER' ? input.customerId : null,
        internalUserId: input.audience === 'INTERNAL_USER' ? input.internalUserId : null,
        roleId: input.audience === 'ROLE' ? input.roleId : null,
        createdByInternalUserId: actor.id,
        startsAt: input.startsAt ?? new Date(),
        expiresAt: input.expiresAt ?? null,
        metadata: {
          ...(input.metadata ?? {}),
          source: 'MANUAL',
          ...(segment ? { segment: segment.summary, recipientCount: segment.customerIds.length } : {}),
        } as Prisma.InputJsonValue,
        ...(segment
          ? {
              recipients: {
                createMany: {
                  data: segment.customerIds.map((customerId) => ({ customerId })),
                  skipDuplicates: true,
                },
              },
            }
          : {}),
      },
    });

    await this.auditService.record({
      actorType: 'INTERNAL_USER',
      actorInternalUserId: actor.id,
      action: 'notifications.create',
      module: 'notifications',
      entityType: 'Notification',
      entityId: notification.id,
      metadata: { title: notification.title, audience: notification.audience, recipientCount: segment?.customerIds.length ?? null },
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });

    return notification;
  }

  async update(id: string, input: UpdateNotificationInput, actor: InternalAuthUser, request: FastifyRequest) {
    const existing = await this.prisma.notification.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Notificacion no encontrada.');
    }

    const notification = await this.prisma.notification.update({
      where: { id },
      data: input,
    });

    await this.auditService.record({
      actorType: 'INTERNAL_USER',
      actorInternalUserId: actor.id,
      action: 'notifications.update',
      module: 'notifications',
      entityType: 'Notification',
      entityId: notification.id,
      metadata: { before: existing, after: notification },
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });

    return notification;
  }

  async markInternalRead(notificationId: string, actor: InternalAuthUser) {
    await this.ensureVisibleForInternal(notificationId, actor);

    return this.prisma.notificationRecipient.upsert({
      where: {
        notificationId_internalUserId: {
          notificationId,
          internalUserId: actor.id,
        },
      },
      update: {
        status: 'READ',
        readAt: new Date(),
      },
      create: {
        notificationId,
        internalUserId: actor.id,
        status: 'READ',
        readAt: new Date(),
      },
    });
  }

  async markCustomerRead(notificationId: string, customer: CustomerAuthUser) {
    await this.ensureVisibleForCustomer(notificationId, customer);

    return this.prisma.notificationRecipient.upsert({
      where: {
        notificationId_customerId: {
          notificationId,
          customerId: customer.id,
        },
      },
      update: {
        status: 'READ',
        readAt: new Date(),
      },
      create: {
        notificationId,
        customerId: customer.id,
        status: 'READ',
        readAt: new Date(),
      },
    });
  }

  async markAllCustomerRead(customer: CustomerAuthUser) {
    const now = new Date();
    const notifications = await this.prisma.notification.findMany({
      where: {
        AND: [
          this.activeWhere(now),
          {
            OR: [
              { audience: 'GLOBAL_CUSTOMERS' },
              { audience: 'CUSTOMER', customerId: customer.id },
              { audience: 'CUSTOMER_SEGMENT', recipients: { some: { customerId: customer.id } } },
            ],
          },
        ],
        recipients: { none: { customerId: customer.id, status: 'READ' } },
      },
      select: { id: true },
      take: 50,
    });

    if (notifications.length === 0) {
      return { updated: 0 };
    }

    const readAt = new Date();
    await this.prisma.$transaction(
      notifications.map(({ id }) => this.prisma.notificationRecipient.upsert({
        where: {
          notificationId_customerId: {
            notificationId: id,
            customerId: customer.id,
          },
        },
        update: { status: 'READ', readAt },
        create: {
          notificationId: id,
          customerId: customer.id,
          status: 'READ',
          readAt,
        },
      })),
    );

    return { updated: notifications.length };
  }

  private activeWhere(now: Date): Prisma.NotificationWhereInput {
    return {
      isActive: true,
      startsAt: { lte: now },
      OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
    };
  }

  private async ensureVisibleForInternal(notificationId: string, actor: InternalAuthUser) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        AND: [
          this.activeWhere(new Date()),
          {
            OR: [
              { audience: 'GLOBAL_INTERNAL' },
              { audience: 'INTERNAL_USER', internalUserId: actor.id },
              { audience: 'ROLE', role: { name: { in: actor.roles } } },
            ],
          },
        ],
      },
    });

    if (!notification) {
      throw new NotFoundException('Notificacion no encontrada.');
    }
  }

  private async ensureVisibleForCustomer(notificationId: string, customer: CustomerAuthUser) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        AND: [
          this.activeWhere(new Date()),
          {
            OR: [
              { audience: 'GLOBAL_CUSTOMERS' },
              { audience: 'CUSTOMER', customerId: customer.id },
              { audience: 'CUSTOMER_SEGMENT', recipients: { some: { customerId: customer.id } } },
            ],
          },
        ],
      },
    });

    if (!notification) {
      throw new NotFoundException('Notificacion no encontrada.');
    }
  }

  private toRecipientNotification<T extends {
    recipients: Array<{ status: NotificationRecipientStatus; readAt: Date | null }>;
    audience: NotificationAudience;
  }>(notification: T) {
    const recipient = notification.recipients[0];

    return {
      ...notification,
      recipients: undefined,
      isRead: recipient?.status === 'READ',
      readAt: recipient?.readAt ?? null,
    };
  }

  private async resolveCustomerSegment(criteria: CustomerSegmentCriteria, requireRecipients = true) {
    const where: Prisma.CustomerWhereInput = {
      ...(criteria.status ? { status: criteria.status } : {}),
      ...(criteria.level ? { loyaltyLevel: criteria.level } : {}),
    };

    const customers = await this.prisma.customer.findMany({
      where,
      select: { id: true },
    });
    const customerIds = customers.map((customer) => customer.id);

    if (requireRecipients && customerIds.length === 0) {
      throw new BadRequestException('El segmento seleccionado no tiene clientes.');
    }

    return {
      customerIds,
      summary: {
        status: criteria.status ?? null,
        level: criteria.level ?? null,
      },
    };
  }

  private async resolveCustomerSegmentByLevels(levels: string[]) {
    const customers = await this.prisma.customer.findMany({
      where: {
        status: 'ACTIVE',
        ...(levels.length > 0 ? { loyaltyLevel: { in: levels } } : {}),
      },
      select: { id: true },
    });

    return {
      customerIds: customers.map((customer) => customer.id),
      summary: { status: 'ACTIVE' as const, levels },
    };
  }

  private systemMetadata(metadata?: Record<string, unknown>) {
    return {
      ...(metadata ?? {}),
      source: 'SYSTEM',
    } as Prisma.InputJsonValue;
  }

  private formatDate(date: Date) {
    return new Intl.DateTimeFormat('es-GT', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
  }
}
