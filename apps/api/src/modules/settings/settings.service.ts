import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { FastifyRequest } from 'fastify';
import { AuditService } from '../audit/audit.service';
import { InternalAuthUser } from '../auth/auth.types';
import { PrismaService } from '../database/prisma.service';
import {
  DEFAULT_SETTINGS,
  PointsSetting,
  PointsToBalanceConversionSetting,
  PurchaseReviewSetting,
  PromotionalBalanceSetting,
  RedemptionsSetting,
  SETTING_DESCRIPTIONS,
  SETTING_KEYS,
  SettingKey,
} from './settings.defaults';
import { SettingKeyInput, UpdateSettingInput } from './settings.schemas';

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async listSettings() {
    await this.ensureDefaults();

    return this.prisma.setting.findMany({
      where: { key: { in: Object.keys(DEFAULT_SETTINGS) } },
      orderBy: { key: 'asc' },
    });
  }

  async getSetting(key: SettingKeyInput) {
    await this.ensureDefault(key);

    const setting = await this.prisma.setting.findUnique({ where: { key } });

    if (!setting) {
      throw new NotFoundException('Parametro no encontrado.');
    }

    return setting;
  }

  async updateSetting(input: UpdateSettingInput, actor: InternalAuthUser, request: FastifyRequest) {
    await this.ensureDefault(input.key);

    const setting = await this.prisma.setting.update({
      where: { key: input.key },
      data: {
        value: input.value as Prisma.InputJsonValue,
      },
    });

    await this.auditService.record({
      actorType: 'INTERNAL_USER',
      actorInternalUserId: actor.id,
      action: 'settings.update',
      module: 'settings',
      entityType: 'Setting',
      entityId: setting.id,
      metadata: {
        key: setting.key,
        value: setting.value,
      },
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });

    return setting;
  }

  async getPoints(): Promise<PointsSetting> {
    const value = await this.getValue(SETTING_KEYS.points);
    const fallback = DEFAULT_SETTINGS[SETTING_KEYS.points];
    const parsed = value as Partial<PointsSetting>;

    return {
      pointsPerCurrencyUnit: this.positiveNumber(parsed.pointsPerCurrencyUnit, fallback.pointsPerCurrencyUnit),
      pointValueAmount: this.positiveNumber(parsed.pointValueAmount, fallback.pointValueAmount),
      minimumPurchaseAmount: this.nonNegativeNumber(parsed.minimumPurchaseAmount, fallback.minimumPurchaseAmount),
      maxPointsPerPurchase: parsed.maxPointsPerPurchase === null || parsed.maxPointsPerPurchase === undefined
        ? null
        : this.positiveInteger(parsed.maxPointsPerPurchase, fallback.maxPointsPerPurchase ?? 1),
      pointsExpirationDays: parsed.pointsExpirationDays === null || parsed.pointsExpirationDays === undefined
        ? null
        : this.positiveInteger(parsed.pointsExpirationDays, fallback.pointsExpirationDays ?? 1),
      isEnabled: typeof parsed.isEnabled === 'boolean' ? parsed.isEnabled : fallback.isEnabled,
    };
  }

  async getPointsToBalanceConversion(): Promise<PointsToBalanceConversionSetting> {
    const value = await this.getValue(SETTING_KEYS.pointsToBalanceConversion);
    const fallback = DEFAULT_SETTINGS[SETTING_KEYS.pointsToBalanceConversion];
    const parsed = value as Partial<PointsToBalanceConversionSetting>;

    return {
      points: this.positiveInteger(parsed.points, fallback.points),
      amount: this.positiveNumber(parsed.amount, fallback.amount),
      minimumPoints: this.positiveInteger(parsed.minimumPoints, fallback.minimumPoints),
      isEnabled: typeof parsed.isEnabled === 'boolean' ? parsed.isEnabled : fallback.isEnabled,
    };
  }

  async getPurchaseReview(): Promise<PurchaseReviewSetting> {
    const value = await this.getValue(SETTING_KEYS.purchaseReview);
    const fallback = DEFAULT_SETTINGS[SETTING_KEYS.purchaseReview];
    const parsed = value as Partial<PurchaseReviewSetting>;

    return {
      isEnabled: typeof parsed.isEnabled === 'boolean' ? parsed.isEnabled : fallback.isEnabled,
      amountThreshold: parsed.amountThreshold === null || parsed.amountThreshold === undefined
        ? null
        : this.positiveNumber(parsed.amountThreshold, fallback.amountThreshold ?? 1),
      pointsThreshold: parsed.pointsThreshold === null || parsed.pointsThreshold === undefined
        ? null
        : this.positiveInteger(parsed.pointsThreshold, fallback.pointsThreshold ?? 1),
    };
  }

  async getRedemptions(): Promise<RedemptionsSetting> {
    const value = await this.getValue(SETTING_KEYS.redemptions);
    const fallback = DEFAULT_SETTINGS[SETTING_KEYS.redemptions];
    const parsed = value as Partial<RedemptionsSetting>;

    return {
      expirationDays: this.positiveInteger(parsed.expirationDays, fallback.expirationDays),
    };
  }

  async getPromotionalBalance(): Promise<PromotionalBalanceSetting> {
    const value = await this.getValue(SETTING_KEYS.promotionalBalance);
    const parsed = value as Partial<PromotionalBalanceSetting>;

    return {
      maxUsePerPurchase: parsed.maxUsePerPurchase === null || parsed.maxUsePerPurchase === undefined
        ? null
        : this.positiveNumber(parsed.maxUsePerPurchase, 0),
    };
  }

  private async getValue(key: SettingKey) {
    await this.ensureDefault(key);
    const setting = await this.prisma.setting.findUnique({ where: { key } });

    return setting?.value ?? DEFAULT_SETTINGS[key];
  }

  private async ensureDefaults() {
    await Promise.all(Object.keys(DEFAULT_SETTINGS).map((key) => this.ensureDefault(key as SettingKey)));
  }

  private async ensureDefault(key: SettingKey) {
    const defaultValue = DEFAULT_SETTINGS[key];

    if (!defaultValue) {
      throw new BadRequestException('Parametro no soportado.');
    }

    await this.prisma.setting.upsert({
      where: { key },
      update: {
        description: SETTING_DESCRIPTIONS[key],
      },
      create: {
        key,
        value: defaultValue as Prisma.InputJsonValue,
        description: SETTING_DESCRIPTIONS[key],
        isEditable: true,
      },
    });
  }

  private positiveInteger(value: unknown, fallback: number) {
    return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : fallback;
  }

  private positiveNumber(value: unknown, fallback: number) {
    return typeof value === 'number' && value > 0 ? value : fallback;
  }

  private nonNegativeNumber(value: unknown, fallback: number) {
    return typeof value === 'number' && value >= 0 ? value : fallback;
  }
}
