import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { FastifyRequest } from 'fastify';
import { AuditService } from '../audit/audit.service';
import { InternalAuthUser } from '../auth/auth.types';
import { PrismaService } from '../database/prisma.service';
import {
  AssignUsersToStoreInput,
  CreateStoreInput,
  ListStoresInput,
  SetActiveStoreInput,
  UpdateStoreInput,
} from './store.schemas';

const storeListInclude = {
  createdByInternalUser: { select: { id: true, fullName: true, email: true } },
  updatedByInternalUser: { select: { id: true, fullName: true, email: true } },
  deactivatedByInternalUser: { select: { id: true, fullName: true, email: true } },
  _count: {
    select: {
      users: true,
      purchases: true,
      customers: true,
    },
  },
} satisfies Prisma.StoreInclude;

const storeDetailInclude = {
  createdByInternalUser: { select: { id: true, fullName: true, email: true } },
  updatedByInternalUser: { select: { id: true, fullName: true, email: true } },
  deactivatedByInternalUser: { select: { id: true, fullName: true, email: true } },
  users: {
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  },
} satisfies Prisma.StoreInclude;

@Injectable()
export class StoresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async listStores(input: ListStoresInput) {
    const where = this.buildStoreWhere(input);
    const orderBy = this.buildStoreOrderBy(input);
    const skip = input.exportAll ? 0 : (input.page - 1) * input.limit;
    const take = input.exportAll ? undefined : input.limit;

    const [data, total, summary] = await Promise.all([
      this.prisma.store.findMany({
        where,
        orderBy,
        skip,
        take,
        include: storeListInclude,
      }),
      this.prisma.store.count({ where }),
      this.getStoreSummary(),
    ]);

