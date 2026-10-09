import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CustomerAuthUser } from '../../auth/auth.types';
import { PrismaService } from '../../database/prisma.service';
import { AddStoreCartItemInput, UpdateStoreCartItemInput } from './store-cart.schemas';
import { groupItemsByBrand } from '../order/store-brand-grouping';

const productSelect = {
  id: true,
  name: true,
  mainImageUrl: true,
  price: true,
  stockQuantity: true,
  isActive: true,
  brand: { select: { id: true, name: true, isActive: true, logoUrl: true } },
  variants: {
    where: { isActive: true },
    orderBy: [{ displayOrder: 'asc' as const }, { optionLabel: 'asc' as const }],
    select: { id: true, optionLabel: true, optionValues: true, sku: true, price: true, promotionalPrice: true, stockQuantity: true, isActive: true },
  },
};

@Injectable()
export class StoreCartService {
  constructor(private readonly prisma: PrismaService) {}

  async getCart(customer: CustomerAuthUser) {
    const cart = await this.findActiveCart(customer.id);
    if (!cart) {
      return this.emptyCartDto();
    }
    return this.toCartDto(cart.id);
  }

  async addItem(customer: CustomerAuthUser, input: AddStoreCartItemInput) {
    const cartId = await this.prisma.$transaction(async (tx) => {
      const sellable = await this.assertPurchasableProduct(input.productId, input.variantId ?? null, tx);
      const cart = await this.getOrCreateActiveCart(customer.id, tx);
      const existingItem = await tx.storeCartItem.findFirst({
        where: { cartId: cart.id, productId: input.productId, variantId: sellable.variantId },
      });

      if (existingItem) {
        await this.incrementExistingItem(tx, existingItem.id, input.quantity, sellable.stockQuantity, sellable.price);
        return cart.id;
      }

      if (input.quantity > sellable.stockQuantity) {
        throw new BadRequestException('No puedes agregar mas unidades porque superas el stock disponible.');
      }

      try {
        await tx.storeCartItem.create({
          data: { cartId: cart.id, productId: input.productId, variantId: sellable.variantId, quantity: input.quantity, unitPriceSnapshot: sellable.price },
        });
      } catch (error) {
        if (!this.isUniqueConstraintError(error)) throw error;
        const racedItem = await tx.storeCartItem.findFirst({
          where: { cartId: cart.id, productId: input.productId, variantId: sellable.variantId },
        });
        if (!racedItem) throw error;
        await this.incrementExistingItem(tx, racedItem.id, input.quantity, sellable.stockQuantity, sellable.price);
      }

      return cart.id;
    });

    return this.toCartDto(cartId);
  }

  async updateItem(customer: CustomerAuthUser, itemId: string, input: UpdateStoreCartItemInput) {
    const item = await this.assertOwnedItem(customer.id, itemId);
    const sellable = await this.assertPurchasableProduct(item.productId, item.variantId);

    if (input.quantity > sellable.stockQuantity) {
      throw new BadRequestException('No puedes agregar mas unidades porque superas el stock disponible.');
    }

    await this.prisma.storeCartItem.update({
      where: { id: itemId },
      data: { quantity: input.quantity, unitPriceSnapshot: sellable.price },
    });

    return this.toCartDto(item.cartId);
  }

  async removeItem(customer: CustomerAuthUser, itemId: string) {
    const item = await this.assertOwnedItem(customer.id, itemId);
    await this.prisma.storeCartItem.delete({ where: { id: itemId } });
    return this.toCartDto(item.cartId);
  }

  async clearCart(customer: CustomerAuthUser) {
    const cart = await this.findActiveCart(customer.id);
    if (cart) {
      await this.prisma.storeCartItem.deleteMany({ where: { cartId: cart.id } });
    }
    return this.emptyCartDto();
  }

  async getOrCreateActiveCart(customerId: string, prisma: Prisma.TransactionClient | PrismaService = this.prisma) {
    const existing = await this.findActiveCart(customerId, prisma);
    if (existing) return existing;
    try {
      return await prisma.storeCart.create({ data: { customerId, status: 'ACTIVE' } });
    } catch (error) {
      if (!this.isUniqueConstraintError(error)) throw error;
      const racedCart = await this.findActiveCart(customerId, prisma);
      if (!racedCart) throw error;
      return racedCart;
    }
  }

