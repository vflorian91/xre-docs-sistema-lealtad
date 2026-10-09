import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { FastifyRequest } from 'fastify';
import { AuditService } from '../audit/audit.service';
import { CustomerAuthUser, InternalAuthUser } from '../auth/auth.types';
import { PrismaService } from '../database/prisma.service';
import { CreateRewardInput, UpdateRewardInput } from './reward.schemas';

const categorySelect = { id: true, code: true, name: true };
const brandSelect = { id: true, code: true, name: true };
type ListAdminRewardsQuery = Record<string, string | undefined>;

@Injectable()
export class RewardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async listAdmin(query: ListAdminRewardsQuery = {}) {
    const page = this.parsePositiveInt(query.page, 1);
    const limit = Math.min(this.parsePositiveInt(query.limit, 10), 50);
    const skip = (page - 1) * limit;
    const name = query.name?.trim().toLowerCase() ?? '';
    const minPoints = this.parseOptionalNumber(query.points);
    const minStock = this.parseOptionalNumber(query.stock);
    const minAvailable = this.parseOptionalNumber(query.available);
    const published = this.parseOptionalBoolean(query.published);
    const flowType = this.normalizeFlowType(query.flowType);
    const rewardType = this.normalizeRewardType(query.rewardType);
    const productType = this.normalizeProductType(query.productType);
    const genderTarget = this.normalizeGenderTarget(query.genderTarget);
    const where = this.buildAdminListWhere({
      name,
      minPoints,
      minStock,
      minAvailable,
      published,
      flowType,
      rewardType,
      productType,
      genderTarget,
    });

    const [products, totalRows] = await Promise.all([
      this.prisma.$queryRaw<Array<{
        id: string;
        code: string;
        name: string;
        description: string | null;
        pointsValue: number;
        stock: number | null;
        reservedStock: number;
        imageUrl: string | null;
        isActive: boolean;
        isFeatured: boolean;
        requiresApproval: boolean;
        isGiftCard: boolean;
        isPublished: boolean;
        displayOrder: number;
        categoryItemId: string | null;
        brandItemId: string | null;
        productType: string | null;
        genderTarget: string | null;
        createdAt: Date;
        updatedAt: Date;
      }>>(Prisma.sql`
        SELECT
          "id",
          "code",
          "name",
          "description",
          "pointsValue",
          "stock",
          "reservedStock",
          "imageUrl",
          "isActive",
          "isFeatured",
          "requiresApproval",
          "isGiftCard",
          "isPublished",
          "displayOrder",
          "categoryItemId",
          "brandItemId",
          "productType",
          "genderTarget",
          "createdAt",
          "updatedAt"
        FROM "redeemable_products"
        WHERE ${where}
        ORDER BY "pointsValue" ASC, "name" ASC
        LIMIT ${limit}
        OFFSET ${skip}
      `),
      this.prisma.$queryRaw<Array<{ total: number }>>(Prisma.sql`
        SELECT COUNT(*)::int AS "total"
        FROM "redeemable_products"
        WHERE ${where}
      `),
    ]);

