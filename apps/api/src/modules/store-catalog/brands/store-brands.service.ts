import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { InternalAuthUser } from '../../auth/auth.types';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { CreateStoreBrandInput, UpdateStoreBrandInput, UpdateStoreBrandStatusInput } from './store-brand.schemas';

type ListAdminBrandsQuery = Record<string, string | undefined>;

@Injectable()
export class StoreBrandsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async listAdmin(query: ListAdminBrandsQuery = {}) {
    const name = query.name?.trim();
    const code = query.code?.trim();
    const status = this.parseStatus(query.status);

    const brands = await this.prisma.storeBrand.findMany({
      where: {
        ...(name ? { name: { contains: name, mode: 'insensitive' } } : {}),
        ...(code ? { code: { contains: code, mode: 'insensitive' } } : {}),
        ...(status === undefined ? {} : { isActive: status }),
      },
      orderBy: [{ name: 'asc' }, { code: 'asc' }],
      include: { _count: { select: { products: true } } },
    });

    return brands.map((brand) => this.toAdminDto(brand));
  }

  async listActiveForClient() {
    const brands = await this.prisma.storeBrand.findMany({
      where: { isActive: true },
      orderBy: [{ isFeatured: 'desc' }, { displayOrder: 'asc' }, { name: 'asc' }, { code: 'asc' }],
      select: { id: true, name: true, code: true, logoUrl: true, isFeatured: true },
    });

    return brands;
  }

  /** Marcas destacadas en el inicio del cliente (máximo MAX_FEATURED_BRANDS). */
  static MAX_FEATURED_BRANDS = 5;

  private async assertFeaturedLimit(excludeBrandId?: string) {
    const count = await this.prisma.storeBrand.count({
      where: { isFeatured: true, isActive: true, ...(excludeBrandId ? { id: { not: excludeBrandId } } : {}) },
    });
    if (count >= StoreBrandsService.MAX_FEATURED_BRANDS) {
      throw new BadRequestException(
        `Solo puedes destacar ${StoreBrandsService.MAX_FEATURED_BRANDS} marcas en el inicio. Quita una marca destacada para poder destacar otra.`,
      );
    }
  }

  async get(id: string) {
    const brand = await this.prisma.storeBrand.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });

    if (!brand) {
      throw new NotFoundException('Marca de tienda online no encontrada.');
    }

    return this.toAdminDto(brand);
  }

  async create(input: CreateStoreBrandInput, actor: InternalAuthUser) {
    if (input.isFeatured) {
      await this.assertFeaturedLimit();
    }
    try {
      const brand = await this.prisma.storeBrand.create({
        data: {
          name: input.name,
          code: input.code,
          description: input.description ?? null,
          logoUrl: input.logoUrl ?? null,
          websiteUrl: input.websiteUrl ?? null,
          isActive: input.isActive,
          isFeatured: input.isFeatured ?? false,
          createdByInternalUserId: actor.id,
          updatedByInternalUserId: actor.id,
        },
      });

      await this.auditService.record({
        actorType: 'INTERNAL_USER',
        actorInternalUserId: actor.id,
        action: 'store_brands.create',
        module: 'store_brands',
        entityType: 'StoreBrand',
        entityId: brand.id,
        metadata: { code: brand.code, name: brand.name },
      });

      return this.toAdminDto({ ...brand, _count: { products: 0 } });
    } catch (error) {
      throw this.translateUniqueError(error);
    }
  }

  async update(id: string, input: UpdateStoreBrandInput, actor: InternalAuthUser) {
    const existing = await this.prisma.storeBrand.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Marca de tienda online no encontrada.');
    }

    // Solo se valida el límite si se está activando "destacada" y antes no lo estaba.
    if (input.isFeatured === true && !existing.isFeatured) {
      await this.assertFeaturedLimit(id);
    }

    try {
      const brand = await this.prisma.storeBrand.update({
        where: { id },
        data: { ...input, updatedByInternalUserId: actor.id },
        include: { _count: { select: { products: true } } },
      });

      await this.auditService.record({
        actorType: 'INTERNAL_USER',
        actorInternalUserId: actor.id,
        action: 'store_brands.update',
        module: 'store_brands',
        entityType: 'StoreBrand',
        entityId: brand.id,
        metadata: { before: existing, after: brand },
      });

      return this.toAdminDto(brand);
    } catch (error) {
      throw this.translateUniqueError(error);
    }
  }

  async updateStatus(id: string, input: UpdateStoreBrandStatusInput, actor: InternalAuthUser) {
    const existing = await this.prisma.storeBrand.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Marca de tienda online no encontrada.');
    }

    const brand = await this.prisma.storeBrand.update({
      where: { id },
      data: { isActive: input.isActive, updatedByInternalUserId: actor.id },
      include: { _count: { select: { products: true } } },
    });

    await this.auditService.record({
      actorType: 'INTERNAL_USER',
      actorInternalUserId: actor.id,
      action: 'store_brands.status',
      module: 'store_brands',
      entityType: 'StoreBrand',
      entityId: brand.id,
      metadata: { previousStatus: existing.isActive, newStatus: brand.isActive },
    });

    return this.toAdminDto(brand);
  }

  async assertActive(brandId: string) {
    const brand = await this.prisma.storeBrand.findUnique({ where: { id: brandId } });
    if (!brand || !brand.isActive) {
      throw new ConflictException('La marca seleccionada no existe o esta inactiva.');
    }
    return brand;
  }

  private parseStatus(value: string | undefined) {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  }

  private toAdminDto(brand: { _count: { products: number } } & Record<string, unknown>) {
    const { _count, ...rest } = brand;
    return { ...rest, activeProductsCount: _count.products };
  }

  private translateUniqueError(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return new ConflictException('Ya existe una marca de tienda online con ese codigo.');
    }
    return error;
  }
}
