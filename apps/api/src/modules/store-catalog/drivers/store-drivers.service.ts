import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import argon2 from 'argon2';
import { AuditService } from '../../audit/audit.service';
import { InternalAuthUser } from '../../auth/auth.types';
import { PrismaService } from '../../database/prisma.service';
import { STORE_ORDER_STATUS } from '../order/store-order.constants';
import {
  CreateStoreDriverInput,
  ResetStoreDriverPasswordInput,
  UpdateStoreDriverAccessStatusInput,
  UpdateStoreDriverInput,
  UpdateStoreDriverStatusInput,
  UpsertStoreDriverAccessInput,
} from './store-driver.schemas';

type ListDriversQuery = Record<string, string | undefined>;

const driverOrderSelect = {
  id: true,
  orderNumber: true,
  deliveryStatus: true,
  confirmedDeliveryDate: true,
  deliveryTimeRange: true,
  customer: { select: { id: true, fullName: true, phone: true } },
} satisfies Prisma.StoreOrderSelect;

@Injectable()
export class StoreDriversService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async listAdmin(query: ListDriversQuery = {}) {
    const search = query.search?.trim();
    const phone = query.phone?.trim().replace(/\s+/g, '');
    const status = this.parseStatus(query.status);

    const drivers = await this.prisma.storeDriver.findMany({
      where: {
        ...(status === undefined ? {} : { isActive: status }),
        ...(phone ? { phone: { contains: phone } } : {}),
        ...(search
          ? {
              OR: [
                { fullName: { contains: search, mode: 'insensitive' } },
                { code: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ isActive: 'desc' }, { fullName: 'asc' }],
      include: { _count: { select: { assignedOrders: true } } },
    });

    return drivers.map((driver) => this.toListDto(driver));
  }

  async listActive() {
    return this.prisma.storeDriver.findMany({
      where: { isActive: true },
      orderBy: { fullName: 'asc' },
      select: { id: true, fullName: true, phone: true, code: true, type: true },
    });
  }

  async get(id: string) {
    const driver = await this.prisma.storeDriver.findUnique({
      where: { id },
      include: {
        assignedOrders: {
          where: { orderStatus: { not: STORE_ORDER_STATUS.CANCELADO } },
          orderBy: [{ confirmedDeliveryDate: 'asc' }, { createdAt: 'desc' }],
          take: 20,
          select: driverOrderSelect,
        },
        assignmentHistoryTo: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            order: { select: { id: true, orderNumber: true } },
            previousDriver: { select: { id: true, fullName: true } },
            newDriver: { select: { id: true, fullName: true } },
          },
        },
      },
    });

    if (!driver) {
      throw new NotFoundException('Mensajero no encontrado.');
    }

    return {
      ...this.sanitizeDriver(driver),
      assignedOrdersCount: driver.assignedOrders.length,
    };
  }

  async create(input: CreateStoreDriverInput, actor: InternalAuthUser) {
    try {
      const driver = await this.prisma.storeDriver.create({
        data: {
          fullName: input.fullName,
          phone: input.phone,
          email: input.email ?? null,
          code: input.code ?? null,
          type: input.type,
          notes: input.notes ?? null,
          vehiclePlate: input.vehiclePlate ?? null,
          vehicleType: input.vehicleType ?? null,
          vehicleBrand: input.vehicleBrand ?? null,
          vehicleModel: input.vehicleModel ?? null,
          isActive: input.isActive,
          createdByInternalUserId: actor.id,
          updatedByInternalUserId: actor.id,
        },
      });

      await this.auditService.record({
        actorType: 'INTERNAL_USER',
        actorInternalUserId: actor.id,
        action: 'store_drivers.create',
        module: 'store_drivers',
        entityType: 'StoreDriver',
        entityId: driver.id,
        metadata: { fullName: driver.fullName, code: driver.code },
      });

      return this.sanitizeDriver(driver);
    } catch (error) {
      throw this.translateUniqueError(error);
    }
  }

  async update(id: string, input: UpdateStoreDriverInput, actor: InternalAuthUser) {
    const existing = await this.assertExists(id);

    try {
      const driver = await this.prisma.storeDriver.update({
        where: { id },
        data: { ...input, updatedByInternalUserId: actor.id },
      });

      await this.auditService.record({
        actorType: 'INTERNAL_USER',
        actorInternalUserId: actor.id,
        action: 'store_drivers.update',
        module: 'store_drivers',
        entityType: 'StoreDriver',
        entityId: driver.id,
        metadata: { before: existing, after: driver },
      });

      return this.sanitizeDriver(driver);
    } catch (error) {
      throw this.translateUniqueError(error);
    }
  }

