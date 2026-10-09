import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import argon2 from 'argon2';
import { FastifyRequest } from 'fastify';
import { AuditService } from '../audit/audit.service';
import { InternalAuthUser } from '../auth/auth.types';
import { PrismaService } from '../database/prisma.service';
import { LoyaltyLevelsService } from '../loyalty-levels/loyalty-levels.service';
import { CreateCustomerInput, ListCustomersInput, SearchCustomersInput, UpdateCustomerInput } from './customer.schemas';

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly loyaltyLevelsService: LoyaltyLevelsService,
  ) {}

  async list(input: ListCustomersInput, actor: InternalAuthUser) {
    const where = this.applyCustomerScope(this.buildCustomerWhere(input), actor);
    const total = await this.prisma.customer.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / input.limit));
    const page = Math.min(input.page, totalPages);
    const start = input.exportAll ? 0 : (page - 1) * input.limit;
    const take = input.exportAll ? Math.min(total, input.limit) : input.limit;
    const customers = await this.prisma.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: start,
      take,
      select: this.customerListSelect,
    });

    return {
      data: customers,
      summary: await this.customerSummary(where),
      meta: {
        page,
        limit: input.limit,
        total,
        totalPages,
      },
    };
  }

  async search(input: SearchCustomersInput, actor: InternalAuthUser) {
    const where = this.applyCustomerScope({
      status: input.status,
      ...(input.code ? { code: { equals: input.code, mode: 'insensitive' } } : {}),
      ...(input.phone ? { phone: input.phone } : {}),
      ...(input.taxId ? { taxId: { equals: input.taxId.toUpperCase().replace(/[^0-9A-Z-]/g, ''), mode: 'insensitive' } } : {}),
      ...(input.q
        ? {
            OR: [
              { fullName: { contains: input.q, mode: 'insensitive' } },
              { code: { contains: input.q, mode: 'insensitive' } },
              { taxId: { contains: input.q.toUpperCase().replace(/[^0-9A-Z-]/g, '') || input.q, mode: 'insensitive' } },
              { phone: { contains: input.q } },
              { email: { contains: input.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    }, actor);

    const customers = await this.prisma.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: this.customerListSelect,
    });

    return this.attachPointBalance(customers);
  }

  async getById(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        registrationStore: true,
        createdByInternalUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException('Cliente no encontrado.');
    }

    const [enrichedCustomer] = await this.attachPointBalance([customer]);

    return enrichedCustomer;
  }

  async getProfile(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        registrationStore: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        createdByInternalUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException('Cliente no encontrado.');
    }

    const [enrichedCustomer] = await this.attachPointBalance([customer]);
    const levelProgress = await this.loyaltyLevelsService.getLevelProgress(customer.purchasesCount);

    const [purchases, pointMovements, redemptions, promotionalBalanceMovements, auditLogs] = await Promise.all([
      this.prisma.purchase.findMany({
        where: { customerId: id },
        orderBy: { purchasedAt: 'desc' },
        take: 25,
        include: {
          store: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          internalUser: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.pointMovement.findMany({
        where: { customerId: id },
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
              internalUser: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.redemptionRequest.findMany({
        where: { customerId: id },
        orderBy: { requestedAt: 'desc' },
        take: 25,
        include: {
          product: {
            select: {
              id: true,
              code: true,
              name: true,
              pointsValue: true,
            },
          },
          pickupStore: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          managedByInternalUser: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.promotionalBalanceMovement.findMany({
        where: { customerId: id },
        orderBy: { createdAt: 'desc' },
        take: 25,
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
      }),
      this.prisma.auditLog.findMany({
        where: {
          OR: [
            { actorCustomerId: id },
            { entityType: 'Customer', entityId: id },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
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
    ]);

    return {
      customer: enrichedCustomer,
      levelProgress,
      purchases,
      pointMovements,
      redemptions,
      promotionalBalanceMovements,
      auditLogs: auditLogs.map((log) => ({
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
        metadata: log.metadata,
        createdAt: log.createdAt,
      })),
    };
  }

  async createFromAdmin(input: CreateCustomerInput, actor: InternalAuthUser, request: FastifyRequest) {
    if (!input.password) {
      throw new BadRequestException('La contraseña temporal es obligatoria.');
    }

    if (!input.taxId) {
      throw new BadRequestException('El NIT es obligatorio para crear clientes desde administracion.');
    }

    return this.createCustomer(input, {
      actor,
      request,
      registrationSource: 'ADMIN',
    });
  }

  async createQuickFromStore(input: CreateCustomerInput, actor: InternalAuthUser, request: FastifyRequest) {
    if (!actor.activeStoreId) {
      throw new BadRequestException('Debes seleccionar una tienda activa antes de crear clientes.');
    }

    if (!input.taxId) {
      throw new BadRequestException('El NIT es obligatorio para crear clientes desde tienda.');
    }

    if (!actor.storeIds.includes(actor.activeStoreId)) {
      throw new ForbiddenException('La tienda activa no pertenece al usuario autenticado.');
    }

    const store = await this.prisma.store.findUnique({
      where: { id: actor.activeStoreId },
      select: { id: true, status: true },
    });

    if (!store || store.status !== 'ACTIVE') {
      throw new BadRequestException('La tienda activa esta inactiva.');
    }

    return this.createCustomer(input, {
      actor,
      request,
      registrationSource: 'STORE',
      registrationStoreId: actor.activeStoreId,
    });
  }

  async update(id: string, input: UpdateCustomerInput, actor: InternalAuthUser, request: FastifyRequest) {
    this.assertUpdatePermissions(input, actor);

    const existingCustomer = await this.prisma.customer.findUnique({ where: { id } });

    if (!existingCustomer) {
      throw new NotFoundException('Cliente no encontrado.');
    }

    try {
      let brandItem = input.brandItemId !== undefined
        ? await this.resolveBrandItem(input.brandItemId)
        : undefined;
      if (existingCustomer.registrationStoreId && input.brandItemId !== undefined) {
        brandItem = await this.resolveRegistrationBrand(brandItem?.id, input.brand ?? undefined, existingCustomer.registrationStoreId);
      }
      const updateData: Prisma.CustomerUpdateInput = {
        fullName: input.fullName,
        phone: input.phone,
        taxId: input.taxId,
        email: input.email,
        birthDate: input.birthDate,
        status: input.status,
        address: input.address,
        zone: input.address !== undefined || input.city !== undefined || input.department !== undefined ? null : undefined,
        city: input.city,
        department: input.department,
        country: input.address !== undefined || input.city !== undefined || input.department !== undefined ? 'Guatemala' : undefined,
        brand: brandItem !== undefined ? brandItem?.name ?? null : input.brand,
        reference: input.reference,
      };

      if (brandItem !== undefined) {
        updateData.brandItem = brandItem ? { connect: { id: brandItem.id } } : { disconnect: true };
      }

      if (input.mustChangePassword !== undefined) {
        updateData.mustChangePassword = input.mustChangePassword;
      }

      if (input.password) {
        updateData.passwordHash = await argon2.hash(input.password);
        updateData.mustChangePassword = input.mustChangePassword ?? true;
      }

      const customer = await this.prisma.customer.update({
        where: { id },
        data: updateData,
        select: this.customerListSelect,
      });

      await this.auditService.record({
        actorType: 'INTERNAL_USER',
        actorInternalUserId: actor.id,
        action: 'customers.update',
        module: 'customers',
        entityType: 'Customer',
        entityId: id,
        metadata: { before: existingCustomer, after: customer },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });

      const [enrichedCustomer] = await this.attachPointBalance([customer]);

      return enrichedCustomer;
    } catch (error) {
      this.handleUniqueCustomerError(error);
      throw error;
    }
  }

  private async createCustomer(
    input: CreateCustomerInput,
    options: {
      actor: InternalAuthUser;
      request: FastifyRequest;
      registrationSource: 'ADMIN' | 'CLIENT_PWA' | 'STORE' | 'SOCIAL_MEDIA';
      registrationStoreId?: string;
    },
  ) {
    await this.assertNoDuplicateCustomer(input.phone, input.email, input.taxId);
    if (options.registrationStoreId) {
      await this.assertActiveStore(options.registrationStoreId);
    }
    const brandItem = await this.resolveRegistrationBrand(input.brandItemId, input.brand, options.registrationStoreId);

    try {
      const customer = await this.prisma.$transaction(async (tx) => {
        const code = await this.nextCustomerCode(tx);

        return tx.customer.create({
          data: {
            code,
            fullName: input.fullName,
            phone: input.phone,
            taxId: input.taxId,
            email: input.email,
            passwordHash: input.password ? await argon2.hash(input.password) : undefined,
            mustChangePassword: options.registrationSource === 'STORE' || Boolean(input.password),
            birthDate: input.birthDate,
            address: input.address,
            zone: null,
            city: input.city,
            department: input.department,
            country: 'Guatemala',
            brand: brandItem?.name ?? input.brand,
            brandItemId: brandItem?.id,
            reference: input.reference,
            registrationSource: options.registrationSource,
            registrationStoreId: options.registrationStoreId,
            createdByInternalUserId: options.actor.id,
          },
          select: this.customerListSelect,
        });
      });

      await this.auditService.record({
        actorType: 'INTERNAL_USER',
        actorInternalUserId: options.actor.id,
        action: options.registrationSource === 'STORE' && options.registrationStoreId ? 'customers.quick_create_store' : 'customers.create_admin',
        module: 'customers',
        entityType: 'Customer',
        entityId: customer.id,
        storeId: options.registrationStoreId,
        metadata: {
          code: customer.code,
          phone: customer.phone,
          registrationSource: options.registrationSource,
        },
        ipAddress: options.request.ip,
        userAgent: options.request.headers['user-agent'],
      });

      const [enrichedCustomer] = await this.attachPointBalance([customer]);

      return enrichedCustomer;
    } catch (error) {
      this.handleUniqueCustomerError(error);
      throw error;
    }
  }

  private async attachPointBalance<T extends { id: string; purchasesCount?: number; loyaltyLevel?: string }>(customers: T[]) {
    if (customers.length === 0) {
      return [];
    }

    const pointsByCustomerId = await this.availablePointsByCustomerId(customers.map((customer) => customer.id));

    return customers.map((customer) => ({
      ...customer,
      availablePoints: pointsByCustomerId.get(customer.id) ?? 0,
      loyaltyLevel: customer.loyaltyLevel ?? 'Básico',
      purchasesCount: customer.purchasesCount ?? 0,
    }));
  }

  private async availablePointsByCustomerId(customerIds: string[]) {
    if (customerIds.length === 0) {
      return new Map<string, number>();
    }

    const pointAggregates = await this.prisma.pointMovement.groupBy({
      by: ['customerId'],
      where: {
        customerId: { in: customerIds },
        status: 'AVAILABLE',
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      _sum: {
        points: true,
      },
    });

    return new Map(
      pointAggregates.map((aggregate) => [aggregate.customerId, aggregate._sum.points ?? 0]),
    );
  }

  private buildCustomerWhere(input: ListCustomersInput) {
    const where: Prisma.CustomerWhereInput = {
      status: input.status,
      ...(input.level ? { loyaltyLevel: input.level } : {}),
      ...(input.code ? { code: { contains: input.code, mode: 'insensitive' } } : {}),
      ...(input.name ? { fullName: { contains: input.name, mode: 'insensitive' } } : {}),
      ...(input.taxId ? { taxId: { contains: input.taxId.toUpperCase().replace(/[^0-9A-Z-]/g, ''), mode: 'insensitive' } } : {}),
      ...(input.email ? { email: { contains: input.email, mode: 'insensitive' } } : {}),
    };

    const term = input.search?.trim();
    if (term) {
      const normalizedTaxId = term.toUpperCase().replace(/[^0-9A-Z-]/g, '');
      const normalizedPhone = term.replace(/\D/g, '');
      where.OR = [
        { fullName: { contains: term, mode: 'insensitive' } },
        { code: { contains: term, mode: 'insensitive' } },
        { taxId: { contains: normalizedTaxId || term, mode: 'insensitive' } },
        { phone: { contains: normalizedPhone || term } },
        { email: { contains: term, mode: 'insensitive' } },
      ];
    }

    if (input.origin) {
      if (input.origin.startsWith('STORE:')) {
        where.registrationStoreId = input.origin.slice('STORE:'.length);
      } else if (input.origin === 'STORE') {
        where.registrationSource = 'STORE';
      } else {
        where.registrationSource = input.origin;
      }
    }

    return where;
  }

  private assertUpdatePermissions(input: UpdateCustomerInput, actor: InternalAuthUser) {
    const permissions = new Set(actor.permissions);
    if (permissions.has('customers.manage')) return;

    const needsStatus = input.status !== undefined;
    const needsEdit = input.fullName !== undefined
      || input.phone !== undefined
      || input.taxId !== undefined
      || input.email !== undefined
      || input.birthDate !== undefined
      || input.address !== undefined
      || input.zone !== undefined
      || input.city !== undefined
      || input.department !== undefined
      || input.country !== undefined
      || input.brand !== undefined
      || input.brandItemId !== undefined
      || input.reference !== undefined
      || input.mustChangePassword !== undefined
      || input.password !== undefined;

    if (needsEdit && !permissions.has('customers.edit')) {
      throw new ForbiddenException('No tienes permiso para editar clientes.');
    }

    if (needsStatus && !permissions.has('customers.status')) {
      throw new ForbiddenException('No tienes permiso para inactivar o reactivar clientes.');
    }
  }

  private applyCustomerScope(where: Prisma.CustomerWhereInput, actor: InternalAuthUser) {
    if (actor.permissions.includes('customers.view_all')) {
      return where;
    }

    if (actor.storeIds.length === 0) {
      return {
        AND: [
          where,
          { id: '__NO_ASSIGNED_STORE__' },
        ],
      } satisfies Prisma.CustomerWhereInput;
    }

    return {
      AND: [
        where,
        { registrationStoreId: { in: actor.storeIds } },
      ],
    } satisfies Prisma.CustomerWhereInput;
  }

  private async customerSummary(where: Prisma.CustomerWhereInput) {
    const [total, active, inactive] = await Promise.all([
      this.prisma.customer.count({ where }),
      this.prisma.customer.count({ where: { AND: [where, { status: 'ACTIVE' }] } }),
      this.prisma.customer.count({ where: { AND: [where, { status: 'INACTIVE' }] } }),
    ]);

    return { total, active, inactive };
  }

  private async assertActiveStore(storeId: string) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true, status: true },
    });

    if (!store || store.status !== 'ACTIVE') {
      throw new BadRequestException('La tienda seleccionada no esta activa.');
    }
  }

  private async resolveBrandItem(brandItemId: string | null) {
    if (brandItemId === null) return null;
    const brand = await this.prisma.catalogItem.findFirst({
      where: { id: brandItemId, isActive: true, catalog: { code: 'BRANDS', isActive: true } },
      select: { id: true, name: true },
    });
    if (!brand) throw new BadRequestException('La marca seleccionada no es valida o esta inactiva.');
    return brand;
  }

  private async resolveRegistrationBrand(brandItemId?: string, legacyBrand?: string, storeId?: string) {
    let brand = brandItemId
      ? await this.resolveBrandItem(brandItemId)
      : legacyBrand
        ? await this.prisma.catalogItem.findFirst({
            where: { name: { equals: legacyBrand, mode: 'insensitive' }, isActive: true, catalog: { code: 'BRANDS', isActive: true } },
            select: { id: true, name: true },
          })
        : null;

    if (storeId) {
      const store = await this.prisma.store.findUnique({ where: { id: storeId }, select: { brandId: true } });
      if (!brand && store?.brandId) brand = await this.resolveBrandItem(store.brandId);
      if (brand && store?.brandId && brand.id !== store.brandId) {
        throw new BadRequestException('La tienda seleccionada no pertenece a la marca elegida.');
      }
    }

    return brand;
  }

  private async assertNoDuplicateCustomer(phone: string, email?: string, taxId?: string) {
    const duplicate = await this.prisma.customer.findFirst({
      where: {
        OR: [{ phone }, ...(email ? [{ email }] : []), ...(taxId ? [{ taxId }] : [])],
      },
      select: {
        id: true,
        code: true,
        fullName: true,
        phone: true,
        taxId: true,
        email: true,
        status: true,
      },
    });

    if (duplicate) {
      throw new ConflictException({
        message: 'Ya existe un cliente con ese telefono, correo o NIT.',
        duplicate,
      });
    }
  }

  private async nextCustomerCode(tx: Prisma.TransactionClient) {
    const sequence = await tx.customerCodeSequence.upsert({
      where: { id: 1 },
      update: { nextValue: { increment: 1 } },
      create: { id: 1, nextValue: 2 },
    });

    return `RMT-${String(sequence.nextValue - 1).padStart(6, '0')}`;
  }

  private handleUniqueCustomerError(error: unknown): never | void {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('Ya existe un cliente con ese telefono, correo, NIT o codigo.');
    }
  }

  private readonly customerListSelect = {
    id: true,
    code: true,
    fullName: true,
    phone: true,
    taxId: true,
    email: true,
    mustChangePassword: true,
    birthDate: true,
    address: true,
    zone: true,
    city: true,
    department: true,
    country: true,
    brand: true,
    brandItemId: true,
    brandItem: { select: { id: true, code: true, name: true, isActive: true } },
    reference: true,
    status: true,
    purchasesCount: true,
    loyaltyLevel: true,
    registrationSource: true,
    registrationStoreId: true,
    registrationStore: {
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
      },
    },
    createdByInternalUserId: true,
    createdAt: true,
    updatedAt: true,
    purchases: {
      orderBy: { purchasedAt: 'desc' },
      take: 1,
      select: {
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
  } satisfies Prisma.CustomerSelect;
}
