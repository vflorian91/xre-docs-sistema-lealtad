import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { InternalAuthUser } from '../auth/auth.types';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const [
      totalCustomers,
      totalStores,
      totalInternalUsers,
      purchaseStats,
      pointStats,
      recentPurchases,
      activePointRule,
      activeCatalogs,
      levelDistributionRaw,
    ] = await Promise.all([
      this.prisma.customer.count(),
      this.prisma.store.count({ where: { status: 'ACTIVE' } }),
      this.prisma.internalUser.count({ where: { status: 'ACTIVE' } }),
      this.prisma.purchase.aggregate({
        where: { status: 'APPROVED' },
        _count: { id: true },
        _sum: {
          amount: true,
          pointsCalculated: true,
        },
      }),
      this.prisma.pointMovement.aggregate({
        where: { status: 'AVAILABLE', OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
        _sum: { points: true },
      }),
      this.prisma.purchase.findMany({
        where: { status: 'APPROVED' },
        orderBy: { purchasedAt: 'desc' },
        take: 8,
        include: {
          customer: {
            select: {
              id: true,
              code: true,
              fullName: true,
            },
          },
          store: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          pointMovements: true,
        },
      }),
      this.prisma.pointRule.findFirst({
        where: {
          isActive: true,
          startsAt: { lte: new Date() },
          OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
        },
        orderBy: { startsAt: 'desc' },
      }),
      this.prisma.catalog.count({ where: { isActive: true } }),
      this.prisma.customer.groupBy({
        by: ['loyaltyLevel'],
        where: { status: 'ACTIVE' },
        _count: { id: true },
      }),
    ]);

    const levelDistribution = levelDistributionRaw.map((row) => ({
      level: row.loyaltyLevel,
      count: row._count.id,
    }));

    return {
      levelDistribution,
      totals: {
        customers: totalCustomers,
        stores: totalStores,
        internalUsers: totalInternalUsers,
        purchases: purchaseStats._count.id,
        salesAmount: purchaseStats._sum.amount?.toString() ?? '0.00',
        pointsIssued: purchaseStats._sum.pointsCalculated ?? 0,
        availablePoints: pointStats._sum.points ?? 0,
        activeCatalogs,
      },
      activePointRule: activePointRule
        ? {
            id: activePointRule.id,
            name: activePointRule.name,
            amountPerPoint: activePointRule.amountPerPoint.toString(),
            minimumAmount: activePointRule.minimumAmount.toString(),
          }
        : null,
      recentPurchases,
    };
  }

  async getReports(range: { from?: string; to?: string; storeId?: string } = {}, actor: InternalAuthUser) {
    const now = new Date();
    const hasCustomRange = Boolean(range.from || range.to);
    const from = range.from ? this.parseReportDate(range.from, 'from') : new Date(now);
    const to = range.to ? this.parseReportDate(range.to, 'to') : new Date(now);

    if (!range.from) {
      from.setDate(from.getDate() - 29);
    }

    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);

    if (from > to) {
      throw new BadRequestException('La fecha de inicio no puede ser mayor que la fecha final.');
    }

    const dayCount = Math.floor((to.getTime() - from.getTime()) / 86_400_000) + 1;

    if (dayCount > 366) {
      throw new BadRequestException('El rango de reportes no puede superar 366 dias.');
    }

    const allowedStoreIds = actor.storeIds.length > 0 ? actor.storeIds : null;

    if (range.storeId && allowedStoreIds && !allowedStoreIds.includes(range.storeId)) {
      throw new ForbiddenException('No tienes acceso a los reportes de esta tienda.');
    }

    const selectedStoreIds = range.storeId ? [range.storeId] : allowedStoreIds;
    const storeFilter = selectedStoreIds ? { in: selectedStoreIds } : undefined;
    const purchaseWhere: Prisma.PurchaseWhereInput = {
      status: 'APPROVED' as const,
      purchasedAt: { gte: from, lte: to },
      ...(storeFilter ? { storeId: storeFilter } : {}),
    };
    const customerWhere: Prisma.CustomerWhereInput = {
      createdAt: { gte: from, lte: to },
      ...(storeFilter ? { registrationStoreId: storeFilter } : {}),
    };
    const redemptionWhere: Prisma.RedemptionRequestWhereInput = {
      requestedAt: { gte: from, lte: to },
      ...(storeFilter ? { pickupStoreId: storeFilter } : {}),
    };
    const pointWhere: Prisma.PointMovementWhereInput = {
      createdAt: { gte: from, lte: to },
      ...(storeFilter ? { customer: { registrationStoreId: storeFilter } } : {}),
    };

    const [
      purchaseStats,
      purchases,
      purchasesByStore,
      purchasesByCustomer,
      pointBreakdown,
      purchaseStatusBreakdown,
      customersRegistered,
      customerStatusBreakdown,
      redemptions,
      redemptionBreakdown,
      redemptionsByStore,
      registrationsByStore,
      availableStores,
    ] = await Promise.all([
      this.prisma.purchase.aggregate({
        where: purchaseWhere,
        _count: { id: true },
        _sum: {
          amount: true,
          pointsCalculated: true,
        },
        _avg: {
          amount: true,
        },
      }),
      this.prisma.purchase.findMany({
        where: purchaseWhere,
        orderBy: { purchasedAt: 'asc' },
        select: {
          id: true,
          customerId: true,
          amount: true,
          pointsCalculated: true,
          purchasedAt: true,
        },
      }),
      this.prisma.purchase.groupBy({
        by: ['storeId'],
        where: purchaseWhere,
        _count: { id: true },
        _sum: {
          amount: true,
          pointsCalculated: true,
        },
        orderBy: {
          _sum: {
            amount: 'desc',
          },
        },
      }),
      this.prisma.purchase.groupBy({
        by: ['customerId'],
        where: purchaseWhere,
        _count: { id: true },
        _sum: {
          amount: true,
          pointsCalculated: true,
        },
        orderBy: {
          _sum: {
            pointsCalculated: 'desc',
          },
        },
        take: 50,
      }),
      this.prisma.pointMovement.groupBy({
        by: ['type'],
        where: pointWhere,
        _count: { id: true },
        _sum: { points: true },
        orderBy: {
          _sum: {
            points: 'desc',
          },
        },
      }),
      this.prisma.purchase.groupBy({
        by: ['status'],
        where: {
          purchasedAt: { gte: from, lte: to },
          ...(storeFilter ? { storeId: storeFilter } : {}),
        },
        _count: { id: true },
        _sum: { amount: true, pointsCalculated: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      this.prisma.customer.findMany({
        where: customerWhere,
        orderBy: { createdAt: 'asc' },
        select: { id: true, status: true, createdAt: true, registrationStoreId: true },
      }),
      this.prisma.customer.groupBy({
        by: ['status'],
        where: storeFilter ? { registrationStoreId: storeFilter } : {},
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      this.prisma.redemptionRequest.findMany({
        where: redemptionWhere,
        orderBy: { requestedAt: 'asc' },
        select: { id: true, status: true, pointsReserved: true, requestedAt: true, pickupStoreId: true },
      }),
      this.prisma.redemptionRequest.groupBy({
        by: ['status'],
        where: redemptionWhere,
        _count: { id: true },
        _sum: { pointsReserved: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      this.prisma.redemptionRequest.groupBy({
        by: ['pickupStoreId'],
        where: redemptionWhere,
        _count: { id: true },
        _sum: { pointsReserved: true },
      }),
      this.prisma.customer.groupBy({
        by: ['registrationStoreId'],
        where: { ...customerWhere, registrationStoreId: { not: null, ...(storeFilter ?? {}) } },
        _count: { id: true },
      }),
      this.prisma.store.findMany({
        where: allowedStoreIds ? { id: { in: allowedStoreIds } } : {},
        orderBy: { name: 'asc' },
        select: { id: true, code: true, name: true, status: true },
      }),
    ]);

    const customers = await this.prisma.customer.findMany({
      where: { id: { in: purchasesByCustomer.map((row) => row.customerId) } },
      select: { id: true, code: true, fullName: true, phone: true },
    });

    const customerMap = new Map(customers.map((customer) => [customer.id, customer]));
    const dailyMap = new Map<string, { date: string; purchases: number; amount: number; points: number; newCustomers: number; redemptions: number }>();

    for (let index = 0; index < dayCount; index += 1) {
      const date = new Date(from);
      date.setDate(from.getDate() + index);
      const key = date.toISOString().slice(0, 10);
      dailyMap.set(key, { date: key, purchases: 0, amount: 0, points: 0, newCustomers: 0, redemptions: 0 });
    }

    for (const customer of customersRegistered) {
      const current = dailyMap.get(this.localDateKey(customer.createdAt));
      if (current) current.newCustomers += 1;
    }

    for (const redemption of redemptions) {
      const current = dailyMap.get(this.localDateKey(redemption.requestedAt));
      if (current) current.redemptions += 1;
    }

    const registrationsMap = new Map(
      registrationsByStore
        .filter((row) => row.registrationStoreId)
        .map((row) => [row.registrationStoreId as string, row._count.id]),
    );
    const redemptionsMap = new Map(redemptionsByStore.map((row) => [row.pickupStoreId, row]));
    const purchasesMap = new Map(purchasesByStore.map((row) => [row.storeId, row]));
    const uniqueActiveCustomers = new Set(purchases.map((purchase) => purchase.customerId));

    for (const purchase of purchases) {
      const key = this.localDateKey(purchase.purchasedAt);
      const current = dailyMap.get(key);

      if (current) {
        current.purchases += 1;
        current.amount += Number(purchase.amount);
        current.points += purchase.pointsCalculated;
      }
    }

    return {
      generatedAt: now.toISOString(),
      range: {
        from: from.toISOString(),
        to: to.toISOString(),
        label: hasCustomRange ? `${this.formatReportDate(from)} a ${this.formatReportDate(to)}` : 'Ultimos 30 dias',
      },
      selectedStoreId: range.storeId ?? null,
      availableStores,
      totals: {
        purchases: purchaseStats._count.id,
        salesAmount: purchaseStats._sum.amount?.toString() ?? '0.00',
        averageTicket: purchaseStats._avg.amount?.toString() ?? '0.00',
        pointsIssued: purchaseStats._sum.pointsCalculated ?? 0,
        customersRegistered: customersRegistered.length,
        activeCustomers: uniqueActiveCustomers.size,
        redemptions: redemptions.length,
        pointsReserved: redemptions.reduce((sum, row) => sum + row.pointsReserved, 0),
      },
      byStore: availableStores
        .filter((store) => !range.storeId || store.id === range.storeId)
        .map((store) => {
          const row = purchasesMap.get(store.id);
          const purchasesCount = row?._count.id ?? 0;
          const salesAmount = Number(row?._sum.amount ?? 0);

          return {
            storeId: store.id,
            storeCode: store.code,
            storeName: store.name,
            purchases: purchasesCount,
            salesAmount: salesAmount.toFixed(2),
            pointsIssued: row?._sum.pointsCalculated ?? 0,
            averageTicket: purchasesCount > 0 ? (salesAmount / purchasesCount).toFixed(2) : '0.00',
            customersRegistered: registrationsMap.get(store.id) ?? 0,
            redemptions: redemptionsMap.get(store.id)?._count.id ?? 0,
            pointsReserved: redemptionsMap.get(store.id)?._sum.pointsReserved ?? 0,
          };
        })
        .sort((left, right) => Number(right.salesAmount) - Number(left.salesAmount)),
      topCustomers: purchasesByCustomer.map((row) => {
        const customer = customerMap.get(row.customerId);

        return {
          customerId: row.customerId,
          customerCode: customer?.code ?? 'N/D',
          fullName: customer?.fullName ?? 'Cliente no encontrado',
          phone: customer?.phone ?? '',
          purchases: row._count.id,
          salesAmount: row._sum.amount?.toString() ?? '0.00',
          pointsIssued: row._sum.pointsCalculated ?? 0,
        };
      }),
      dailySales: Array.from(dailyMap.values()).map((row) => ({
        ...row,
        salesAmount: row.amount.toFixed(2),
      })),
      pointBreakdown: pointBreakdown.map((row) => ({
        type: row.type,
        movements: row._count.id,
        points: row._sum.points ?? 0,
      })),
      purchaseStatusBreakdown: purchaseStatusBreakdown.map((row) => ({
        status: row.status,
        purchases: row._count.id,
        salesAmount: row._sum.amount?.toString() ?? '0.00',
        points: row._sum.pointsCalculated ?? 0,
      })),
      customerStatusBreakdown: customerStatusBreakdown.map((row) => ({ status: row.status, customers: row._count.id })),
      redemptionBreakdown: redemptionBreakdown.map((row) => ({
        status: row.status,
        requests: row._count.id,
        pointsReserved: row._sum.pointsReserved ?? 0,
      })),
    };
  }

  async getDashboardMonthlySummary(monthInput?: string) {
    const { from, to, month } = this.resolveMonthRange(monthInput);

    const purchaseWhere = {
      status: 'APPROVED' as const,
      purchasedAt: { gte: from, lte: to },
    };

    const [
      customersRegistered,
      newCustomers,
      purchaseStats,
      purchases,
      purchasesByStore,
      pointBreakdown,
      deliveredRedemptions,
      deliveredRedemptionRows,
    ] = await Promise.all([
      this.prisma.customer.count({ where: { createdAt: { gte: from, lte: to } } }),
      this.prisma.customer.findMany({
        where: { createdAt: { gte: from, lte: to } },
        select: { createdAt: true },
      }),
      this.prisma.purchase.aggregate({
        where: purchaseWhere,
        _count: { id: true },
        _sum: { amount: true, pointsCalculated: true },
      }),
      this.prisma.purchase.findMany({
        where: purchaseWhere,
        orderBy: { purchasedAt: 'asc' },
        select: { id: true, amount: true, pointsCalculated: true, purchasedAt: true },
      }),
      this.prisma.purchase.groupBy({
        by: ['storeId'],
        where: purchaseWhere,
        _count: { id: true },
        _sum: { amount: true, pointsCalculated: true },
        orderBy: { _sum: { amount: 'desc' } },
      }),
      this.prisma.pointMovement.groupBy({
        by: ['type'],
        where: { createdAt: { gte: from, lte: to } },
        _count: { id: true },
        _sum: { points: true },
        orderBy: { _sum: { points: 'desc' } },
      }),
      this.prisma.redemptionRequest.aggregate({
        where: { status: 'DELIVERED', deliveredAt: { gte: from, lte: to } },
        _count: { id: true },
        _sum: { pointsReserved: true },
      }),
      this.prisma.redemptionRequest.findMany({
        where: { status: 'DELIVERED', deliveredAt: { gte: from, lte: to } },
        select: { deliveredAt: true, pointsReserved: true },
      }),
    ]);

    const stores = await this.prisma.store.findMany({
      where: { id: { in: purchasesByStore.map((row) => row.storeId) } },
      select: { id: true, code: true, name: true },
    });
    const storeMap = new Map(stores.map((store) => [store.id, store]));

    const dayCount = Math.floor((to.getTime() - from.getTime()) / 86_400_000) + 1;
    const dailyMap = new Map<string, { date: string; purchases: number; amount: number; points: number; newCustomers: number; redeemedPoints: number }>();

    for (let index = 0; index < dayCount; index += 1) {
      const date = new Date(from);
      date.setDate(from.getDate() + index);
      const key = date.toISOString().slice(0, 10);
      dailyMap.set(key, { date: key, purchases: 0, amount: 0, points: 0, newCustomers: 0, redeemedPoints: 0 });
    }

    for (const purchase of purchases) {
      const key = purchase.purchasedAt.toISOString().slice(0, 10);
      const current = dailyMap.get(key);

      if (current) {
        current.purchases += 1;
        current.amount += Number(purchase.amount);
        current.points += purchase.pointsCalculated;
      }
    }

    for (const customer of newCustomers) {
      const key = customer.createdAt.toISOString().slice(0, 10);
      const current = dailyMap.get(key);
      if (current) current.newCustomers += 1;
    }

    for (const redemption of deliveredRedemptionRows) {
      if (!redemption.deliveredAt) continue;
      const key = redemption.deliveredAt.toISOString().slice(0, 10);
      const current = dailyMap.get(key);
      if (current) current.redeemedPoints += redemption.pointsReserved;
    }

    return {
      month,
      range: { from: from.toISOString(), to: to.toISOString() },
      customersRegistered,
      purchases: purchaseStats._count.id,
      salesAmount: purchaseStats._sum.amount?.toString() ?? '0.00',
      pointsIssued: purchaseStats._sum.pointsCalculated ?? 0,
      redemptionsCount: deliveredRedemptions._count.id,
      pointsRedeemed: deliveredRedemptions._sum.pointsReserved ?? 0,
      byStore: purchasesByStore.map((row) => {
        const store = storeMap.get(row.storeId);

        return {
          storeId: row.storeId,
          storeCode: store?.code ?? 'N/D',
          storeName: store?.name ?? 'Tienda no encontrada',
          purchases: row._count.id,
          salesAmount: row._sum.amount?.toString() ?? '0.00',
          pointsIssued: row._sum.pointsCalculated ?? 0,
        };
      }),
      dailySales: Array.from(dailyMap.values()).map((row) => ({
        ...row,
        salesAmount: row.amount.toFixed(2),
      })),
      pointBreakdown: pointBreakdown.map((row) => ({
        type: row.type,
        movements: row._count.id,
        points: row._sum.points ?? 0,
      })),
    };
  }

  private resolveMonthRange(monthInput?: string) {
    const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
    const now = new Date();
    const month = monthInput && monthPattern.test(monthInput)
      ? monthInput
      : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    if (monthInput && !monthPattern.test(monthInput)) {
      throw new BadRequestException('El mes debe tener el formato AAAA-MM.');
    }

    const [year, monthNumber] = month.split('-').map(Number);
    const from = new Date(year, monthNumber - 1, 1, 0, 0, 0, 0);
    const to = new Date(year, monthNumber, 0, 23, 59, 59, 999);

    return { from, to, month };
  }

  private parseReportDate(value: string, field: 'from' | 'to') {
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;

    if (!datePattern.test(value)) {
      throw new BadRequestException(`La fecha ${field === 'from' ? 'de inicio' : 'final'} no tiene un formato valido.`);
    }

    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`La fecha ${field === 'from' ? 'de inicio' : 'final'} no es valida.`);
    }

    return date;
  }

  private formatReportDate(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private localDateKey(date: Date) {
    return this.formatReportDate(date);
  }
}
