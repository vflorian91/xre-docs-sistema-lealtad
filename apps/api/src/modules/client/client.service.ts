import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { FastifyRequest } from 'fastify';
import { AuditService } from '../audit/audit.service';
import { CustomerAuthUser } from '../auth/auth.types';
import { PrismaService } from '../database/prisma.service';
import { LoyaltyLevelsService } from '../loyalty-levels/loyalty-levels.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PointPromotionsService } from '../points/point-promotions.service';
import { PointRulesService } from '../points/point-rules.service';
import { SettingsService } from '../settings/settings.service';
import { ScanInvoiceQrInput, UpdateClientProfileInput } from './client.schemas';

@Injectable()
export class ClientService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly loyaltyLevelsService: LoyaltyLevelsService,
    private readonly pointRulesService: PointRulesService,
    private readonly pointPromotionsService: PointPromotionsService,
    private readonly settingsService: SettingsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getSummary(customer: CustomerAuthUser) {
    const [customerRow, pointAggregate, promotionalBalanceAggregate, purchases, movements] = await Promise.all([
      this.prisma.customer.findUnique({
        where: { id: customer.id },
        select: {
          id: true,
          code: true,
          fullName: true,
          phone: true,
          taxId: true,
          email: true,
          status: true,
          profilePhotoUrl: true,
          address: true,
          zone: true,
          city: true,
          department: true,
          country: true,
          reference: true,
          brand: true,
          brandItemId: true,
          brandItem: {
            select: { id: true, name: true, cardImageUrl: true, cardTextColor: true, socialLinks: true },
          },
          purchasesCount: true,
          loyaltyLevel: true,
        },
      }),
      this.prisma.pointMovement.aggregate({
        where: {
          customerId: customer.id,
          status: 'AVAILABLE',
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        _sum: { points: true },
      }),
      this.prisma.promotionalBalanceMovement.aggregate({
        where: {
          customerId: customer.id,
          status: 'AVAILABLE',
        },
        _sum: { amount: true },
      }),
      this.prisma.purchase.findMany({
        where: {
          customerId: customer.id,
          status: { in: ['APPROVED', 'PENDING_REVIEW'] },
        },
        orderBy: { purchasedAt: 'desc' },
        take: 5,
        include: this.purchaseInclude,
      }),
      this.prisma.pointMovement.findMany({
        where: { customerId: customer.id },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          purchase: {
            include: {
              store: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const availablePoints = pointAggregate._sum.points ?? 0;
    const level = await this.loyaltyLevelsService.getLevelProgress(customerRow?.purchasesCount ?? 0);
    const brand = customerRow?.brand ?? null;
    const brandItem = customerRow?.brandItem ?? (brand
      ? await this.prisma.catalogItem.findFirst({
          where: { isActive: true, name: { equals: brand, mode: 'insensitive' }, catalog: { code: 'BRANDS' } },
          select: { id: true, name: true, cardImageUrl: true, cardTextColor: true, socialLinks: true },
        })
      : null);
    const customerProfile = customerRow
      ? { ...customerRow, brand: brandItem?.name ?? customerRow.brand }
      : customer;

    return {
      customer: customerProfile,
      availablePoints,
      level,
      purchasesCount: customerRow?.purchasesCount ?? 0,
      recentPurchasesCount: purchases.length,
      purchases,
      movements,
      promotionalBalance: promotionalBalanceAggregate._sum.amount?.toString() ?? '0.00',
      brandCardImageUrl: brandItem?.cardImageUrl ?? null,
      brandCardTextColor: brandItem?.cardTextColor ?? null,
      brandSocialLinks: normalizeBrandSocialLinks(brandItem?.socialLinks),
    };
  }

  async getPurchases(customer: CustomerAuthUser) {
    return this.prisma.purchase.findMany({
      where: { customerId: customer.id },
      orderBy: { purchasedAt: 'desc' },
      take: 50,
      include: this.purchaseInclude,
    });
  }

  async getPointMovements(customer: CustomerAuthUser) {
    return this.prisma.pointMovement.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        purchase: {
          select: {
            id: true,
            invoiceNumber: true,
            amount: true,
            purchasedAt: true,
            store: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  async getProfile(customer: CustomerAuthUser) {
    return this.prisma.customer.findUnique({
      where: { id: customer.id },
      select: this.profileSelect,
    });
  }

  async updateProfile(customer: CustomerAuthUser, input: UpdateClientProfileInput, request: FastifyRequest) {
    const existing = await this.prisma.customer.findUnique({
      where: { id: customer.id },
      select: this.profileSelect,
    });

    const updated = await this.prisma.customer.update({
      where: { id: customer.id },
      data: {
        fullName: resolveClientFullName(input),
        phone: input.phone,
        email: input.email,
        address: input.address,
        zone: input.address !== undefined || input.city !== undefined || input.department !== undefined ? null : undefined,
        city: input.city,
        department: input.department,
        country: input.address !== undefined || input.city !== undefined || input.department !== undefined ? 'Guatemala' : undefined,
        reference: input.reference,
      },
      select: this.profileSelect,
    });

    await this.auditService.record({
      actorType: 'CUSTOMER',
      actorCustomerId: customer.id,
      action: 'customers.profile_update',
      module: 'customers',
      entityType: 'Customer',
      entityId: customer.id,
      metadata: { before: existing, after: updated },
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });

    return updated;
  }

  async registerInvoiceQr(customer: CustomerAuthUser, input: ScanInvoiceQrInput, request: FastifyRequest) {
    const parsed = parseInvoiceQrPayload(input.rawValue);
    const invoiceNumber = normalizeInvoiceNumber(parsed.invoiceNumber);
    const amount = parsed.amount;
    const qrTaxId = normalizeTaxId(parsed.taxId);
    const qrBrandKey = normalizeBrandKey(parsed.brand);

    if (!invoiceNumber) {
      throw new BadRequestException('El QR no incluye un numero de factura valido.');
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('El QR no incluye un monto valido.');
    }

    if (!qrTaxId) {
      throw new BadRequestException('El QR no incluye un NIT valido.');
    }

    if (!qrBrandKey) {
      throw new BadRequestException('El QR no incluye una marca valida.');
    }

    const customerRow = await this.prisma.customer.findUnique({
      where: { id: customer.id },
      select: {
        id: true,
        code: true,
        fullName: true,
        taxId: true,
        status: true,
        loyaltyLevel: true,
        brand: true,
        brandItemId: true,
        brandItem: {
          select: { id: true, code: true, name: true },
        },
        registrationStoreId: true,
      },
    });

    if (!customerRow || customerRow.status !== 'ACTIVE') {
      throw new BadRequestException('Cliente inactivo o no encontrado.');
    }

    if (!customerRow.taxId) {
      throw new BadRequestException('Tu cuenta no tiene NIT registrado para validar la factura.');
    }

    if (qrTaxId !== normalizeTaxId(customerRow.taxId)) {
      throw new BadRequestException('El NIT del QR no corresponde a tu cuenta.');
    }

    const qrBrand = await this.resolveQrBrand(parsed.brand);
    if (!customerRow.brandItemId || customerRow.brandItemId !== qrBrand.id) {
      const customerBrandKey = normalizeBrandKey(customerRow.brandItem?.name ?? customerRow.brand);
      if (!customerBrandKey || customerBrandKey !== qrBrandKey) {
        throw new BadRequestException('La marca del QR no corresponde a tu cuenta.');
      }
    }

    const [store, shoeType, systemUser] = await Promise.all([
      this.resolveQrStore(qrBrand.id),
      this.resolveQrShoeType(),
      this.resolveSystemInternalUserId(),
    ]);

    const pointRule = await this.pointRulesService.getActiveRule(store.brandId);
    const basePoints = calculateBasePoints(amount, pointRule);
    const promotion = await this.pointPromotionsService.findApplicablePromotion({
      amount,
      storeId: store.id,
      brandItemId: store.brandId,
      shoeTypeId: shoeType.id,
      customerLevel: customerRow.loyaltyLevel,
    });
    const points = this.pointPromotionsService.applyPromotion(basePoints, promotion);
    const review = await this.resolveReviewDecision(amount, points);
    const pointsExpireAt = calculatePointExpiration(pointRule.pointsExpirationDays);
    const pointRuleSnapshot = pointRuleSnapshotFor(pointRule, amount, basePoints, points);
    const pointPromotionSnapshot = promotion ? pointPromotionSnapshotFor(promotion, basePoints, points) : undefined;

    const result = await this.prisma.$transaction(async (tx) => {
      const duplicate = await tx.purchase.findUnique({
        where: { storeId_invoiceNumber: { storeId: store.id, invoiceNumber } },
        select: { id: true, invoiceNumber: true, amount: true, createdAt: true },
      });

      if (duplicate) {
        throw new ConflictException({
          message: 'Esta factura ya fue registrada para esta tienda.',
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
          customerId: customer.id,
          storeId: store.id,
          internalUserId: systemUser.id,
          invoiceNumber,
          externalSource: 'CLIENT_QR',
          externalInvoiceId: `${store.code}:${invoiceNumber}`,
          externalSyncedAt: new Date(),
          externalPayload: {
            rawValue: input.rawValue,
            source: 'client_pwa_qr',
            parsed: {
              invoiceNumber,
              amount: amount.toFixed(2),
              taxId: qrTaxId,
              brand: qrBrand.name,
            },
            review: {
              reasons: review.reasons,
              pointRule: pointRuleSnapshot,
              promotionApplied: pointPromotionSnapshot ?? null,
            },
          },
          amount: amount.toFixed(2),
          shoeTypeId: shoeType.id,
          brandId: store.brandId,
          pointsCalculated: points,
          status: review.requiresReview ? 'PENDING_REVIEW' : 'APPROVED',
        },
        include: this.purchaseInclude,
      });

      const pointMovement =
        !review.requiresReview && points > 0
          ? await tx.pointMovement.create({
              data: {
                customerId: customer.id,
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
                description: `Puntos por factura QR No. ${invoiceNumber}`,
                expiresAt: pointsExpireAt,
              },
            })
          : null;

      if (!review.requiresReview) {
        await this.loyaltyLevelsService.recalculateCustomerLevel(customer.id, tx);
      }

      return { purchase, pointMovement };
    });

    await this.auditService.record({
      actorType: 'CUSTOMER',
      actorCustomerId: customer.id,
      action: 'purchases.client_qr_create',
      module: 'purchases',
      entityType: 'Purchase',
      entityId: result.purchase.id,
      storeId: store.id,
      metadata: {
        invoiceNumber,
        amount: amount.toFixed(2),
        pointsCalculated: points,
        status: review.requiresReview ? 'PENDING_REVIEW' : 'APPROVED',
        storeCode: store.code,
        storeName: store.name,
        brand: qrBrand.name,
        taxId: qrTaxId,
        shoeTypeCode: shoeType.code,
        basePointsCalculated: basePoints,
        promotionApplied: pointPromotionSnapshot ?? null,
        reviewReasons: review.reasons,
        pointMovementId: result.pointMovement?.id ?? null,
      },
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });

    if (!review.requiresReview && promotion && result.pointMovement) {
      await this.pointPromotionsService.markUsed(promotion.id);
    }

    if (!review.requiresReview && result.pointMovement) {
      await this.notificationsService.notifyPointsEarned(customer.id, points, `la factura ${invoiceNumber}`, {
        purchaseId: result.purchase.id,
        pointMovementId: result.pointMovement.id,
        promotionId: promotion?.id ?? null,
        storeId: store.id,
      });
    }

    return {
      purchase: result.purchase,
      pointsCalculated: points,
      status: review.requiresReview ? 'PENDING_REVIEW' : 'APPROVED',
      reviewReasons: review.reasons,
      store: { id: store.id, code: store.code, name: store.name },
      shoeType: { id: shoeType.id, code: shoeType.code, name: shoeType.name },
    };
  }

  private readonly purchaseInclude = {
    store: {
      select: {
        id: true,
        code: true,
        name: true,
      },
    },
    pointMovements: true,
  } satisfies Prisma.PurchaseInclude;

  async getCatalogItems(code: string, parentItemId?: string) {
    const catalog = await this.prisma.catalog.findUnique({
      where: { code },
      select: { id: true },
    });
    if (!catalog) return [];
    return this.prisma.catalogItem.findMany({
      where: {
        catalogId: catalog.id,
        isActive: true,
        ...(parentItemId ? { parentItemId } : { parentItemId: null }),
      },
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    });
  }

  private async resolveQrStore(brandId: string) {
    const store = await this.prisma.store.findFirst({
      where: { status: 'ACTIVE', brandId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, code: true, name: true, brandId: true },
    });

    if (!store) throw new NotFoundException('No hay una tienda activa configurada para la marca de esta factura.');
    return store;
  }

  private async resolveQrBrand(brand: string) {
    const brandKey = normalizeBrandKey(brand);
    const brands = await this.prisma.catalogItem.findMany({
      where: {
        isActive: true,
        catalog: { code: 'BRANDS', isActive: true },
      },
      select: { id: true, code: true, name: true },
    });
    const match = brands.find((item) => normalizeBrandKey(item.name) === brandKey || normalizeBrandKey(item.code) === brandKey);
    if (!match) throw new BadRequestException('La marca del QR no existe o no esta activa.');
    return match;
  }

  private async resolveQrShoeType(input: { shoeTypeId?: string; shoeTypeCode?: string } = {}) {
    const shoeType = await this.prisma.catalogItem.findFirst({
      where: {
        isActive: true,
        catalog: { code: 'SHOE_TYPES', isActive: true },
        OR: [
          ...(input.shoeTypeId ? [{ id: input.shoeTypeId }] : []),
          ...(input.shoeTypeCode ? [{ code: { equals: input.shoeTypeCode, mode: 'insensitive' as const } }] : []),
        ],
      },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, code: true, name: true },
    });

    if (shoeType) return shoeType;

    const fallback = await this.prisma.catalogItem.findFirst({
      where: { isActive: true, catalog: { code: 'SHOE_TYPES', isActive: true } },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, code: true, name: true },
    });

    if (!fallback) throw new NotFoundException('No existe un tipo de producto activo para registrar la factura.');
    return fallback;
  }

  private async resolveSystemInternalUserId() {
    const user = await this.prisma.internalUser.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    if (!user) throw new NotFoundException('No existe un usuario interno activo para registrar la factura.');
    return user;
  }

  private async resolveReviewDecision(amount: number, points: number) {
    const setting = await this.settingsService.getPurchaseReview();
    const reasons: string[] = [];
    if (setting.isEnabled && setting.amountThreshold !== null && amount >= setting.amountThreshold) reasons.push(`Monto igual o mayor a Q${setting.amountThreshold.toFixed(2)}.`);
    if (setting.isEnabled && setting.pointsThreshold !== null && points >= setting.pointsThreshold) reasons.push(`Puntos calculados iguales o mayores a ${setting.pointsThreshold}.`);
    return { requiresReview: reasons.length > 0, reasons };
  }

  private readonly profileSelect = {
    id: true,
    code: true,
    fullName: true,
    phone: true,
    taxId: true,
    email: true,
    profilePhotoUrl: true,
    status: true,
    address: true,
    zone: true,
    city: true,
    department: true,
    country: true,
    reference: true,
    createdAt: true,
    updatedAt: true,
  } satisfies Prisma.CustomerSelect;
}

type ParsedInvoiceQr = {
  invoiceNumber: string;
  amount: number;
  taxId: string;
  brand: string;
};

function parseInvoiceQrPayload(rawValue: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawValue);
  } catch {
    throw new BadRequestException('El QR debe contener un JSON valido.');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new BadRequestException('El QR debe contener un objeto JSON.');
  }

  const data = parsed as Record<string, unknown>;
  const invoiceNumber = readQrText(data, ['invoiceNumber', 'numeroFactura', 'numero de factura', 'noFactura', 'no. factura', 'factura']);
  const amount = readQrAmount(data);
  const taxId = readQrText(data, ['taxId', 'nit']);
  const brand = readQrText(data, ['brand', 'marca']);

  if (!invoiceNumber || !taxId || !brand || !Number.isFinite(amount)) {
    throw new BadRequestException('El QR tiene tipos de datos invalidos.');
  }

  return {
    invoiceNumber,
    amount,
    taxId,
    brand,
  };
}

function readQrText(data: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = readQrValue(data, key);
    if (typeof value !== 'string' && typeof value !== 'number') continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return null;
}

function readQrAmount(data: Record<string, unknown>) {
  const value = readQrValue(data, 'amount') ?? readQrValue(data, 'monto');
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value.trim().replace(/,/g, ''));
  return Number.NaN;
}

function readQrValue(data: Record<string, unknown>, key: string) {
  if (Object.prototype.hasOwnProperty.call(data, key)) return data[key];
  const expectedKey = normalizeQrFieldKey(key);
  const entry = Object.entries(data).find(([candidate]) => normalizeQrFieldKey(candidate) === expectedKey);
  return entry?.[1];
}

function normalizeQrFieldKey(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}

function normalizeInvoiceNumber(value?: string | null) {
  const digits = value?.replace(/\D/g, '') ?? '';
  return digits.length >= 6 && digits.length <= 15 ? digits : null;
}

function normalizeTaxId(value?: string | null) {
  return value?.toUpperCase().replace(/[^0-9A-Z-]/g, '') ?? null;
}

function normalizeBrandKey(value?: string | null) {
  return value?.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]/g, '') ?? null;
}

function calculateBasePoints(amount: number, pointRule: Prisma.PointRuleGetPayload<Record<string, never>>) {
  const amountPerPoint = Number(pointRule.amountPerPoint);
  if (amountPerPoint <= 0) throw new BadRequestException('La configuracion de puntos no es valida.');
  if (amount < Number(pointRule.minimumAmount)) return 0;
  const roundedPoints = Math.floor(amount / amountPerPoint);
  return Math.max(0, pointRule.maxPointsPerPurchase && roundedPoints > pointRule.maxPointsPerPurchase ? pointRule.maxPointsPerPurchase : roundedPoints);
}

function calculatePointExpiration(expirationDays: number | null) {
  if (!expirationDays) return null;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expirationDays);
  return expiresAt;
}

function pointRuleSnapshotFor(pointRule: Prisma.PointRuleGetPayload<Record<string, never>>, amount: number, basePoints: number, finalPoints: number) {
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

function pointPromotionSnapshotFor(promotion: Prisma.PointPromotionGetPayload<Record<string, never>>, basePoints: number, finalPoints: number) {
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

function resolveClientFullName(input: UpdateClientProfileInput) {
  if (input.fullName?.trim()) return input.fullName.trim();
  if (input.firstName || input.lastName) return `${input.firstName ?? ''} ${input.lastName ?? ''}`.replace(/\s+/g, ' ').trim();
  return undefined;
}

const socialKeys = ['facebook', 'instagram', 'tiktok', 'x', 'whatsapp', 'website'] as const;

function normalizeBrandSocialLinks(value: Prisma.JsonValue | null | undefined) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  const links: Partial<Record<(typeof socialKeys)[number], string>> = {};
  for (const key of socialKeys) {
    const item = (value as Record<string, unknown>)[key];
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;

    const active = (item as Record<string, unknown>).active === true;
    const url = (item as Record<string, unknown>).url;
    if (!active || typeof url !== 'string' || !isValidExternalUrl(url)) continue;
    links[key] = url;
  }

  return links;
}

function isValidExternalUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
