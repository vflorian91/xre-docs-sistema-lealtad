import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { InternalAuthUser } from '../../auth/auth.types';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { StoreBrandsService } from '../brands/store-brands.service';
import { STORE_STOCK_MOVEMENT_TYPES, StoreStockMovementsService } from '../stock/store-stock-movements.service';
import {
  CreateStoreProductInput,
  UpdateStoreProductInput,
  UpdateStoreProductStatusInput,
  UpdateStoreProductStockInput,
} from './store-product.schemas';
import { STORE_GENDER_TARGETS, STORE_PRODUCT_TYPES } from './product-classification.constants';

type ListAdminProductsQuery = Record<string, string | undefined>;

const brandSelect = { id: true, name: true, code: true, isActive: true };
const variantOrderBy = [{ displayOrder: 'asc' as const }, { optionLabel: 'asc' as const }];
const variantInclude = { orderBy: variantOrderBy };

type VariantOption = { name: string; value: string };
type VariantInput = NonNullable<CreateStoreProductInput['variants']>[number] | NonNullable<UpdateStoreProductInput['variants']>[number];

@Injectable()
export class StoreProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly storeBrandsService: StoreBrandsService,
    private readonly stockMovementsService: StoreStockMovementsService,
  ) {}

  async listAdmin(query: ListAdminProductsQuery = {}) {
    const name = query.name?.trim();
    const brandId = query.brandId?.trim();
    const status = this.parseBoolean(query.status);

    const products = await this.prisma.storeProduct.findMany({
      where: {
        ...(name ? { name: { contains: name, mode: 'insensitive' } } : {}),
        ...(brandId ? { brandId } : {}),
        ...(status === undefined ? {} : { isActive: status }),
      },
      orderBy: [{ isFeatured: 'desc' }, { name: 'asc' }, { sku: 'asc' }],
      include: { brand: { select: brandSelect }, variants: variantInclude },
    });

    return products.map((product) => this.toDto(product));
  }

  async listPublic() {
    const products = await this.prisma.storeProduct.findMany({
      where: {
        isActive: true,
        brand: { isActive: true },
      },
      orderBy: [{ isFeatured: 'desc' }, { name: 'asc' }, { sku: 'asc' }],
      include: { brand: { select: brandSelect }, variants: variantInclude },
    });

    return products.map((product) => this.toPublicDto(product));
  }

  async getPublic(id: string) {
    const product = await this.prisma.storeProduct.findFirst({
      where: { id, isActive: true, brand: { isActive: true } },
      include: { brand: { select: brandSelect }, images: { orderBy: { displayOrder: 'asc' } }, variants: variantInclude },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado.');
    }

    return this.toPublicDto(product);
  }

  async get(id: string) {
    const product = await this.prisma.storeProduct.findUnique({
      where: { id },
      include: { brand: { select: brandSelect }, images: { orderBy: { displayOrder: 'asc' } }, variants: variantInclude },
    });

    if (!product) {
      throw new NotFoundException('Producto de tienda online no encontrado.');
    }

    return this.toDto(product);
  }

  async create(input: CreateStoreProductInput, actor: InternalAuthUser) {
    await this.storeBrandsService.assertActive(input.brandId);

    try {
      const product = await this.prisma.$transaction(async (tx) => {
        const created = await tx.storeProduct.create({
          data: {
            brandId: input.brandId,
            name: input.name,
            sku: input.sku ?? null,
            shortDescription: input.shortDescription ?? null,
            fullDescription: input.fullDescription ?? null,
            price: input.price,
            stockQuantity: input.stockQuantity,
            minimumStock: input.minimumStock ?? null,
            mainImageUrl: input.mainImageUrl ?? null,
            isActive: input.isActive,
            isVisibleInStore: input.isActive,
            isFeatured: input.isFeatured,
            generatesLoyaltyPoints: input.generatesLoyaltyPoints ?? true,
            productType: input.productType ?? null,
            genderTarget: input.genderTarget ?? null,
            displayOrder: 0,
            createdByInternalUserId: actor.id,
            updatedByInternalUserId: actor.id,
          },
        });

        if (input.stockQuantity > 0) {
          await this.stockMovementsService.registerMovement(tx, {
            productId: created.id,
            movementType: STORE_STOCK_MOVEMENT_TYPES.INITIAL_STOCK,
            previousStock: 0,
            newStock: input.stockQuantity,
            comment: 'Stock inicial al crear el producto.',
            createdByInternalUserId: actor.id,
          });
        }

        if (input.variants?.length) {
          for (const variantInput of input.variants) {
            const variant = await tx.storeProductVariant.create({
              data: {
                productId: created.id,
                sku: variantInput.sku ?? null,
                ...this.buildVariantData(variantInput),
                price: variantInput.price,
                promotionalPrice: variantInput.promotionalPrice ?? null,
                stockQuantity: variantInput.stockQuantity,
                minimumStock: variantInput.minimumStock ?? null,
                isActive: variantInput.isActive,
                displayOrder: variantInput.displayOrder,
                createdByInternalUserId: actor.id,
                updatedByInternalUserId: actor.id,
              },
            });

            if (variantInput.stockQuantity > 0) {
              await this.stockMovementsService.registerMovement(tx, {
                productId: created.id,
                variantId: variant.id,
                movementType: STORE_STOCK_MOVEMENT_TYPES.INITIAL_STOCK,
                previousStock: 0,
                newStock: variantInput.stockQuantity,
                comment: `Stock inicial de variante ${variant.optionLabel}.`,
                createdByInternalUserId: actor.id,
              });
            }
          }
        }

        return tx.storeProduct.findUniqueOrThrow({
          where: { id: created.id },
          include: { brand: { select: brandSelect }, images: true, variants: variantInclude },
        });
      });

      await this.auditService.record({
        actorType: 'INTERNAL_USER',
        actorInternalUserId: actor.id,
        action: 'store_products.create',
        module: 'store_products',
        entityType: 'StoreProduct',
        entityId: product.id,
        metadata: { name: product.name, brandId: product.brandId },
      });

      return this.toDto(product);
    } catch (error) {
      throw this.translateUniqueError(error);
    }
  }

  async update(id: string, input: UpdateStoreProductInput, actor: InternalAuthUser) {
    const existing = await this.prisma.storeProduct.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Producto de tienda online no encontrado.');
    }

    if (input.brandId) {
      await this.storeBrandsService.assertActive(input.brandId);
    }

    try {
      const { stockQuantity, isActive, variants, ...productInput } = input;
      const data: Prisma.StoreProductUpdateInput = {
        ...productInput,
        ...(isActive === undefined ? {} : { isActive, isVisibleInStore: isActive }),
        updatedByInternalUserId: actor.id,
      };

      const product = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.storeProduct.update({
          where: { id },
          data: {
            ...data,
            ...(stockQuantity === undefined ? {} : { stockQuantity }),
          },
          include: { brand: { select: brandSelect }, images: { orderBy: { displayOrder: 'asc' } } },
        });

        if (stockQuantity !== undefined && stockQuantity !== existing.stockQuantity) {
          await this.stockMovementsService.registerMovement(tx, {
            productId: id,
            movementType: STORE_STOCK_MOVEMENT_TYPES.MANUAL_ADJUSTMENT,
            previousStock: existing.stockQuantity,
            newStock: stockQuantity,
            comment: 'Stock actualizado al editar el producto.',
            createdByInternalUserId: actor.id,
          });
        }

        if (variants !== undefined) {
          await this.syncVariants(tx, id, variants, actor.id);
        }

        return tx.storeProduct.findUniqueOrThrow({
          where: { id },
          include: { brand: { select: brandSelect }, images: { orderBy: { displayOrder: 'asc' } }, variants: variantInclude },
        });
      });

      await this.auditService.record({
        actorType: 'INTERNAL_USER',
        actorInternalUserId: actor.id,
        action: 'store_products.update',
        module: 'store_products',
        entityType: 'StoreProduct',
        entityId: product.id,
        metadata: { before: existing, after: product },
      });

      return this.toDto(product);
    } catch (error) {
      throw this.translateUniqueError(error);
    }
  }

  async updateStatus(id: string, input: UpdateStoreProductStatusInput, actor: InternalAuthUser) {
    const existing = await this.assertExists(id);

    const product = await this.prisma.storeProduct.update({
      where: { id },
      data: { isActive: input.isActive, isVisibleInStore: input.isActive, updatedByInternalUserId: actor.id },
      include: { brand: { select: brandSelect }, images: { orderBy: { displayOrder: 'asc' } } },
    });

    await this.auditService.record({
      actorType: 'INTERNAL_USER',
      actorInternalUserId: actor.id,
      action: 'store_products.status',
      module: 'store_products',
      entityType: 'StoreProduct',
      entityId: product.id,
      metadata: { previousStatus: existing.isActive, newStatus: product.isActive },
    });

    return this.toDto(product);
  }

  async updateStock(id: string, input: UpdateStoreProductStockInput, actor: InternalAuthUser) {
    const existing = await this.assertExists(id);

    const product = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.storeProduct.update({
        where: { id },
        data: { stockQuantity: input.newStock, updatedByInternalUserId: actor.id },
        include: { brand: { select: brandSelect }, images: { orderBy: { displayOrder: 'asc' } } },
      });

      await this.stockMovementsService.registerMovement(tx, {
        productId: id,
        movementType: STORE_STOCK_MOVEMENT_TYPES.MANUAL_ADJUSTMENT,
        previousStock: existing.stockQuantity,
        newStock: input.newStock,
        comment: input.comment ?? null,
        createdByInternalUserId: actor.id,
      });

      return updated;
    });

    await this.auditService.record({
      actorType: 'INTERNAL_USER',
      actorInternalUserId: actor.id,
      action: 'store_products.stock',
      module: 'store_products',
      entityType: 'StoreProduct',
      entityId: product.id,
      metadata: { previousStock: existing.stockQuantity, newStock: product.stockQuantity, comment: input.comment },
    });

    return this.toDto(product);
  }

  async listStockMovements(id: string) {
    await this.assertExists(id);
    const movements = await this.stockMovementsService.listForProduct(this.prisma, id);
    return movements.map((movement) => ({ ...movement, quantity: movement.quantity }));
  }

  private async assertExists(id: string) {
    const product = await this.prisma.storeProduct.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Producto de tienda online no encontrado.');
    }
    return product;
  }

  private parseBoolean(value: string | undefined) {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  }

  private toDto(product: Record<string, unknown> & { price: Prisma.Decimal }) {
    return this.withVariantPricing(product, false);
  }

  private toPublicDto(product: Record<string, unknown> & { price: Prisma.Decimal }) {
    const { createdByInternalUserId, updatedByInternalUserId, ...rest } = product as Record<string, unknown> & {
      createdByInternalUserId?: unknown;
      updatedByInternalUserId?: unknown;
      price: Prisma.Decimal;
    };
    return this.withVariantPricing(rest, true);
  }

  private withVariantPricing(product: Record<string, unknown> & { price: Prisma.Decimal }, publicOnly: boolean) {
    const variants = Array.isArray(product.variants)
      ? (product.variants as Array<Record<string, unknown> & { price: Prisma.Decimal; promotionalPrice?: Prisma.Decimal | null; stockQuantity: number; isActive: boolean }>)
          .filter((variant) => !publicOnly || variant.isActive)
          .map((variant) => {
            const price = Number(variant.price);
            const promotionalPrice = variant.promotionalPrice == null ? null : Number(variant.promotionalPrice);
            return {
              ...variant,
              price,
              promotionalPrice,
              effectivePrice: promotionalPrice ?? price,
            };
          })
      : [];

    const activeVariants = variants.filter((variant) => variant.isActive);
    const price = Number(product.price);
    const effectiveVariantPrices = activeVariants.map((variant) => variant.effectivePrice);
    const stockQuantity = activeVariants.length
      ? activeVariants.reduce((sum, variant) => sum + Number(variant.stockQuantity ?? 0), 0)
      : Number(product.stockQuantity ?? 0);

    return {
      ...product,
      price: effectiveVariantPrices.length ? Math.min(...effectiveVariantPrices) : price,
      basePrice: price,
      stockQuantity,
      hasVariants: variants.length > 0,
      variants,
    };
  }

  private async syncVariants(tx: Prisma.TransactionClient, productId: string, variants: VariantInput[], actorId: string) {
    const existingVariants = await tx.storeProductVariant.findMany({ where: { productId } });
    const existingIds = new Set(existingVariants.map((variant) => variant.id));
    const incomingIds = new Set(variants.flatMap((variant) => ('id' in variant && variant.id ? [variant.id] : [])));

    for (const variantInput of variants) {
      const data = {
        sku: variantInput.sku ?? null,
        ...this.buildVariantData(variantInput),
        price: variantInput.price,
        promotionalPrice: variantInput.promotionalPrice ?? null,
        stockQuantity: variantInput.stockQuantity,
        minimumStock: variantInput.minimumStock ?? null,
        isActive: variantInput.isActive,
        displayOrder: variantInput.displayOrder,
        updatedByInternalUserId: actorId,
      };

      if ('id' in variantInput && variantInput.id) {
        if (!existingIds.has(variantInput.id)) {
          throw new BadRequestException('Una variante no pertenece a este producto.');
        }
        const previous = existingVariants.find((variant) => variant.id === variantInput.id);
        const updated = await tx.storeProductVariant.update({
          where: { id: variantInput.id },
          data,
        });
        if (previous && previous.stockQuantity !== variantInput.stockQuantity) {
          await this.stockMovementsService.registerMovement(tx, {
            productId,
            variantId: updated.id,
            movementType: STORE_STOCK_MOVEMENT_TYPES.MANUAL_ADJUSTMENT,
            previousStock: previous.stockQuantity,
            newStock: variantInput.stockQuantity,
            comment: `Stock actualizado al editar variante ${updated.optionLabel}.`,
            createdByInternalUserId: actorId,
          });
        }
        continue;
      }

      const created = await tx.storeProductVariant.create({
        data: {
          productId,
          ...data,
          createdByInternalUserId: actorId,
        },
      });
      if (created.stockQuantity > 0) {
        await this.stockMovementsService.registerMovement(tx, {
          productId,
          variantId: created.id,
          movementType: STORE_STOCK_MOVEMENT_TYPES.INITIAL_STOCK,
          previousStock: 0,
          newStock: created.stockQuantity,
          comment: `Stock inicial de variante ${created.optionLabel}.`,
          createdByInternalUserId: actorId,
        });
      }
    }

    const omittedVariantIds = existingVariants.map((variant) => variant.id).filter((id) => !incomingIds.has(id));
    if (omittedVariantIds.length) {
      await tx.storeProductVariant.updateMany({
        where: { id: { in: omittedVariantIds } },
        data: { isActive: false, updatedByInternalUserId: actorId },
      });
    }
  }

  private variantOptionLabel(options: VariantOption[]) {
    return options.map((option) => `${option.name}: ${option.value}`).join(' / ');
  }

  private variantOptionsJson(options: VariantOption[]) {
    return options.map((option) => ({ name: option.name, value: option.value })) as Prisma.InputJsonValue;
  }

  // Variante = mismo producto cambiando talla, color, género, tipo e imagen.
  // Construye optionValues/optionLabel desde esos campos y persiste las columnas nuevas.
  private buildVariantData(input: {
    optionValues?: VariantOption[];
    size?: string | null;
    color?: string | null;
    genderTarget?: string | null;
    productType?: string | null;
    imageUrl?: string | null;
    sku?: string | null;
  }) {
    const genderLabel = STORE_GENDER_TARGETS.find((g) => g.code === input.genderTarget)?.label ?? input.genderTarget ?? null;
    const typeLabel = STORE_PRODUCT_TYPES.find((t) => t.code === input.productType)?.label ?? input.productType ?? null;
    const derived: VariantOption[] = [];
    if (input.size) derived.push({ name: 'Talla', value: input.size });
    if (input.color) derived.push({ name: 'Color', value: input.color });
    if (genderLabel) derived.push({ name: 'Género', value: genderLabel });
    if (typeLabel) derived.push({ name: 'Tipo', value: typeLabel });
    const options = input.optionValues && input.optionValues.length > 0 ? input.optionValues : derived;
    const optionLabel = options.length > 0 ? options.map((o) => `${o.name}: ${o.value}`).join(' / ') : (input.sku ?? 'Variante');
    return {
      optionValues: this.variantOptionsJson(options),
      optionLabel,
      size: input.size ?? null,
      color: input.color ?? null,
      genderTarget: input.genderTarget ?? null,
      productType: input.productType ?? null,
      imageUrl: input.imageUrl ?? null,
    };
  }

  private translateUniqueError(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      if (Array.isArray(error.meta?.target) && (error.meta?.target as string[]).includes('sku')) {
        return new ConflictException('Ya existe un producto con ese SKU.');
      }
      return new ConflictException('Ya existe un producto con esos datos.');
    }
    if (error instanceof BadRequestException || error instanceof ConflictException || error instanceof NotFoundException) {
      return error;
    }
    return error;
  }
}
