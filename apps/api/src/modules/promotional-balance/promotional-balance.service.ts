import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { AuditService } from '../audit/audit.service';
import { InternalAuthUser } from '../auth/auth.types';
import { PrismaService } from '../database/prisma.service';
import { SettingsService } from '../settings/settings.service';
import {
  ConvertPointsToBalanceInput,
  CreatePromotionalCreditInput,
  UsePromotionalBalanceInput,
} from './promotional-balance.schemas';

@Injectable()
export class PromotionalBalanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly settingsService: SettingsService,
  ) {}

  async getCustomerBalance(customerId: string) {
    const now = new Date();
    const [customer, aggregate, movements] = await Promise.all([
      this.prisma.customer.findUnique({
        where: { id: customerId },
        select: { id: true, code: true, fullName: true, status: true },
      }),
      this.prisma.promotionalBalanceMovement.aggregate({
        where: { customerId, status: 'AVAILABLE', OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        _sum: { amount: true },
      }),
      this.prisma.promotionalBalanceMovement.findMany({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    if (!customer) {
      throw new NotFoundException('Cliente no encontrado.');
    }

    return {
      customer,
      balance: aggregate._sum.amount?.toString() ?? '0.00',
      movements: movements.map((movement) => ({
        ...movement,
        amount: movement.amount.toString(),
      })),
    };
  }

  async createCredit(input: CreatePromotionalCreditInput, actor: InternalAuthUser, request: FastifyRequest) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: input.customerId },
      select: { id: true, code: true, fullName: true, status: true },
    });

    if (!customer) {
      throw new NotFoundException('Cliente no encontrado.');
    }

    if (customer.status !== 'ACTIVE') {
      throw new BadRequestException('No puedes asignar saldo a un cliente inactivo o bloqueado.');
    }

    const movement = await this.prisma.promotionalBalanceMovement.create({
      data: {
        customerId: input.customerId,
        type: 'ADMIN_CREDIT',
        status: 'AVAILABLE',
        amount: input.amount.toFixed(2),
        description: input.description,
        expiresAt: input.expiresAt,
      },
    });

    await this.auditService.record({
      actorType: 'INTERNAL_USER',
      actorInternalUserId: actor.id,
      action: 'promotional_balance.credit',
      module: 'promotional_balance',
      entityType: 'PromotionalBalanceMovement',
      entityId: movement.id,
      metadata: {
        customerId: customer.id,
        customerCode: customer.code,
        amount: movement.amount.toString(),
        description: input.description,
        expiresAt: input.expiresAt?.toISOString() ?? null,
      },
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });

    return {
      ...movement,
      amount: movement.amount.toString(),
    };
  }

  async convertPoints(input: ConvertPointsToBalanceInput, actor: InternalAuthUser, request: FastifyRequest) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: input.customerId },
      select: { id: true, code: true, fullName: true, status: true },
    });

    if (!customer) {
      throw new NotFoundException('Cliente no encontrado.');
    }

    if (customer.status !== 'ACTIVE') {
      throw new BadRequestException('No puedes convertir puntos de un cliente inactivo o bloqueado.');
    }

    const pointAggregate = await this.prisma.pointMovement.aggregate({
      where: { customerId: input.customerId, status: 'AVAILABLE', OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      _sum: { points: true },
    });
    const availablePoints = pointAggregate._sum.points ?? 0;

    if (input.points > availablePoints) {
      throw new BadRequestException('El cliente no tiene puntos suficientes para convertir.');
    }

    const conversionRule = await this.settingsService.getPointsToBalanceConversion();

    if (!conversionRule.isEnabled) {
      throw new BadRequestException('La conversion de puntos a saldo promocional no esta habilitada.');
    }

    if (input.points < conversionRule.minimumPoints) {
      throw new BadRequestException(`Debes convertir al menos ${conversionRule.minimumPoints} puntos.`);
    }

    const conversionAmount = this.calculateConversionAmount(input.points, conversionRule);

    if (conversionAmount <= 0) {
      throw new BadRequestException('La conversion no genera saldo promocional.');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const pointMovement = await tx.pointMovement.create({
        data: {
          customerId: input.customerId,
          type: 'POINT_CONVERTED_TO_BALANCE',
          status: 'AVAILABLE',
          points: -input.points,
          description: input.description ?? `Conversion de ${input.points} puntos a saldo promocional`,
        },
      });

      const balanceMovement = await tx.promotionalBalanceMovement.create({
        data: {
          customerId: input.customerId,
          type: 'POINT_CONVERSION',
          status: 'AVAILABLE',
          amount: conversionAmount.toFixed(2),
          description: input.description ?? `Saldo por conversion de ${input.points} puntos`,
          expiresAt: input.expiresAt,
        },
      });

      return { pointMovement, balanceMovement };
    });

    await this.auditService.record({
      actorType: 'INTERNAL_USER',
      actorInternalUserId: actor.id,
      action: 'promotional_balance.convert_points',
      module: 'promotional_balance',
      entityType: 'PromotionalBalanceMovement',
      entityId: result.balanceMovement.id,
      metadata: {
        customerId: customer.id,
        customerCode: customer.code,
        pointsConverted: input.points,
        amount: result.balanceMovement.amount.toString(),
        pointMovementId: result.pointMovement.id,
        conversionRule,
        expiresAt: input.expiresAt?.toISOString() ?? null,
      },
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });

    return {
      pointsConverted: input.points,
      amount: result.balanceMovement.amount.toString(),
      pointMovement: result.pointMovement,
      balanceMovement: {
        ...result.balanceMovement,
        amount: result.balanceMovement.amount.toString(),
      },
    };
  }

  async useBalance(input: UsePromotionalBalanceInput, actor: InternalAuthUser, request: FastifyRequest) {
    const activeStoreId = actor.activeStoreId;

    if (!activeStoreId) {
      throw new BadRequestException('Debes seleccionar una tienda activa antes de usar saldo promocional.');
    }

    if (!actor.storeIds.includes(activeStoreId)) {
      throw new ForbiddenException('La tienda activa no pertenece al usuario autenticado.');
    }

    const now = new Date();
    const [customer, store, balanceAggregate] = await Promise.all([
      this.prisma.customer.findUnique({
        where: { id: input.customerId },
        select: { id: true, code: true, fullName: true, taxId: true, status: true },
      }),
      this.prisma.store.findUnique({
        where: { id: activeStoreId },
        select: { id: true, code: true, name: true, status: true },
      }),
      this.prisma.promotionalBalanceMovement.aggregate({
        where: { customerId: input.customerId, status: 'AVAILABLE', OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        _sum: { amount: true },
      }),
    ]);

    if (!customer) {
      throw new NotFoundException('Cliente no encontrado.');
    }

    if (customer.status !== 'ACTIVE') {
      throw new BadRequestException('No puedes usar saldo de un cliente inactivo o bloqueado.');
    }

    if (!customer.taxId) {
      throw new BadRequestException('El cliente seleccionado no tiene NIT registrado.');
    }

    if (customer.taxId !== input.customerTaxId) {
      throw new BadRequestException('El NIT ingresado no corresponde al cliente seleccionado.');
    }

    if (!store) {
      throw new NotFoundException('Tienda activa no encontrada.');
    }

    if (store.status !== 'ACTIVE') {
      throw new BadRequestException('La tienda activa esta inactiva.');
    }

    const availableBalance = Number(balanceAggregate._sum.amount ?? 0);
    const promotionalBalanceSettings = await this.settingsService.getPromotionalBalance();

    if (input.amount > availableBalance) {
      throw new BadRequestException('El cliente no tiene saldo promocional suficiente.');
    }

    if (promotionalBalanceSettings.maxUsePerPurchase !== null && input.amount > promotionalBalanceSettings.maxUsePerPurchase) {
      throw new BadRequestException(`El uso maximo de saldo promocional por compra es Q${promotionalBalanceSettings.maxUsePerPurchase.toFixed(2)}.`);
    }

    const movement = await this.prisma.promotionalBalanceMovement.create({
      data: {
        customerId: input.customerId,
        type: 'PURCHASE_USE',
        status: 'AVAILABLE',
        amount: (-input.amount).toFixed(2),
        description:
          input.description ??
          `Uso de saldo promocional en ${store.name}${input.invoiceNumber ? `, factura No. ${input.invoiceNumber}` : ''}`,
      },
    });

    await this.auditService.record({
      actorType: 'INTERNAL_USER',
      actorInternalUserId: actor.id,
      action: 'promotional_balance.use',
      module: 'promotional_balance',
      entityType: 'PromotionalBalanceMovement',
      entityId: movement.id,
      storeId: store.id,
      metadata: {
        customerId: customer.id,
        customerCode: customer.code,
        storeCode: store.code,
        amount: input.amount.toFixed(2),
        invoiceNumber: input.invoiceNumber ?? null,
        balanceBefore: availableBalance.toFixed(2),
        balanceAfter: (availableBalance - input.amount).toFixed(2),
      },
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });

    return {
      movement: {
        ...movement,
        amount: movement.amount.toString(),
      },
      balanceBefore: availableBalance.toFixed(2),
      balanceAfter: (availableBalance - input.amount).toFixed(2),
      customer,
      store,
    };
  }

  private calculateConversionAmount(points: number, rule: { points: number; amount: number }) {
    return (points / rule.points) * rule.amount;
  }
}
