import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { FastifyRequest } from 'fastify';
import { AuditService } from '../audit/audit.service';
import { CustomerAuthUser, InternalAuthUser } from '../auth/auth.types';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BannerEventInput, CreateMarketingBannerInput, UpdateMarketingBannerInput } from './marketing-banner.schemas';

type BannerStatus = 'ACTIVE' | 'INACTIVE' | 'DRAFT';
type BannerAudience = 'ALL' | 'BRANDS';
type BannerPlacement = 'LOYALTY' | 'STORE';
type ListAdminBannersQuery = Record<string, string | undefined>;

const bannerAudienceInclude = {
  targetBrands: {
    include: {
      brand: { select: { id: true, code: true, name: true, isActive: true } },
    },
  },
} satisfies Prisma.MarketingBannerInclude;

@Injectable()
export class MarketingBannersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async listAdmin(query: ListAdminBannersQuery = {}) {
    const page = this.parsePositiveInt(query.page, 1);
    const pageSize = Math.min(this.parsePositiveInt(query.pageSize, 10), 50);
    const skip = (page - 1) * pageSize;
    const title = query.title?.trim().toLowerCase() ?? '';
    const status = this.normalizeStatus(query.status);
    const minViews = this.parseOptionalNumber(query.views);
    const minClicks = this.parseOptionalNumber(query.clicks);
    const minCtr = this.parseOptionalNumber(query.ctr);
    const placement = this.normalizePlacement(query.placement);
    const where = this.buildAdminListWhere({ title, status, minViews, minClicks, minCtr, placement });

    const [rows, totalRows] = await Promise.all([
      this.prisma.$queryRaw<Array<{
        id: string;
        title: string;
        imageUrl: string | null;
        ctaUrl: string | null;
        status: BannerStatus;
        isActive: boolean;
        startsAt: Date;
        endsAt: Date | null;
        sortOrder: number;
        placement: BannerPlacement;
        totalViews: number;
        totalClicks: number;
        createdAt: Date;
        updatedAt: Date;
        audienceType: BannerAudience;
      }>>(Prisma.sql`
        SELECT
          "id",
          "title",
          "imageUrl",
          "ctaUrl",
          "status",
          "isActive",
          "startsAt",
          "endsAt",
          "sortOrder",
          "placement",
          "totalViews",
          "totalClicks",
          "createdAt",
          "updatedAt",
          "audienceType"
        FROM "MarketingBanner"
        WHERE ${where}
        ORDER BY "createdAt" DESC
        LIMIT ${pageSize}
        OFFSET ${skip}
      `),
      this.prisma.$queryRaw<Array<{ total: number }>>(Prisma.sql`
        SELECT COUNT(*)::int AS "total"
        FROM "MarketingBanner"
        WHERE ${where}
      `),
    ]);

    const total = totalRows[0]?.total ?? 0;

