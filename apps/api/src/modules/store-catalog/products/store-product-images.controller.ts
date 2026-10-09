import { Body, Controller, Delete, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser } from '../../auth/current-user.decorator';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { RequirePermissions } from '../../auth/require-permissions.decorator';
import { InternalAuthUser } from '../../auth/auth.types';
import { parseBody } from '../../common/parse-body';
import { StoreProductImagesService } from './store-product-images.service';

const addImageSchema = z.object({ imageUrl: z.string().trim().min(1).max(500) }).strict();

@Controller('admin/store/products/:productId/images')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('store_products.images')
export class StoreProductImagesController {
  constructor(private readonly storeProductImagesService: StoreProductImagesService) {}

  @Post()
  add(@Param('productId') productId: string, @Body() body: unknown, @CurrentUser() user: InternalAuthUser) {
    const { imageUrl } = parseBody(addImageSchema, body);
    return this.storeProductImagesService.addImage(productId, imageUrl, user);
  }

  @Delete(':imageId')
  remove(@Param('productId') productId: string, @Param('imageId') imageId: string, @CurrentUser() user: InternalAuthUser) {
    return this.storeProductImagesService.removeImage(productId, imageId, user);
  }

  @Patch(':imageId/main')
  setMain(@Param('productId') productId: string, @Param('imageId') imageId: string, @CurrentUser() user: InternalAuthUser) {
    return this.storeProductImagesService.setMainImage(productId, imageId, user);
  }
}
