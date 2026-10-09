import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateLoyaltyLevelTierInput, UpdateLoyaltyLevelTierInput } from './loyalty-level.schemas';

export type LevelProgress = {
  code: string;
  name: string;
  minPurchases: number;
  maxPurchases: number | null;
  nextLevelName: string | null;
  nextLevelMinPurchases: number | null;
  remainingPurchases: number;
};

const FALLBACK_TIERS = [
  { id: 'fallback-basico', code: 'BASICO', name: 'Básico', minPurchases: 0, maxPurchases: 2, sortOrder: 0, isActive: true },
  { id: 'fallback-bronce', code: 'BRONCE', name: 'Bronce', minPurchases: 3, maxPurchases: 5, sortOrder: 1, isActive: true },
  { id: 'fallback-plata', code: 'PLATA', name: 'Plata', minPurchases: 6, maxPurchases: 10, sortOrder: 2, isActive: true },
  { id: 'fallback-oro', code: 'ORO', name: 'Oro', minPurchases: 11, maxPurchases: null, sortOrder: 3, isActive: true },
];

@Injectable()
export class LoyaltyLevelsService {
  constructor(private readonly prisma: PrismaService) {}

  async listTiers(includeInactive = false) {
    const ruleId = await this.getDefaultRuleId();
    await this.ensureDefaultTiers(ruleId);

    const tiers = await this.prisma.loyaltyLevelTier.findMany({
      where: {
        ruleId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: { sortOrder: 'asc' },
    });

    return tiers.length > 0 ? tiers : FALLBACK_TIERS;
  }

  async createTier(input: CreateLoyaltyLevelTierInput) {
    const ruleId = await this.getDefaultRuleId();
    await this.assertNoRangeOverlap(input.minPurchases, input.maxPurchases ?? null, undefined, ruleId);

    try {
      const created = await this.prisma.loyaltyLevelTier.create({
        data: {
          ruleId,
          code: input.code,
          name: input.name,
          minPurchases: input.minPurchases,
          maxPurchases: input.maxPurchases ?? null,
          sortOrder: input.sortOrder ?? (await this.nextSortOrder(ruleId)),
        },
      });
      await this.recalculateAllCustomerLevels();
      return created;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Ya existe un nivel con ese codigo.');
      }
      throw error;
    }
  }

  async updateTier(id: string, input: UpdateLoyaltyLevelTierInput) {
    const existing = await this.prisma.loyaltyLevelTier.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Nivel de lealtad no encontrado.');
    }

    const nextMin = input.minPurchases ?? existing.minPurchases;
    const nextMax = input.maxPurchases === undefined ? existing.maxPurchases : input.maxPurchases;

    if (nextMax != null && nextMax < nextMin) {
      throw new ConflictException('El maximo de compras debe ser mayor o igual al minimo.');
    }

    await this.assertNoRangeOverlap(nextMin, nextMax, id, existing.ruleId);