    const total = totalRows[0]?.total ?? 0;
    return {
      data: products.map((product) => this.withComputedFields(product)),
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  async listPublic(customer: CustomerAuthUser) {
    const now = new Date();
    const products = await this.prisma.redeemableProduct.findMany({
      where: {
        isActive: true,
        isPublished: true,
        AND: [
          { OR: [{ publishStartDate: null }, { publishStartDate: { lte: now } }] },
          { OR: [{ publishEndDate: null }, { publishEndDate: { gte: now } }] },
          {
            OR: [
              { brandItemId: null },
              ...(customer.brandItemId ? [{ brandItemId: customer.brandItemId }] : []),
            ],
          },
        ],
      },
      orderBy: [{ pointsValue: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        pointsValue: true,
        stock: true,
        reservedStock: true,
        imageUrl: true,
        isFeatured: true,
        requiresApproval: true,
        isGiftCard: true,
        productType: true,
        genderTarget: true,
        redemptionLimitPerCustomer: true,
        termsConditions: true,
        category: { select: categorySelect },
      },
    });

    return products
      .map((product) => this.withComputedFields(product))
      .filter((product) => product.availableStock === null || product.availableStock > 0);
  }

  async get(id: string) {
    const product = await this.prisma.redeemableProduct.findUnique({
      where: { id },
      include: { category: { select: categorySelect }, brand: { select: brandSelect } },
    });

    if (!product) {
      throw new NotFoundException('Producto canjeable no encontrado.');
    }

    return this.withComputedFields(product);
  }

  async create(input: CreateRewardInput, actor: InternalAuthUser, request: FastifyRequest) {
    if (input.brandItemId) {
      await this.assertActiveBrand(input.brandItemId);
    }

    try {
      const product = await this.prisma.redeemableProduct.create({
        data: { ...input, createdByInternalUserId: actor.id, updatedByInternalUserId: actor.id },
      });

      await this.auditService.record({
        actorType: 'INTERNAL_USER',
        actorInternalUserId: actor.id,
        action: 'redeemable_products.create',
        module: 'redeemable_products',
        entityType: 'RedeemableProduct',
        entityId: product.id,
        metadata: { code: product.code, pointsValue: product.pointsValue },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return product;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Ya existe un producto canjeable con ese codigo.');
      }

      throw error;
    }
  }

  async update(id: string, input: UpdateRewardInput, actor: InternalAuthUser, request: FastifyRequest) {
    const existingProduct = await this.prisma.redeemableProduct.findUnique({ where: { id } });

    if (!existingProduct) {
      throw new NotFoundException('Producto canjeable no encontrado.');
    }

    if ('brandItemId' in input && input.brandItemId) {
      await this.assertActiveBrand(input.brandItemId);
    }

    try {
      const product = await this.prisma.redeemableProduct.update({
        where: { id },
        data: { ...input, updatedByInternalUserId: actor.id },
      });

      await this.auditService.record({
        actorType: 'INTERNAL_USER',
        actorInternalUserId: actor.id,
        action: 'redeemable_products.update',
        module: 'redeemable_products',
        entityType: 'RedeemableProduct',
        entityId: product.id,
        metadata: { before: existingProduct, after: product },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return product;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Ya existe un producto canjeable con ese codigo.');
      }

      throw error;
    }
  }

  private withComputedFields<T extends { stock: number | null; reservedStock: number }>(product: T) {
    const availableStock = product.stock === null ? null : Math.max(0, product.stock - product.reservedStock);
    return { ...product, availableStock };
  }

  private buildAdminListWhere(input: {
    name: string;
    minPoints?: number;
    minStock?: number;
    minAvailable?: number;
    published?: boolean;
    flowType?: 'APPROVAL' | 'IMMEDIATE';
    rewardType?: 'GIFT_CARD' | 'PRODUCT';
    productType?: string;
    genderTarget?: string;
  }) {
    const conditions: Prisma.Sql[] = [Prisma.sql`1 = 1`];

    if (input.name) {
      conditions.push(Prisma.sql`LOWER("name") LIKE ${`%${input.name}%`}`);
    }

    if (input.minPoints !== undefined) {
      conditions.push(Prisma.sql`"pointsValue" >= ${input.minPoints}`);
    }

    if (input.minStock !== undefined) {
      conditions.push(Prisma.sql`"stock" IS NOT NULL`);
      conditions.push(Prisma.sql`"stock" >= ${input.minStock}`);
    }

    if (input.minAvailable !== undefined) {
      conditions.push(Prisma.sql`"stock" IS NOT NULL`);
      conditions.push(Prisma.sql`GREATEST(0, "stock" - "reservedStock") >= ${input.minAvailable}`);
    }

    if (input.published !== undefined) {
      conditions.push(Prisma.sql`"isPublished" = ${input.published}`);
    }

    if (input.flowType) {
      conditions.push(Prisma.sql`"requiresApproval" = ${input.flowType === 'APPROVAL'}`);
    }

    if (input.rewardType) {
      conditions.push(Prisma.sql`"isGiftCard" = ${input.rewardType === 'GIFT_CARD'}`);
    }

    if (input.productType) {
      conditions.push(Prisma.sql`"productType" = ${input.productType}`);
    }

    if (input.genderTarget) {
      conditions.push(Prisma.sql`"genderTarget" = ${input.genderTarget}`);
    }

    return Prisma.join(conditions, ' AND ');
  }

  private parsePositiveInt(value: string | undefined, fallback: number) {
    const parsed = Number.parseInt(value ?? '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private parseOptionalNumber(value: string | undefined) {
    if (value === undefined || value.trim() === '') return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
  }

  private parseOptionalBoolean(value: string | undefined) {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  }

  private normalizeFlowType(value: string | undefined) {
    if (value === 'APPROVAL' || value === 'IMMEDIATE') return value;
    return undefined;
  }

  private normalizeRewardType(value: string | undefined) {
    if (value === 'GIFT_CARD' || value === 'PRODUCT') return value;
    return undefined;
  }

  private normalizeProductType(value: string | undefined) {
    if (['DEPORTIVO', 'CASUAL', 'FORMAL', 'RUNNING', 'URBANO', 'ROPA', 'ACCESORIO', 'OTRO'].includes(value ?? '')) return value;
    return undefined;
  }

  private normalizeGenderTarget(value: string | undefined) {
    if (['HOMBRE', 'MUJER', 'NINO', 'NINA', 'UNISEX'].includes(value ?? '')) return value;
    return undefined;
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
