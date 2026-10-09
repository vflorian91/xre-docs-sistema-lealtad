import { Injectable, NotFoundException } from '@nestjs/common';
import { InternalAuthUser } from '../../auth/auth.types';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class StoreProductImagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async addImage(productId: string, imageUrl: string, actor: InternalAuthUser) {
    const product = await this.assertProductExists(productId);

    const image = await this.prisma.$transaction(async (tx) => {
      const existingImagesCount = await tx.storeProductImage.count({ where: { productId } });

      // La imagen recién subida siempre pasa a ser la principal (reemplaza la anterior),
      // para que al subir una nueva imagen la del producto se actualice aunque ya tuviera una.
      await tx.storeProductImage.updateMany({ where: { productId }, data: { isMain: false } });

      const created = await tx.storeProductImage.create({
        data: { productId, imageUrl, isMain: true, displayOrder: existingImagesCount },
      });

      await tx.storeProduct.update({ where: { id: productId }, data: { mainImageUrl: imageUrl } });

      return created;
    });

    await this.auditService.record({
      actorType: 'INTERNAL_USER',
      actorInternalUserId: actor.id,
      action: 'store_products.images.add',
      module: 'store_products',
      entityType: 'StoreProductImage',
      entityId: image.id,
      metadata: { productId, imageUrl, productCode: product.sku },
    });

    return image;
  }

  async removeImage(productId: string, imageId: string, actor: InternalAuthUser) {
    const image = await this.assertImageExists(productId, imageId);

    await this.prisma.$transaction(async (tx) => {
      await tx.storeProductImage.delete({ where: { id: imageId } });

      if (image.isMain) {
        const nextMain = await tx.storeProductImage.findFirst({
          where: { productId },
          orderBy: { displayOrder: 'asc' },
        });

        if (nextMain) {
          await tx.storeProductImage.update({ where: { id: nextMain.id }, data: { isMain: true } });
        }

        await tx.storeProduct.update({
          where: { id: productId },
          data: { mainImageUrl: nextMain?.imageUrl ?? null },
        });
      }
    });

    await this.auditService.record({
      actorType: 'INTERNAL_USER',
      actorInternalUserId: actor.id,
      action: 'store_products.images.remove',
      module: 'store_products',
      entityType: 'StoreProductImage',
      entityId: imageId,
      metadata: { productId },
    });

    return { success: true };
  }

  async setMainImage(productId: string, imageId: string, actor: InternalAuthUser) {
    const image = await this.assertImageExists(productId, imageId);

    await this.prisma.$transaction(async (tx) => {
      await tx.storeProductImage.updateMany({ where: { productId }, data: { isMain: false } });
      await tx.storeProductImage.update({ where: { id: imageId }, data: { isMain: true } });
      await tx.storeProduct.update({ where: { id: productId }, data: { mainImageUrl: image.imageUrl } });
    });

    await this.auditService.record({
      actorType: 'INTERNAL_USER',
      actorInternalUserId: actor.id,
      action: 'store_products.images.set_main',
      module: 'store_products',
      entityType: 'StoreProductImage',
      entityId: imageId,
      metadata: { productId, imageUrl: image.imageUrl },
    });

    return { success: true };
  }

  private async assertProductExists(productId: string) {
    const product = await this.prisma.storeProduct.findUnique({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException('Producto de tienda online no encontrado.');
    }
    return product;
  }

  private async assertImageExists(productId: string, imageId: string) {
    const image = await this.prisma.storeProductImage.findFirst({ where: { id: imageId, productId } });
    if (!image) {
      throw new NotFoundException('Imagen de producto no encontrada.');
    }
    return image;
  }
}
