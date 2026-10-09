import { BadRequestException, Injectable, NotFoundException, StreamableFile } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { CustomerAuthUser, InternalAuthUser } from '../auth/auth.types';
import { PrismaService } from '../database/prisma.service';
import {
  UploadBrandCardImageInput,
  UploadCustomerProfilePhotoInput,
  UploadMediaInput,
  UploadRewardImageInput,
  UploadStoreBrandLogoInput,
  UploadStorePaymentReceiptInput,
  UploadStoreProductImageInput,
} from './media.schemas';
import { StorageService } from './storage.service';

@Injectable()
export class MediaService {
  private readonly maxImageBytes = 10 * 1024 * 1024;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly storageService: StorageService,
  ) {}

  async uploadInternal(input: UploadMediaInput, actor: InternalAuthUser) {
    const stored = await this.storeFile(input);
    const createdAsset = await this.prisma.mediaAsset.create({
      data: {
        purpose: input.purpose,
        filename: input.filename,
        mimeType: input.mimeType,
        sizeBytes: stored.sizeBytes,
        storageProvider: stored.storageProvider,
        storageKey: stored.storageKey,
        publicUrl: '',
        uploadedByInternalUserId: actor.id,
      },
    });
    const asset = await this.prisma.mediaAsset.update({
      where: { id: createdAsset.id },
      data: { publicUrl: this.publicUrlForAsset(createdAsset.id) },
    });

    await this.auditService.record({
      actorType: 'INTERNAL_USER',
      actorInternalUserId: actor.id,
      action: 'media.upload',
      module: 'media',
      entityType: 'MediaAsset',
      entityId: asset.id,
      metadata: {
        purpose: asset.purpose,
        filename: asset.filename,
        mimeType: asset.mimeType,
        sizeBytes: asset.sizeBytes,
      },
    });

    return asset;
  }

  async uploadRewardImage(input: UploadRewardImageInput, actor: InternalAuthUser) {
    const product = await this.prisma.redeemableProduct.findUnique({
      where: { id: input.rewardId },
      select: { id: true, code: true, name: true },
    });

    if (!product) {
      throw new NotFoundException('Producto canjeable no encontrado.');
    }

    const asset = await this.uploadInternal(input, actor);
    const updatedProduct = await this.prisma.redeemableProduct.update({
      where: { id: product.id },
      data: { imageUrl: asset.publicUrl },
    });

    await this.auditService.record({
      actorType: 'INTERNAL_USER',
      actorInternalUserId: actor.id,
      action: 'media.redeemable_product_image_attached',
      module: 'media',
      entityType: 'RedeemableProduct',
      entityId: product.id,
      metadata: {
        productCode: product.code,
        assetId: asset.id,
        publicUrl: asset.publicUrl,
      },
    });

    return { asset, reward: updatedProduct };
  }

  async uploadCustomerProfilePhoto(input: UploadCustomerProfilePhotoInput, customer: CustomerAuthUser) {
    const stored = await this.storeFile(input);
    const result = await this.prisma.$transaction(async (tx) => {
      const createdAsset = await tx.mediaAsset.create({
        data: {
          purpose: input.purpose,
          filename: input.filename,
          mimeType: input.mimeType,
          sizeBytes: stored.sizeBytes,
          storageProvider: stored.storageProvider,
          storageKey: stored.storageKey,
          publicUrl: '',
          uploadedByCustomerId: customer.id,
        },
      });

      const asset = await tx.mediaAsset.update({
        where: { id: createdAsset.id },
        data: { publicUrl: this.publicUrlForAsset(createdAsset.id) },
      });

      const updatedCustomer = await tx.customer.update({
        where: { id: customer.id },
        data: { profilePhotoUrl: asset.publicUrl },
        select: {
          id: true,
          code: true,
          fullName: true,
          phone: true,
          email: true,
          status: true,
          profilePhotoUrl: true,
        },
      });

      return { asset, customer: updatedCustomer };
    });

    await this.auditService.record({
      actorType: 'CUSTOMER',
      actorCustomerId: customer.id,
      action: 'media.customer_profile_photo_upload',
      module: 'media',
      entityType: 'MediaAsset',
      entityId: result.asset.id,
      metadata: {
        filename: result.asset.filename,
        mimeType: result.asset.mimeType,
        sizeBytes: result.asset.sizeBytes,
      },
    });

    return result;
  }

  async uploadInternalProfilePhoto(input: UploadCustomerProfilePhotoInput, actor: InternalAuthUser) {
    const stored = await this.storeFile(input);
    const result = await this.prisma.$transaction(async (tx) => {
      const createdAsset = await tx.mediaAsset.create({
        data: {
          purpose: input.purpose,
          filename: input.filename,
          mimeType: input.mimeType,
          sizeBytes: stored.sizeBytes,
          storageProvider: stored.storageProvider,
          storageKey: stored.storageKey,
          publicUrl: '',
          uploadedByInternalUserId: actor.id,
        },
      });

      const asset = await tx.mediaAsset.update({
        where: { id: createdAsset.id },
        data: { publicUrl: this.publicUrlForAsset(createdAsset.id) },
      });

      const updatedUser = await tx.internalUser.update({
        where: { id: actor.id },
        data: { profilePhotoUrl: asset.publicUrl },
        select: {
          id: true,
          email: true,
          fullName: true,
          status: true,
          profilePhotoUrl: true,
        },
      });

      return { asset, user: updatedUser };
    });

    await this.auditService.record({
      actorType: 'INTERNAL_USER',
      actorInternalUserId: actor.id,
      action: 'media.internal_profile_photo_upload',
      module: 'media',
      entityType: 'InternalUser',
      entityId: actor.id,
      metadata: {
        assetId: result.asset.id,
        publicUrl: result.asset.publicUrl,
        filename: result.asset.filename,
        mimeType: result.asset.mimeType,
        sizeBytes: result.asset.sizeBytes,
      },
    });

    return result;
  }

  async uploadDriverProfilePhoto(input: UploadCustomerProfilePhotoInput, driverId: string) {
    const stored = await this.storeFile(input);
    const result = await this.prisma.$transaction(async (tx) => {
      const createdAsset = await tx.mediaAsset.create({
        data: {
          purpose: input.purpose,
          filename: input.filename,
          mimeType: input.mimeType,
          sizeBytes: stored.sizeBytes,
          storageProvider: stored.storageProvider,
          storageKey: stored.storageKey,
          publicUrl: '',
        },
      });

      const asset = await tx.mediaAsset.update({
        where: { id: createdAsset.id },
        data: { publicUrl: this.publicUrlForAsset(createdAsset.id) },
      });

      const updatedDriver = await tx.storeDriver.update({
        where: { id: driverId },
        data: { profilePhotoUrl: asset.publicUrl },
        select: { id: true, fullName: true, profilePhotoUrl: true },
      });

      return { asset, driver: updatedDriver };
    });

    await this.auditService.record({
      actorType: 'SYSTEM',
      action: 'media.driver_profile_photo_upload',
      module: 'media',
      entityType: 'StoreDriver',
      entityId: driverId,
      metadata: {
        driverId,
        assetId: result.asset.id,
        publicUrl: result.asset.publicUrl,
        filename: result.asset.filename,
        mimeType: result.asset.mimeType,
        sizeBytes: result.asset.sizeBytes,
      },
    });

    return result;
  }

  async uploadCustomerProfilePhotoFromAdmin(customerId: string, input: UploadCustomerProfilePhotoInput, actor: InternalAuthUser) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, code: true, fullName: true },
    });

    if (!customer) {
      throw new NotFoundException('Cliente no encontrado.');
    }

    const stored = await this.storeFile(input);
    const result = await this.prisma.$transaction(async (tx) => {
      const createdAsset = await tx.mediaAsset.create({
        data: {
          purpose: input.purpose,
          filename: input.filename,
          mimeType: input.mimeType,
          sizeBytes: stored.sizeBytes,
          storageProvider: stored.storageProvider,
          storageKey: stored.storageKey,
          publicUrl: '',
          uploadedByInternalUserId: actor.id,
        },
      });

      const asset = await tx.mediaAsset.update({
        where: { id: createdAsset.id },
        data: { publicUrl: this.publicUrlForAsset(createdAsset.id) },
      });

      const updatedCustomer = await tx.customer.update({
        where: { id: customer.id },
        data: { profilePhotoUrl: asset.publicUrl },
        select: {
          id: true,
          code: true,
          fullName: true,
          phone: true,
          email: true,
          status: true,
          profilePhotoUrl: true,
        },
      });

      return { asset, customer: updatedCustomer };
    });

    await this.auditService.record({
      actorType: 'INTERNAL_USER',
      actorInternalUserId: actor.id,
      action: 'media.customer_profile_photo_upload_admin',
      module: 'media',
      entityType: 'Customer',
      entityId: customer.id,
      metadata: {
        customerCode: customer.code,
        assetId: result.asset.id,
        publicUrl: result.asset.publicUrl,
      },
    });

    return result;
  }

  async uploadBrandCardImage(input: UploadBrandCardImageInput, actor: InternalAuthUser) {
    const catalogItem = await this.prisma.catalogItem.findUnique({
      where: { id: input.catalogItemId },
      select: { id: true, name: true, code: true },
    });

    if (!catalogItem) {
      throw new NotFoundException('Elemento de catalogo no encontrado.');
    }

    const asset = await this.uploadInternal(input, actor);
    await this.prisma.catalogItem.update({
      where: { id: catalogItem.id },
      data: { cardImageUrl: asset.publicUrl },
    });

    await this.auditService.record({
      actorType: 'INTERNAL_USER',
      actorInternalUserId: actor.id,
      action: 'media.brand_card_image_attached',
      module: 'media',
      entityType: 'CatalogItem',
      entityId: catalogItem.id,
      metadata: { itemCode: catalogItem.code, assetId: asset.id, publicUrl: asset.publicUrl },
    });

    return { asset, catalogItemId: catalogItem.id };
  }

  async uploadStoreBrandLogo(input: UploadStoreBrandLogoInput, actor: InternalAuthUser) {
    const storeBrand = await this.prisma.storeBrand.findUnique({
      where: { id: input.storeBrandId },
      select: { id: true, code: true, name: true },
    });

    if (!storeBrand) {
      throw new NotFoundException('Marca de tienda online no encontrada.');
    }

    const asset = await this.uploadInternal(input, actor);
    const updatedBrand = await this.prisma.storeBrand.update({
      where: { id: storeBrand.id },
      data: { logoUrl: asset.publicUrl },
    });

    await this.auditService.record({
      actorType: 'INTERNAL_USER',
      actorInternalUserId: actor.id,
      action: 'media.store_brand_logo_attached',
      module: 'media',
      entityType: 'StoreBrand',
      entityId: storeBrand.id,
      metadata: { brandCode: storeBrand.code, assetId: asset.id, publicUrl: asset.publicUrl },
    });

    return { asset, brand: updatedBrand };
  }

  async uploadStoreProductImage(input: UploadStoreProductImageInput, actor: InternalAuthUser) {
    const storeProduct = await this.prisma.storeProduct.findUnique({
      where: { id: input.storeProductId },
      select: { id: true, sku: true, name: true },
    });

    if (!storeProduct) {
      throw new NotFoundException('Producto de tienda online no encontrado.');
    }

    const asset = await this.uploadInternal(input, actor);

    await this.auditService.record({
      actorType: 'INTERNAL_USER',
      actorInternalUserId: actor.id,
      action: 'media.store_product_image_uploaded',
      module: 'media',
      entityType: 'StoreProduct',
      entityId: storeProduct.id,
      metadata: { productSku: storeProduct.sku, assetId: asset.id, publicUrl: asset.publicUrl },
    });

    return { asset, storeProductId: storeProduct.id };
  }

  async uploadStorePaymentReceipt(input: UploadStorePaymentReceiptInput, actor: InternalAuthUser) {
    const maxReceiptBytes = 5 * 1024 * 1024;
    const order = await this.prisma.storeOrder.findUnique({ where: { id: input.orderId }, select: { id: true, orderNumber: true } });

    if (!order) {
      throw new NotFoundException('Pedido de tienda online no encontrado.');
    }

    const stored = await this.storeFile(input, maxReceiptBytes);
    const createdAsset = await this.prisma.mediaAsset.create({
      data: {
        purpose: input.purpose,
        filename: input.filename,
        mimeType: input.mimeType,
        sizeBytes: stored.sizeBytes,
        storageProvider: stored.storageProvider,
        storageKey: stored.storageKey,
        publicUrl: '',
        uploadedByInternalUserId: actor.id,
      },
    });
    const asset = await this.prisma.mediaAsset.update({
      where: { id: createdAsset.id },
      data: { publicUrl: this.publicUrlForAsset(createdAsset.id) },
    });

    await this.auditService.record({
      actorType: 'INTERNAL_USER',
      actorInternalUserId: actor.id,
      action: 'media.store_payment_receipt_uploaded',
      module: 'media',
      entityType: 'StoreOrder',
      entityId: order.id,
      metadata: { orderNumber: order.orderNumber, assetId: asset.id, publicUrl: asset.publicUrl, filename: asset.filename },
    });

    return { asset };
  }

  async getAssetContent(id: string) {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id } });

    if (!asset) {
      throw new NotFoundException('Archivo no encontrado.');
    }

    const content = await this.storageService.get(asset.storageKey, asset.storageProvider);

    return {
      asset,
      file: new StreamableFile(content, {
        type: asset.mimeType,
        disposition: `inline; filename="${this.safeContentDispositionFilename(asset.filename)}"`,
      }),
    };
  }

  private safeContentDispositionFilename(filename: string) {
    const fallback = 'archivo';
    const cleaned = filename
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\x20-\x7E]/g, '')
      .replace(/[\\"]/g, '')
      .trim();

    return cleaned || fallback;
  }

  private async storeFile(input: { dataBase64: string; mimeType: string; purpose: string }, maxBytes: number = this.maxImageBytes) {
    const buffer = this.decodeBase64(input.dataBase64);

    if (buffer.byteLength > maxBytes) {
      throw new BadRequestException(`El archivo no debe superar los ${Math.round(maxBytes / (1024 * 1024))} MB.`);
    }

    const extension = this.resolveExtension(input.mimeType);
    const storageKey = `${input.purpose.toLowerCase()}/${new Date().getFullYear()}/${randomUUID()}${extension}`;
    const storageProvider = await this.storageService.put(storageKey, buffer, input.mimeType);

    return {
      storageKey,
      sizeBytes: buffer.byteLength,
      storageProvider,
    };
  }

  private publicUrlForAsset(id: string) {
    return `/api/media/assets/${id}/content`;
  }

  private decodeBase64(value: string) {
    const cleanedValue = value.includes(',') ? value.split(',').pop() ?? '' : value;

    try {
      return Buffer.from(cleanedValue, 'base64');
    } catch {
      throw new BadRequestException('La imagen no esta en formato base64 valido.');
    }
  }

  private resolveExtension(mimeType: string) {
    const extensions: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'application/pdf': '.pdf',
    };

    return extensions[mimeType] ?? '.bin';
  }

}
