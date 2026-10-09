import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { FastifyRequest } from 'fastify';
import { AuditService } from '../audit/audit.service';
import { InternalAuthUser } from '../auth/auth.types';
import { PrismaService } from '../database/prisma.service';
import {
  CreateCatalogInput,
  CreateCatalogItemInput,
  UpdateCatalogInput,
  UpdateCatalogItemInput,
} from './catalog.schemas';

@Injectable()
export class CatalogsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async listCatalogs(includeInactive = false) {
    const catalogs = await this.prisma.catalog.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { name: 'asc' },
      include: {
        items: {
          where: includeInactive ? undefined : { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          include: {
            parentItem: {
              select: {
                id: true,
                code: true,
                name: true,
                catalog: {
                  select: {
                    code: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (includeInactive) return catalogs;

    const itemLookup = await this.buildFullItemLookup();

    return catalogs.map((catalog) => ({
      ...catalog,
      items: catalog.items.filter((item) => this.hasActiveParentChain(item, itemLookup)),
    }));
  }

  async getCatalog(code: string, includeInactive = false, parentItemId?: string) {
    if (parentItemId) {
      return this.getCatalogByParent(code, parentItemId, includeInactive);
    }

    const catalog = await this.prisma.catalog.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        items: {
          where: includeInactive ? undefined : { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          include: {
            parentItem: {
              select: {
                id: true,
                code: true,
                name: true,
                catalog: {
                  select: {
                    code: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!catalog || (!includeInactive && !catalog.isActive)) {
      throw new NotFoundException('Catalogo no encontrado.');
    }

    if (includeInactive) {
      return parentItemId
        ? { ...catalog, items: catalog.items.filter((item) => item.parentItemId === parentItemId) }
        : catalog;
    }

    const itemLookup = await this.buildFullItemLookup();

    const activeItems = catalog.items.filter((item) => this.hasActiveParentChain(item, itemLookup));
    return {
      ...catalog,
      items: parentItemId ? activeItems.filter((item) => item.parentItemId === parentItemId) : activeItems,
    };
  }

  private async getCatalogByParent(code: string, parentItemId: string, includeInactive = false) {
    const catalog = await this.prisma.catalog.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        items: {
          where: {
            ...(includeInactive ? {} : { isActive: true }),
            parentItemId,
          },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          include: {
            parentItem: {
              select: {
                id: true,
                code: true,
                name: true,
                catalog: {
                  select: {
                    code: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!catalog || (!includeInactive && !catalog.isActive)) {
      throw new NotFoundException('Catalogo no encontrado.');
    }

    const hasActiveParent = includeInactive ? true : await this.isActiveParentChain(parentItemId);
    return {
      ...catalog,
      items: hasActiveParent ? catalog.items : [],
    };
  }

  async createCatalog(input: CreateCatalogInput, actor: InternalAuthUser, request: FastifyRequest) {
    try {
      const catalog = await this.prisma.catalog.create({ data: input });
      await this.audit(actor, request, 'catalogs.create', 'Catalog', catalog.id, { code: catalog.code });
      return catalog;
    } catch (error) {
      this.handleUniqueError(error, 'Ya existe un catalogo con ese codigo.');
      throw error;
    }
  }

  async updateCatalog(code: string, input: UpdateCatalogInput, actor: InternalAuthUser, request: FastifyRequest) {
    const catalog = await this.getCatalog(code, true);
    const updated = await this.prisma.catalog.update({
      where: { id: catalog.id },
      data: input,
    });

    await this.audit(actor, request, 'catalogs.update', 'Catalog', updated.id, { before: catalog, after: updated });
    return updated;
  }

  async createItem(code: string, input: CreateCatalogItemInput, actor: InternalAuthUser, request: FastifyRequest) {
    const catalog = await this.getCatalog(code, true);
    await this.assertRequiredParent(catalog.code, input.parentItemId);
    await this.assertParentItem(input.parentItemId, catalog.code);
    await this.assertUniqueName(catalog.id, input.name, input.parentItemId ?? null);

    try {
      const item = await this.prisma.catalogItem.create({
        data: {
          catalogId: catalog.id,
          parentItemId: input.parentItemId,
          code: input.code,
          name: input.name,
          description: input.description,
          cardTextColor: catalog.code === 'BRANDS' ? input.cardTextColor : undefined,
          socialLinks: catalog.code === 'BRANDS' ? input.socialLinks : undefined,
          allowsSubcatalog: input.allowsSubcatalog,
          sortOrder: input.sortOrder,
        },
      });

      await this.audit(actor, request, 'catalogs.items.create', 'CatalogItem', item.id, {
        catalogCode: catalog.code,
        itemCode: item.code,
      });
      return item;
    } catch (error) {
      this.handleUniqueError(error, 'Ya existe un valor con ese codigo en el catalogo.');
      throw error;
    }
  }

  async autocompleteZones(query: string, filters: { countryId?: string; departmentId?: string; municipalityId?: string }) {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2) return [];

    const zoneCatalog = await this.getCatalog('ZONA', false);
    const municipalityCatalog = await this.getCatalog('MUNICIPIO', false);
    const departmentCatalog = await this.getCatalog('DEPARTAMENTO', false);
    const countryCatalog = await this.getCatalog('PAIS', false);

    const municipalities = new Map(municipalityCatalog.items.map((item) => [item.id, item]));
    const departments = new Map(departmentCatalog.items.map((item) => [item.id, item]));
    const countries = new Map(countryCatalog.items.map((item) => [item.id, item]));
    const normalized = this.normalizeText(normalizedQuery);

    return zoneCatalog.items
      .map((zone) => {
        const municipality = zone.parentItemId ? municipalities.get(zone.parentItemId) : null;
        const department = municipality?.parentItemId ? departments.get(municipality.parentItemId) : null;
        const country = department?.parentItemId ? countries.get(department.parentItemId) : null;

        return {
          zone,
          municipality,
          department,
          country,
        };
      })
      .filter(({ zone, municipality, department, country }) => {
        if (filters.municipalityId && municipality?.id !== filters.municipalityId) return false;
        if (filters.departmentId && department?.id !== filters.departmentId) return false;
        if (filters.countryId && country?.id !== filters.countryId) return false;

        return [zone.name, zone.code, municipality?.name, department?.name, country?.name]
          .filter(Boolean)
          .some((value) => this.normalizeText(String(value)).includes(normalized));
      })
      .slice(0, 20)
      .map(({ zone, municipality, department, country }) => ({
        id: zone.id,
        zoneId: zone.id,
        codigo: zone.code,
        nombre: zone.name,
        municipalityId: municipality?.id ?? null,
        municipio: municipality?.name ?? null,
        departmentId: department?.id ?? null,
        departamento: department?.name ?? null,
        countryId: country?.id ?? null,
        pais: country?.name ?? null,
        estado: zone.isActive ? 'Activo' : 'Inactivo',
      }));
  }

  async updateItem(itemId: string, input: UpdateCatalogItemInput, actor: InternalAuthUser, request: FastifyRequest) {
    const existing = await this.prisma.catalogItem.findUnique({
      where: { id: itemId },
      include: { catalog: true },
    });

    if (!existing) {
      throw new NotFoundException('Valor de catalogo no encontrado.');
    }

    const nextParentItemId = input.parentItemId === undefined ? existing.parentItemId : input.parentItemId;
    const nextName = input.name ?? existing.name;

    await this.assertRequiredParent(existing.catalog.code, nextParentItemId);
    await this.assertParentItem(nextParentItemId, existing.catalog.code, itemId);
    await this.assertUniqueName(existing.catalogId, nextName, nextParentItemId ?? null, itemId);
    if (input.isActive !== undefined) {
      await this.assertStatusTransition(existing, input.isActive);
    }

    try {
      const data: Prisma.CatalogItemUncheckedUpdateInput = {
        ...input,
        cardTextColor: existing.catalog.code === 'BRANDS' ? input.cardTextColor ?? undefined : undefined,
        socialLinks: existing.catalog.code === 'BRANDS' ? input.socialLinks ?? undefined : undefined,
      };

      const updated = await this.prisma.catalogItem.update({
        where: { id: itemId },
        data,
      });

      await this.audit(actor, request, 'catalogs.items.update', 'CatalogItem', updated.id, {
        catalogCode: existing.catalog.code,
        before: existing,
        after: updated,
      });
      return updated;
    } catch (error) {
      this.handleUniqueError(error, 'Ya existe un valor con ese codigo en el catalogo.');
      throw error;
    }
  }

  private async audit(
    actor: InternalAuthUser,
    request: FastifyRequest,
    action: string,
    entityType: string,
    entityId: string,
    metadata: Prisma.InputJsonValue,
  ) {
    await this.auditService.record({
      actorType: 'INTERNAL_USER',
      actorInternalUserId: actor.id,
      action,
      module: 'catalogs',
      entityType,
      entityId,
      metadata,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });
  }

  private async assertParentItem(parentItemId?: string | null, catalogCode?: string, currentItemId?: string) {
    if (!parentItemId) return;

    if (parentItemId === currentItemId) {
      throw new ConflictException('Un valor no puede depender de si mismo.');
    }

    const parent = await this.prisma.catalogItem.findUnique({
      where: { id: parentItemId },
      select: {
        id: true,
        isActive: true,
        catalog: {
          select: {
            code: true,
          },
        },
      },
    });

    if (!parent) {
      throw new NotFoundException('Valor padre no encontrado.');
    }

    if (!parent.isActive) {
      throw new ConflictException('El valor padre debe estar activo.');
    }

    const allowedParentCatalogs = this.parentCatalogCodes(catalogCode ?? '');
    if (allowedParentCatalogs.length > 0 && !allowedParentCatalogs.includes(parent.catalog.code)) {
      throw new ConflictException(`Este valor solo puede depender de: ${allowedParentCatalogs.join(', ')}.`);
    }

    if (allowedParentCatalogs.length === 0) {
      throw new ConflictException('Este catalogo no admite relacion padre.');
    }
  }

  private async assertUniqueName(catalogId: string, name: string, parentItemId: string | null, currentItemId?: string) {
    const duplicate = await this.prisma.catalogItem.findFirst({
      where: {
        catalogId,
        parentItemId,
        name: {
          equals: name,
          mode: 'insensitive',
        },
        ...(currentItemId ? { id: { not: currentItemId } } : {}),
      },
      select: { id: true },
    });

    if (duplicate) {
      throw new ConflictException('Ya existe un valor con ese nombre dentro de la misma relacion.');
    }
  }

  private assertRequiredParent(catalogCode: string, parentItemId?: string | null) {
    if (this.parentCatalogCodes(catalogCode).length > 0 && !parentItemId) {
      throw new ConflictException('Este catalogo requiere una relacion padre.');
    }
  }

  private async assertStatusTransition(
    item: { id: string; parentItemId: string | null; isActive: boolean },
    nextIsActive: boolean,
  ) {
    if (item.isActive === nextIsActive) return;

    if (!nextIsActive) {
      const activeChildren = await this.prisma.catalogItem.count({
        where: {
          parentItemId: item.id,
          isActive: true,
        },
      });

      if (activeChildren > 0) {
        throw new ConflictException('No es posible inactivar este registro porque tiene registros dependientes activos.');
      }
    }

    if (nextIsActive && item.parentItemId) {
      const parent = await this.prisma.catalogItem.findUnique({
        where: { id: item.parentItemId },
        select: { isActive: true },
      });

      if (!parent?.isActive) {
        throw new ConflictException('No es posible reactivar este registro porque su registro padre esta inactivo.');
      }
    }
  }

  private parentCatalogCodes(code: string) {
    if (code === 'DEPARTAMENTO') return ['PAIS'];
    if (code === 'MUNICIPIO') return ['DEPARTAMENTO'];
    if (code === 'ZONA') return ['MUNICIPIO'];
    if (code === 'SHOE_TYPES') return ['PRODUCTOS'];

    return [];
  }

  private hasActiveParentChain(
    item: { parentItemId?: string | null },
    itemLookup: Map<string, { isActive: boolean; parentItemId?: string | null }>,
  ) {
    let parentItemId = item.parentItemId;

    while (parentItemId) {
      const parent = itemLookup.get(parentItemId);
      if (!parent?.isActive) return false;
      parentItemId = parent.parentItemId;
    }

    return true;
  }

  private async isActiveParentChain(parentItemId: string) {
    let currentParentId: string | null = parentItemId;

    while (currentParentId) {
      const parent: { isActive: boolean; parentItemId: string | null } | null = await this.prisma.catalogItem.findUnique({
        where: { id: currentParentId },
        select: { isActive: true, parentItemId: true },
      });

      if (!parent?.isActive) return false;
      currentParentId = parent.parentItemId;
    }

    return true;
  }

  /** Flat, column-only scan of every catalog item (no joins) — used to walk parent-active chains cheaply. */
  private async buildFullItemLookup() {
    const items = await this.prisma.catalogItem.findMany({
      select: { id: true, isActive: true, parentItemId: true },
    });

    return new Map(items.map((item) => [item.id, item]));
  }

  private normalizeText(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  private handleUniqueError(error: unknown, message: string): never | void {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException(message);
    }
  }
}