    return {
      data,
      summary,
      meta: {
        page: input.exportAll ? 1 : input.page,
        limit: input.exportAll ? total : input.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / input.limit)),
      },
    };
  }

  async createStore(input: CreateStoreInput, actor: InternalAuthUser, request: FastifyRequest) {
    await this.assertLocation(input);
    await this.assertBrand(input.brandId);

    try {
      const store = await this.prisma.store.create({
        data: {
          code: await this.generateUniqueStoreCode(),
          name: input.name,
          address: input.address,
          locationType: input.locationType,
          countryId: input.countryId,
          departmentId: input.departmentId,
          municipalityId: input.municipalityId,
          brandId: input.brandId,
          status: input.status ?? 'ACTIVE',
          createdByInternalUserId: actor.id,
          updatedByInternalUserId: actor.id,
        },
        include: storeDetailInclude,
      });

      await this.auditService.record({
        actorType: 'INTERNAL_USER',
        actorInternalUserId: actor.id,
        action: 'stores.create',
        module: 'stores',
        entityType: 'Store',
        entityId: store.id,
        metadata: { code: store.code, name: store.name, locationType: store.locationType },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return this.withStoreMetrics(store);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('El código generado ya existe. Intenta guardar de nuevo.');
      }

      throw error;
    }
  }

  async updateStore(id: string, input: UpdateStoreInput, actor: InternalAuthUser, request: FastifyRequest) {
    const existingStore = await this.prisma.store.findUnique({ where: { id } });

    if (!existingStore) {
      throw new NotFoundException('Tienda no encontrada.');
    }

    this.assertUpdatePermissions(input, existingStore, actor);
    await this.assertLocation(input);
    await this.assertBrand(input.brandId);

    const isDeactivating = existingStore.status === 'ACTIVE' && input.status === 'INACTIVE';

    try {
      const store = await this.prisma.store.update({
        where: { id },
        data: {
          name: input.name,
          address: input.address,
          locationType: input.locationType,
          countryId: input.countryId,
          departmentId: input.departmentId,
          municipalityId: input.municipalityId,
          brandId: input.brandId,
          status: input.status,
          updatedByInternalUserId: actor.id,
          deactivatedAt: isDeactivating ? new Date() : input.status === 'ACTIVE' ? null : existingStore.deactivatedAt,
          deactivatedByInternalUserId: isDeactivating ? actor.id : input.status === 'ACTIVE' ? null : existingStore.deactivatedByInternalUserId,
        },
        include: storeDetailInclude,
      });

      if (isDeactivating) {
        await this.prisma.internalSession.updateMany({
          where: { activeStoreId: id },
          data: { activeStoreId: null },
        });
      }

      await this.auditService.record({
        actorType: 'INTERNAL_USER',
        actorInternalUserId: actor.id,
        action: isDeactivating ? 'stores.deactivate' : 'stores.update',
        module: 'stores',
        entityType: 'Store',
        entityId: store.id,
        metadata: { before: existingStore, after: store },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return this.withStoreMetrics(store);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Ya existe una tienda con ese código.');
      }

      throw error;
    }
  }

  async assignUsers(storeId: string, input: AssignUsersToStoreInput, actor: InternalAuthUser, request: FastifyRequest) {
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });

    if (!store) {
      throw new NotFoundException('Tienda no encontrada.');
    }

    if (store.status !== 'ACTIVE' && input.userIds.length > 0) {
      throw new BadRequestException('No puedes asignar nuevos usuarios a una tienda inactiva.');
    }

    const users = await this.prisma.internalUser.findMany({
      where: { id: { in: input.userIds } },
      select: { id: true },
    });
    const foundUserIds = new Set(users.map((user) => user.id));
    const missingUserIds = input.userIds.filter((userId) => !foundUserIds.has(userId));

    if (missingUserIds.length > 0) {
      throw new BadRequestException({
        message: 'Uno o más usuarios no existen.',
        missingUserIds,
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.userStore.deleteMany({ where: { storeId } });

      if (input.userIds.length > 0) {
        await tx.userStore.deleteMany({ where: { userId: { in: input.userIds } } });
        await tx.userStore.createMany({
          data: input.userIds.map((userId) => ({ userId, storeId })),
          skipDuplicates: true,
        });

        await tx.internalSession.updateMany({
          where: {
            internalUserId: { in: input.userIds },
            revokedAt: null,
            activeStoreId: { not: storeId },
          },
          data: { activeStoreId: null },
        });
      }
    });

    await this.auditService.record({
      actorType: 'INTERNAL_USER',
      actorInternalUserId: actor.id,
      action: 'stores.assign_users',
      module: 'stores',
      entityType: 'Store',
      entityId: storeId,
      storeId,
      metadata: { userIds: input.userIds },
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });

    return this.getStoreDetail(storeId);
  }

  async getStoreDetail(id: string) {
    const store = await this.prisma.store.findUnique({
      where: { id },
      include: storeDetailInclude,
    });

    if (!store) {
      throw new NotFoundException('Tienda no encontrada.');
    }

    return this.withStoreMetrics(store);
  }

  async listPublicStores(search?: string) {
    return this.prisma.store.findMany({
      where: {
        status: 'ACTIVE',
        ...(search
          ? {
              OR: [
                { code: { contains: search, mode: 'insensitive' } },
                { name: { contains: search, mode: 'insensitive' } },
                { address: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        code: true,
        name: true,
        address: true,
        locationType: true,
      },
      orderBy: { name: 'asc' },
      take: 50,
    });
  }

  async getMyStores(actor: InternalAuthUser) {
    const stores = await this.prisma.store.findMany({
      where: {
        users: { some: { userId: actor.id } },
      },
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
    });

    return {
      stores,
      activeStoreId: actor.activeStoreId ?? null,
      requiresSelection: stores.filter((store) => store.status === 'ACTIVE').length > 1 && !actor.activeStoreId,
    };
  }

  async setActiveStore(input: SetActiveStoreInput, actor: InternalAuthUser, request: FastifyRequest) {
    const assignment = await this.prisma.userStore.findUnique({
      where: {
        userId_storeId: {
          userId: actor.id,
          storeId: input.storeId,
        },
      },
      include: { store: true },
    });

    if (!assignment) {
      throw new ForbiddenException('No tienes asignada esta tienda.');
    }

    if (assignment.store.status !== 'ACTIVE') {
      throw new BadRequestException('No puedes activar una tienda inactiva.');
    }

    await this.prisma.internalSession.update({
      where: { id: actor.sessionId },
      data: { activeStoreId: input.storeId },
    });

    await this.auditService.record({
      actorType: 'INTERNAL_USER',
      actorInternalUserId: actor.id,
      action: 'stores.set_active',
      module: 'stores',
      entityType: 'Store',
      entityId: input.storeId,
      storeId: input.storeId,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });

    return {
      activeStoreId: input.storeId,
      store: assignment.store,
    };
  }

  async getActiveStore(actor: InternalAuthUser) {
    if (!actor.activeStoreId) {
      return {
        activeStoreId: null,
        store: null,
      };
    }

    const store = await this.prisma.store.findUnique({ where: { id: actor.activeStoreId } });

    if (!store || store.status !== 'ACTIVE') {
      await this.prisma.internalSession.update({
        where: { id: actor.sessionId },
        data: { activeStoreId: null },
      });

      return {
        activeStoreId: null,
        store: null,
      };
    }

    return {
      activeStoreId: actor.activeStoreId,
      store,
    };
  }

  private buildStoreWhere(input: ListStoresInput): Prisma.StoreWhereInput {
    return {
      status: input.status,
      locationType: input.locationType,
      ...(input.search
        ? {
            OR: [
              { code: { contains: input.search, mode: 'insensitive' } },
              { name: { contains: input.search, mode: 'insensitive' } },
              { address: { contains: input.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  private buildStoreOrderBy(input: ListStoresInput): Prisma.StoreOrderByWithRelationInput[] {
    return [{ [input.sortBy]: input.sortDirection }, { createdAt: 'desc' }];
  }

  private async getStoreSummary() {
    const [total, active, inactive, departments, capital] = await Promise.all([
      this.prisma.store.count(),
      this.prisma.store.count({ where: { status: 'ACTIVE' } }),
      this.prisma.store.count({ where: { status: 'INACTIVE' } }),
      this.prisma.store.count({ where: { locationType: 'DEPARTMENT' } }),
      this.prisma.store.count({ where: { locationType: 'CAPITAL' } }),
    ]);

    return { total, active, inactive, departments, capital };
  }

  private async withStoreMetrics<T extends StoreWithDetailInclude>(store: T) {
    const [customersCount, purchasesCount] = await Promise.all([
      this.prisma.customer.count({ where: { registrationStoreId: store.id } }),
      this.prisma.purchase.count({ where: { storeId: store.id } }),
    ]);

    return {
      ...store,
      metrics: {
        usersAssigned: store.users.length,
        activeUsersAssigned: store.users.filter((assignment) => assignment.user.status === 'ACTIVE').length,
        customersRegistered: customersCount,
        purchasesRegistered: purchasesCount,
      },
    };
  }

  private async generateUniqueStoreCode() {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const code = this.randomStoreCode();
      const existing = await this.prisma.store.findUnique({
        where: { code },
        select: { id: true },
      });

      if (!existing) return code;
    }

    throw new ConflictException('No se pudo generar un código único de tienda.');
  }

  private randomStoreCode() {
    const letters = Array.from({ length: 4 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('');
    const numbers = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
    return `${letters}${numbers}`;
  }

  private isUniqueConstraintError(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }

  private async assertLocation(input: {
    countryId: string;
    departmentId: string;
    municipalityId: string;
  }) {
    const [country, department, municipality] = await Promise.all([
      this.findActiveCatalogItem(input.countryId, 'PAIS'),
      this.findActiveCatalogItem(input.departmentId, 'DEPARTAMENTO'),
      this.findActiveCatalogItem(input.municipalityId, 'MUNICIPIO'),
    ]);

    if (!country || !department || !municipality) {
      throw new BadRequestException('La ubicacion seleccionada no existe o esta inactiva.');
    }

    if (department.parentItemId !== country.id) {
      throw new BadRequestException('El departamento no pertenece al pais seleccionado.');
    }

    if (municipality.parentItemId !== department.id) {
      throw new BadRequestException('El municipio no pertenece al departamento seleccionado.');
    }
  }

  private async assertBrand(brandId: string | null | undefined) {
    if (!brandId) return;

    const brand = await this.findActiveCatalogItem(brandId, 'BRANDS');

    if (!brand) {
      throw new BadRequestException('La marca seleccionada no existe o esta inactiva.');
    }
  }

  private findActiveCatalogItem(id: string, catalogCode: string) {
    return this.prisma.catalogItem.findFirst({
      where: {
        id,
        isActive: true,
        catalog: {
          code: catalogCode,
          isActive: true,
        },
      },
      select: {
        id: true,
        parentItemId: true,
      },
    });
  }

  private assertUpdatePermissions(input: UpdateStoreInput, existingStore: { status: string }, actor: InternalAuthUser) {
    const permissions = new Set(actor.permissions);
    if (permissions.has('stores.manage')) return;

    if (!permissions.has('stores.edit')) {
      throw new ForbiddenException('No tienes permiso para editar tiendas.');
    }

    if (input.status !== existingStore.status && !permissions.has('stores.status')) {
      throw new ForbiddenException('No tienes permiso para inactivar o reactivar tiendas.');
    }
  }
}

type StoreWithDetailInclude = Prisma.StoreGetPayload<{
  include: typeof storeDetailInclude;
}>;