    return {
      data: rows,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async listPublic(customer: CustomerAuthUser, placementInput?: string) {
    const now = new Date();
    const placement = this.normalizePlacement(placementInput);
    const brandId = await this.getCustomerBrandId(customer.id);

    return this.prisma.marketingBanner.findMany({
      where: {
        placement,
        status: 'ACTIVE',
        isActive: true,
        startsAt: { lte: now },
        endsAt: { gte: now },
        imageUrl: { not: null },
        sortOrder: { gte: 1, lte: 7 },
        OR: [
          { audienceType: 'ALL' },
          ...(brandId ? [{ audienceType: 'BRANDS', targetBrands: { some: { brandId } } }] : []),
        ],
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      take: 7,
    });
  }

  async getNextSortOrder(audienceType: BannerAudience, brandIds: string[], placementInput?: string, excludeId?: string) {
    const placement = this.normalizePlacement(placementInput);
    const normalizedBrandIds = this.normalizeTargetBrandIds(audienceType, brandIds);
    const activeBanners = await this.prisma.marketingBanner.findMany({
      where: { placement, status: 'ACTIVE', ...(excludeId ? { id: { not: excludeId } } : {}) },
      include: { targetBrands: true },
    });

    for (let order = 1; order <= 7; order += 1) {
      const taken = activeBanners.some((banner) => {
        if (banner.sortOrder !== order) return false;
        if (audienceType === 'ALL' || banner.audienceType === 'ALL') return true;
        return banner.targetBrands.some((target) => normalizedBrandIds.includes(target.brandId));
      });
      if (!taken) return order;
    }

    return null;
  }

  async get(id: string) {
    const banner = await this.prisma.marketingBanner.findUnique({ where: { id }, include: bannerAudienceInclude });

    if (!banner) {
      throw new NotFoundException('Banner no encontrado.');
    }

    return banner;
  }

  async create(input: CreateMarketingBannerInput, actor: InternalAuthUser, request: FastifyRequest) {
    const targetBrandIds = this.normalizeTargetBrandIds(input.audienceType, input.targetBrandIds);
    await this.assertTargetBrands(input.audienceType, targetBrandIds);
    const placement = this.normalizePlacement(input.placement);
    const activation = input.status === 'ACTIVE'
      ? await this.resolveActivation(input.sortOrder, input.audienceType, targetBrandIds, placement)
      : null;
    const status = activation?.status ?? input.status;
    const banner = await this.prisma.marketingBanner.create({
      data: {
        title: input.title,
        subtitle: input.subtitle,
        badge: input.badge,
        imageUrl: input.imageUrl,
        ctaLabel: input.ctaLabel,
        ctaUrl: input.ctaUrl,
        tone: input.tone,
        status,
        placement,
        isActive: status === 'ACTIVE',
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        sortOrder: input.sortOrder,
        audienceType: input.audienceType,
        targetBrands: {
          create: targetBrandIds.map((brandId) => ({ brandId })),
        },
      },
      include: bannerAudienceInclude,
    });

    await this.auditService.record({
      actorType: 'INTERNAL_USER',
      actorInternalUserId: actor.id,
      action: 'marketing_banners.create',
      module: 'marketing',
      entityType: 'MarketingBanner',
      entityId: banner.id,
      metadata: { title: banner.title, isActive: banner.isActive },
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });

    if (banner.status === 'ACTIVE') {
      await this.notificationsService.notifySystemInternal(
        'Nuevo banner disponible',
        `Se publico el banner "${banner.title}" y ya esta visible para los clientes.`,
        { bannerId: banner.id, event: 'banner.created' },
      );
    }

    return { ...banner, publicationMessage: activation?.message ?? 'Banner creado correctamente.' };
  }

  async update(id: string, input: UpdateMarketingBannerInput, actor: InternalAuthUser, request: FastifyRequest) {
    const existingBanner = await this.prisma.marketingBanner.findUnique({
      where: { id },
      include: { targetBrands: true },
    });

    if (!existingBanner) {
      throw new NotFoundException('Banner no encontrado.');
    }

    const nextStatus = this.resolveStatusInput(input, existingBanner.status);
    const nextSortOrder = input.sortOrder ?? existingBanner.sortOrder;
    const nextImageUrl = input.imageUrl === undefined ? existingBanner.imageUrl : input.imageUrl;
    const nextStartsAt = input.startsAt ?? existingBanner.startsAt;
    const nextEndsAt = input.endsAt ?? existingBanner.endsAt;
    const nextPlacement = this.normalizePlacement(input.placement ?? existingBanner.placement);
    const nextAudienceType = (input.audienceType ?? existingBanner.audienceType) as BannerAudience;
    const nextTargetBrandIds = this.normalizeTargetBrandIds(
      nextAudienceType,
      input.targetBrandIds ?? existingBanner.targetBrands.map((target) => target.brandId),
    );

    await this.assertTargetBrands(nextAudienceType, nextTargetBrandIds);

    if (!nextImageUrl) {
      throw new BadRequestException('Debe cargar una imagen para guardar el banner.');
    }

    if (!nextEndsAt || nextEndsAt < nextStartsAt) {
      throw new BadRequestException('La fecha fin no puede ser menor que la fecha de inicio.');
    }

    if (nextStatus === 'ACTIVE') {
      await this.ensureCanActivate(nextSortOrder, nextAudienceType, nextTargetBrandIds, nextPlacement, id);
    }

    const { targetBrandIds: _targetBrandIds, ...bannerInput } = input;

    const banner = await this.prisma.marketingBanner.update({
      where: { id },
      data: {
        ...bannerInput,
        placement: nextPlacement,
        audienceType: nextAudienceType,
        status: nextStatus,
        isActive: nextStatus === 'ACTIVE',
        targetBrands: {
          deleteMany: {},
          create: nextTargetBrandIds.map((brandId) => ({ brandId })),
        },
      },
      include: bannerAudienceInclude,
    });

    await this.auditService.record({
      actorType: 'INTERNAL_USER',
      actorInternalUserId: actor.id,
      action: 'marketing_banners.update',
      module: 'marketing',
      entityType: 'MarketingBanner',
      entityId: banner.id,
      metadata: { before: existingBanner, after: banner },
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });

    return banner;
  }

  async recordView(id: string, input: BannerEventInput, customer: CustomerAuthUser) {
    return this.recordEvent(id, 'view', input, customer);
  }

  async recordClick(id: string, input: BannerEventInput, customer: CustomerAuthUser) {
    return this.recordEvent(id, 'click', input, customer);
  }

  private async recordEvent(id: string, eventType: 'view' | 'click', input: BannerEventInput, customer: CustomerAuthUser) {
    const banner = await this.prisma.marketingBanner.findUnique({
      where: { id },
      include: { targetBrands: true },
    });

    if (!banner || !this.isPublicable(banner) || !await this.isBannerForCustomer(banner, customer.id)) {
      throw new NotFoundException('Banner no encontrado.');
    }

    const now = new Date();
    const updateData = eventType === 'view'
      ? { totalViews: { increment: 1 }, lastViewAt: now }
      : { totalClicks: { increment: 1 }, lastClickAt: now };

    await this.prisma.$transaction([
      this.prisma.marketingBannerEvent.create({
        data: {
          bannerId: id,
          eventType,
          customerId: customer.id,
          sessionId: input.sessionId ?? null,
        },
      }),
      this.prisma.marketingBanner.update({
        where: { id },
        data: updateData,
      }),
    ]);

    return { ok: true };
  }

  private resolveStatusInput(input: UpdateMarketingBannerInput, currentStatus: string): BannerStatus {
    if (input.status) return input.status;
    if (input.isActive === true) return 'ACTIVE';
    if (input.isActive === false) return 'INACTIVE';
    if (currentStatus === 'ACTIVE' || currentStatus === 'INACTIVE' || currentStatus === 'DRAFT') return currentStatus;
    return 'INACTIVE';
  }

  private buildAdminListWhere(input: {
    title: string;
    status?: BannerStatus;
    minViews?: number;
    minClicks?: number;
    minCtr?: number;
    placement: BannerPlacement;
  }) {
    const conditions: Prisma.Sql[] = [Prisma.sql`"placement" = ${input.placement}`];

    if (input.title) {
      conditions.push(Prisma.sql`LOWER("title") LIKE ${`%${input.title}%`}`);
    }

    if (input.status) {
      conditions.push(Prisma.sql`"status" = ${input.status}`);
    }

    if (input.minViews !== undefined) {
      conditions.push(Prisma.sql`"totalViews" >= ${input.minViews}`);
    }

    if (input.minClicks !== undefined) {
      conditions.push(Prisma.sql`"totalClicks" >= ${input.minClicks}`);
    }

    if (input.minCtr !== undefined) {
      conditions.push(Prisma.sql`"totalViews" > 0`);
      conditions.push(Prisma.sql`(("totalClicks"::numeric / "totalViews"::numeric) * 100) >= ${input.minCtr}`);
    }

    return Prisma.join(conditions, ' AND ');
  }

  private normalizeStatus(status?: string): BannerStatus | undefined {
    if (status === 'ACTIVE' || status === 'INACTIVE' || status === 'DRAFT') return status;
    return undefined;
  }

  private normalizePlacement(placement?: string): BannerPlacement {
    return placement === 'STORE' ? 'STORE' : 'LOYALTY';
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

  private async resolveActivation(sortOrder: number, audienceType: BannerAudience, brandIds: string[], placement: BannerPlacement) {
    const issue = await this.findActivationIssue(sortOrder, audienceType, brandIds, placement);
    return issue
      ? { status: 'DRAFT' as BannerStatus, message: `El banner fue guardado como borrador porque ${issue}` }
      : { status: 'ACTIVE' as BannerStatus, message: 'Banner creado correctamente.' };
  }

  private async ensureCanActivate(
    sortOrder: number,
    audienceType: BannerAudience,
    brandIds: string[],
    placement: BannerPlacement,
    currentBannerId: string,
  ) {
    const issue = await this.findActivationIssue(sortOrder, audienceType, brandIds, placement, currentBannerId);
    if (issue) throw new BadRequestException(`No se puede activar el banner porque ${issue}`);
  }

  private async findActivationIssue(
    sortOrder: number,
    audienceType: BannerAudience,
    brandIds: string[],
    placement: BannerPlacement,
    currentBannerId?: string,
  ) {
    const activeBanners = await this.prisma.marketingBanner.findMany({
      where: { placement, status: 'ACTIVE', ...(currentBannerId ? { id: { not: currentBannerId } } : {}) },
      include: { targetBrands: true },
    });

    const scopes = audienceType === 'ALL'
      ? [null, ...new Set(activeBanners.flatMap((banner) => banner.targetBrands.map((target) => target.brandId)))]
      : brandIds;

    const audienceCountReached = scopes.some((brandId) => activeBanners.filter((banner) => (
      banner.audienceType === 'ALL'
      || (brandId !== null && banner.targetBrands.some((target) => target.brandId === brandId))
    )).length >= 7);

    if (audienceCountReached) return 'esa audiencia ya tiene 7 banners activos.';

    const orderTaken = activeBanners.some((banner) => {
      if (banner.sortOrder !== sortOrder) return false;
      if (audienceType === 'ALL' || banner.audienceType === 'ALL') return true;
      return banner.targetBrands.some((target) => brandIds.includes(target.brandId));
    });

    if (orderTaken) return 'ya existe un banner activo con el mismo numero de orden para esa audiencia.';
    return null;
  }

  private normalizeTargetBrandIds(audienceType: BannerAudience, brandIds: string[]) {
    return audienceType === 'ALL' ? [] : [...new Set(brandIds)];
  }

  private async assertTargetBrands(audienceType: BannerAudience, brandIds: string[]) {
    if (audienceType === 'BRANDS' && brandIds.length === 0) {
      throw new BadRequestException('Selecciona al menos una marca para esta audiencia.');
    }
    if (audienceType === 'ALL') return;

    const count = await this.prisma.catalogItem.count({
      where: { id: { in: brandIds }, isActive: true, catalog: { code: 'BRANDS', isActive: true } },
    });
    if (count !== brandIds.length) throw new BadRequestException('Una o mas marcas seleccionadas no son validas.');
  }

  private async getCustomerBrandId(customerId: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId }, select: { brand: true, brandItemId: true } });
    if (customer?.brandItemId) return customer.brandItemId;
    if (!customer?.brand) return null;
    const brand = await this.prisma.catalogItem.findFirst({
      where: { name: { equals: customer.brand, mode: 'insensitive' }, isActive: true, catalog: { code: 'BRANDS', isActive: true } },
      select: { id: true },
    });
    return brand?.id ?? null;
  }

  private async isBannerForCustomer(
    banner: { audienceType: string; placement?: string; targetBrands: Array<{ brandId: string }> },
    customerId: string,
  ) {
    if (banner.placement === 'STORE') return true;
    if (banner.audienceType === 'ALL') return true;
    const brandId = await this.getCustomerBrandId(customerId);
    return Boolean(brandId && banner.targetBrands.some((target) => target.brandId === brandId));
  }

  private isPublicable(banner: { status: string; isActive: boolean; startsAt: Date; endsAt: Date | null; imageUrl: string | null; sortOrder: number }) {
    const now = new Date();
    return banner.status === 'ACTIVE'
      && banner.isActive
      && Boolean(banner.imageUrl)
      && banner.sortOrder >= 1
      && banner.sortOrder <= 7
      && banner.startsAt <= now
      && Boolean(banner.endsAt)
      && banner.endsAt! >= now;
  }
}