  async updateStatus(id: string, input: UpdateStoreDriverStatusInput, actor: InternalAuthUser) {
    const existing = await this.assertExists(id);
    const driver = await this.prisma.storeDriver.update({
      where: { id },
      data: { isActive: input.isActive, updatedByInternalUserId: actor.id },
    });

    await this.auditService.record({
      actorType: 'INTERNAL_USER',
      actorInternalUserId: actor.id,
      action: 'store_drivers.status',
      module: 'store_drivers',
      entityType: 'StoreDriver',
      entityId: driver.id,
      metadata: { previousStatus: existing.isActive, newStatus: driver.isActive },
    });

    return this.sanitizeDriver(driver);
  }

  async upsertAccess(id: string, input: UpsertStoreDriverAccessInput, actor: InternalAuthUser) {
    const existing = await this.assertExists(id);

    try {
      const driver = await this.prisma.storeDriver.update({
        where: { id },
        data: {
          email: input.email,
          passwordHash: await argon2.hash(input.temporaryPassword),
          mustChangePassword: true,
          accessStatus: 'PENDIENTE_PRIMER_INGRESO',
          updatedByInternalUserId: actor.id,
        },
      });

      await this.revokeDriverSessions(id);
      await this.auditService.record({
        actorType: 'INTERNAL_USER',
        actorInternalUserId: actor.id,
        action: 'store_drivers.access.upsert',
        module: 'store_drivers',
        entityType: 'StoreDriver',
        entityId: id,
        metadata: { previousEmail: existing.email, newEmail: driver.email },
      });

      return this.sanitizeDriver(driver);
    } catch (error) {
      throw this.translateUniqueError(error);
    }
  }

  async resetPassword(id: string, input: ResetStoreDriverPasswordInput, actor: InternalAuthUser) {
    const existing = await this.assertExists(id);
    if (!existing.email) {
      throw new ConflictException('Agrega un email de acceso antes de restablecer la contrasena.');
    }

    const driver = await this.prisma.storeDriver.update({
      where: { id },
      data: {
        passwordHash: await argon2.hash(input.temporaryPassword),
        mustChangePassword: true,
        accessStatus: 'PENDIENTE_PRIMER_INGRESO',
        updatedByInternalUserId: actor.id,
      },
    });

    await this.revokeDriverSessions(id);
    await this.auditService.record({
      actorType: 'INTERNAL_USER',
      actorInternalUserId: actor.id,
      action: 'store_drivers.access.reset_password',
      module: 'store_drivers',
      entityType: 'StoreDriver',
      entityId: id,
      metadata: { email: driver.email },
    });

    return this.sanitizeDriver(driver);
  }

  async updateAccessStatus(id: string, input: UpdateStoreDriverAccessStatusInput, actor: InternalAuthUser) {
    const existing = await this.assertExists(id);
    const driver = await this.prisma.storeDriver.update({
      where: { id },
      data: { accessStatus: input.accessStatus, updatedByInternalUserId: actor.id },
    });

    if (input.accessStatus === 'BLOQUEADO' || input.accessStatus === 'INACTIVO') {
      await this.revokeDriverSessions(id);
    }

    await this.auditService.record({
      actorType: 'INTERNAL_USER',
      actorInternalUserId: actor.id,
      action: 'store_drivers.access.status',
      module: 'store_drivers',
      entityType: 'StoreDriver',
      entityId: id,
      metadata: { previousStatus: existing.accessStatus, newStatus: driver.accessStatus },
    });

    return this.sanitizeDriver(driver);
  }

  async assertActive(id: string) {
    const driver = await this.prisma.storeDriver.findUnique({ where: { id } });
    if (!driver || !driver.isActive) {
      throw new ConflictException('El mensajero seleccionado no existe o esta inactivo.');
    }
    return driver;
  }

  private async assertExists(id: string) {
    const driver = await this.prisma.storeDriver.findUnique({ where: { id } });
    if (!driver) {
      throw new NotFoundException('Mensajero no encontrado.');
    }
    return driver;
  }

  private parseStatus(value: string | undefined) {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  }

  private toListDto(driver: { _count: { assignedOrders: number } } & Record<string, unknown>) {
    const { _count, passwordHash: _passwordHash, ...rest } = driver;
    return { ...rest, assignedOrdersCount: _count.assignedOrders };
  }

  private sanitizeDriver<T extends { passwordHash?: string | null }>(driver: T) {
    const { passwordHash: _passwordHash, ...rest } = driver;
    return rest;
  }

  private async revokeDriverSessions(driverId: string) {
    await this.prisma.storeDriverSession.updateMany({
      where: { driverId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private translateUniqueError(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return new ConflictException('Ya existe un mensajero con ese codigo o email.');
    }
    return error;
  }
}
