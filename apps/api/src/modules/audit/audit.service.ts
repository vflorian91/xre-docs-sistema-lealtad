import { Injectable, Logger } from '@nestjs/common';
import { AuditActorType, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

interface AuditEntry {
  actorType: AuditActorType;
  actorInternalUserId?: string;
  actorCustomerId?: string;
  action: string;
  module: string;
  entityType?: string;
  entityId?: string;
  storeId?: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
}

interface AuditListFilters {
  module?: string;
  action?: string;
  actorType?: string;
  customerName?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  page?: number;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry) {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorType: entry.actorType,
          actorInternalUserId: entry.actorInternalUserId,
          actorCustomerId: entry.actorCustomerId,
          action: entry.action,
          module: entry.module,
          entityType: entry.entityType,
          entityId: entry.entityId,
          storeId: entry.storeId,
          metadata: entry.metadata,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
        },
      });
    } catch (error) {
      this.logger.error('Could not write audit log', error);
    }
  }

  async listLogs(filters: AuditListFilters) {
    const limit = Number.isFinite(filters.limit) ? Math.min(Math.max(filters.limit ?? 10, 1), 100) : 10;
    const page = Math.max(1, filters.page ?? 1);
    const where: Prisma.AuditLogWhereInput = {};

    if (filters.module) {
      where.module = filters.module;
    }

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.actorType && ['INTERNAL_USER', 'CUSTOMER', 'SYSTEM'].includes(filters.actorType)) {
      where.actorType = filters.actorType as AuditActorType;
    }

    const customerName = filters.customerName?.trim();
    if (customerName) {
      where.actorCustomer = {
        fullName: {
          contains: customerName,
          mode: 'insensitive',
        },
      };
      where.actorType = 'CUSTOMER';
    }

    const createdAt: Prisma.DateTimeFilter = {};
    const dateFrom = parseDateBoundary(filters.dateFrom, 'start');
    const dateTo = parseDateBoundary(filters.dateTo, 'end');

    if (dateFrom) createdAt.gte = dateFrom;
    if (dateTo) createdAt.lte = dateTo;
    if (createdAt.gte || createdAt.lte) {
      where.createdAt = createdAt;
    }

    const [logs, total, modules, actions] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          actorInternalUser: {
            select: {
              id: true,
              fullName: true,
              email: true,
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
      }),
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.groupBy({
        by: ['module'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 20,
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      total,
      limit,
      page,
      totalPages,
      filters,
      modules: modules.map((row) => ({ module: row.module, count: row._count.id })),
      actions: actions.map((row) => ({ action: row.action, count: row._count.id })),
      logs: logs.map((log) => ({
        id: log.id,
        actorType: log.actorType,
        actor: log.actorInternalUser
          ? {
              id: log.actorInternalUser.id,
              label: log.actorInternalUser.fullName,
              secondary: log.actorInternalUser.email,
            }
          : log.actorCustomer
            ? {
                id: log.actorCustomer.id,
                label: log.actorCustomer.fullName,
                secondary: log.actorCustomer.code,
              }
            : {
                id: null,
                label: 'Sistema',
                secondary: 'Automático',
              },
        action: log.action,
        module: log.module,
        entityType: log.entityType,
        entityId: log.entityId,
        storeId: log.storeId,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        metadata: log.metadata,
        createdAt: log.createdAt,
      })),
    };
  }
}

function parseDateBoundary(value: string | undefined, boundary: 'start' | 'end') {
  if (!value) return null;

  const date = new Date(`${value}T${boundary === 'start' ? '00:00:00.000' : '23:59:59.999'}`);
  return Number.isNaN(date.getTime()) ? null : date;
}