  private async findActiveCart(customerId: string, prisma: Prisma.TransactionClient | PrismaService = this.prisma) {
    return prisma.storeCart.findFirst({
      where: { customerId, status: 'ACTIVE' },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    });
  }

  private async assertOwnedItem(customerId: string, itemId: string) {
    const item = await this.prisma.storeCartItem.findUnique({
      where: { id: itemId },
      include: { cart: true },
    });

    if (!item || item.cart.customerId !== customerId || item.cart.status !== 'ACTIVE') {
      throw new NotFoundException('El producto no existe en tu carrito.');
    }

    return item;
  }

  private async assertPurchasableProduct(productId: string, variantId: string | null, prisma: Prisma.TransactionClient | PrismaService = this.prisma) {
    const product = await prisma.storeProduct.findUnique({ where: { id: productId }, select: productSelect });

    if (!product || !product.isActive || !product.brand.isActive) {
      throw new BadRequestException('Este producto no tiene disponibilidad en este momento.');
    }

    if (product.variants.length > 0) {
      if (!variantId) {
        throw new BadRequestException('Selecciona una variante para agregar este producto.');
      }
      const variant = product.variants.find((candidate) => candidate.id === variantId);
      if (!variant || !variant.isActive || variant.stockQuantity <= 0) {
        throw new BadRequestException('Esta variante no tiene disponibilidad en este momento.');
      }
      return {
        product,
        variantId: variant.id,
        price: variant.promotionalPrice ?? variant.price,
        stockQuantity: variant.stockQuantity,
      };
    }

    if (variantId) {
      throw new BadRequestException('La variante indicada no pertenece a este producto.');
    }

    if (product.stockQuantity <= 0) {
      throw new BadRequestException('Este producto no tiene disponibilidad en este momento.');
    }

    return { product, variantId: null, price: product.price, stockQuantity: product.stockQuantity };
  }

  private async incrementExistingItem(
    tx: Prisma.TransactionClient,
    itemId: string,
    quantityToAdd: number,
    availableStock: number,
    unitPriceSnapshot: Prisma.Decimal,
  ) {
    const result = await tx.storeCartItem.updateMany({
      where: { id: itemId, quantity: { lte: availableStock - quantityToAdd } },
      data: { quantity: { increment: quantityToAdd }, unitPriceSnapshot },
    });

    if (result.count !== 1) {
      throw new BadRequestException('No puedes agregar mas unidades porque superas el stock disponible.');
    }
  }

  private isUniqueConstraintError(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }

  private async toCartDto(cartId: string) {
    const items = await this.prisma.storeCartItem.findMany({
      where: { cartId },
      orderBy: { createdAt: 'asc' },
      include: {
        product: { select: productSelect },
        variant: { select: { id: true, optionLabel: true, optionValues: true, sku: true, price: true, promotionalPrice: true, stockQuantity: true, isActive: true } },
      },
    });

    const dtoItems = items.map((item) => {
      const unitPrice = Number(item.variant?.promotionalPrice ?? item.variant?.price ?? item.product.price);
      const availableStock = item.variant?.stockQuantity ?? item.product.stockQuantity;
      const hasVariants = item.product.variants.length > 0;
      const isAvailable = item.product.isActive && item.product.brand.isActive && availableStock > 0 && (!hasVariants || Boolean(item.variant?.isActive));
      return {
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        brandId: item.product.brand.id,
        brandName: item.product.brand.name,
        brandLogoUrl: item.product.brand.logoUrl ?? null,
        productName: item.product.name,
        variantLabel: item.variant?.optionLabel ?? null,
        variantOptions: item.variant?.optionValues ?? null,
        sku: item.variant?.sku ?? null,
        imageUrl: item.product.mainImageUrl,
        unitPrice,
        quantity: item.quantity,
        subtotal: unitPrice * item.quantity,
        availableStock,
        isAvailable,
      };
    });

    const subtotal = dtoItems.reduce((sum, item) => sum + item.subtotal, 0);

    // Agrupación lógica por marca (aditiva): la lista plana `items` se conserva.
    const brandGroups = groupItemsByBrand(dtoItems).map((group) => ({
      ...group,
      hasUnavailableItems: group.items.some((item) => !item.isAvailable),
    }));

    return {
      id: cartId,
      items: dtoItems,
      brandGroups,
      subtotal,
      shippingAmount: 0,
      total: subtotal,
    };
  }

  private emptyCartDto() {
    return { id: null, items: [], brandGroups: [], subtotal: 0, shippingAmount: 0, total: 0 };
  }
}