    const updated = await this.prisma.loyaltyLevelTier.update({
      where: { id },
      data: {
        name: input.name,
        minPurchases: input.minPurchases,
        maxPurchases: input.maxPurchases === undefined ? undefined : input.maxPurchases,
        sortOrder: input.sortOrder,
        isActive: input.isActive,
      },
    });
    await this.recalculateAllCustomerLevels();
    return updated;
  }

  resolveLevelForCount(purchasesCount: number, tiers: Array<{ code: string; name: string; minPurchases: number; maxPurchases: number | null; sortOrder: number; isActive: boolean }>): LevelProgress {
    const ordered = [...tiers].filter((tier) => tier.isActive).sort((left, right) => left.sortOrder - right.sortOrder);
    const matched = ordered.find((tier) => purchasesCount >= tier.minPurchases && (tier.maxPurchases == null || purchasesCount <= tier.maxPurchases))
      ?? ordered[ordered.length - 1]
      ?? FALLBACK_TIERS[0];

    const matchedIndex = ordered.findIndex((tier) => tier.code === matched.code);
    const next = matchedIndex >= 0 ? ordered[matchedIndex + 1] : undefined;

    return {
      code: matched.code,
      name: matched.name,
      minPurchases: matched.minPurchases,
      maxPurchases: matched.maxPurchases,
      nextLevelName: next?.name ?? null,
      nextLevelMinPurchases: next?.minPurchases ?? null,
      remainingPurchases: next ? Math.max(0, next.minPurchases - purchasesCount) : 0,
    };
  }

  async getLevelProgress(purchasesCount: number) {
    const tiers = await this.listTiers();
    return this.resolveLevelForCount(purchasesCount, tiers);
  }

  /** Recomputes purchasesCount + loyaltyLevel for a customer from approved purchases and persists it. */
  async recalculateCustomerLevel(customerId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    const [purchasesCount, tiers] = await Promise.all([
      client.purchase.count({ where: { customerId, status: 'APPROVED' } }),
      this.listTiers(),
    ]);

    const progress = this.resolveLevelForCount(purchasesCount, tiers);

    await client.customer.update({
      where: { id: customerId },
      data: { purchasesCount, loyaltyLevel: progress.name },
    });

    return { purchasesCount, loyaltyLevel: progress.name, progress };
  }

  private async getDefaultRuleId() {
    const existing = await this.prisma.loyaltyLevelRule.findFirst({
      where: { isActive: true, brandItemId: null },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    if (existing) return existing.id;

    const created = await this.prisma.loyaltyLevelRule.create({
      data: {
        name: 'Regla global de niveles',
        brandNameSnapshot: 'Todas las marcas',
        isActive: true,
        activatedAt: new Date(),
      },
      select: { id: true },
    });

    return created.id;
  }

  private async ensureDefaultTiers(ruleId: string) {
    const existingCount = await this.prisma.loyaltyLevelTier.count({ where: { ruleId } });
    if (existingCount > 0) return;

    await this.prisma.loyaltyLevelTier.createMany({
      data: FALLBACK_TIERS.map((tier) => ({
        ruleId,
        code: tier.code,
        name: tier.name,
        minPurchases: tier.minPurchases,
        maxPurchases: tier.maxPurchases,
        sortOrder: tier.sortOrder,
        isActive: tier.isActive,
      })),
      skipDuplicates: true,
    });
  }

  private async recalculateAllCustomerLevels() {
    const tiers = await this.listTiers();
    const customers = await this.prisma.customer.findMany({
      select: { id: true, purchasesCount: true },
    });

    for (const customer of customers) {
      const progress = this.resolveLevelForCount(customer.purchasesCount, tiers);
      await this.prisma.customer.update({
        where: { id: customer.id },
        data: { loyaltyLevel: progress.name },
      });
    }
  }

  private async nextSortOrder(ruleId: string) {
    const last = await this.prisma.loyaltyLevelTier.findFirst({ where: { ruleId }, orderBy: { sortOrder: 'desc' } });
    return (last?.sortOrder ?? -1) + 1;
  }

  private async assertNoRangeOverlap(minPurchases: number, maxPurchases: number | null, excludeId?: string, ruleId?: string) {
    const tiers = await this.prisma.loyaltyLevelTier.findMany({
      where: { isActive: true, ...(ruleId ? { ruleId } : {}), ...(excludeId ? { id: { not: excludeId } } : {}) },
    });

    const overlaps = tiers.some((tier) => {
      const tierMax = tier.maxPurchases ?? Number.POSITIVE_INFINITY;
      const newMax = maxPurchases ?? Number.POSITIVE_INFINITY;
      return minPurchases <= tierMax && tier.minPurchases <= newMax;
    });

    if (overlaps) {
      throw new ConflictException('El rango de compras se superpone con otro nivel existente.');
    }
  }
}
