import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentCustomer } from '../auth/current-customer.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { CustomerJwtAuthGuard } from '../auth/customer-jwt-auth.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/require-permissions.decorator';
import { CustomerAuthUser, InternalAuthUser } from '../auth/auth.types';
import { parseBody } from '../common/parse-body';
import {
  uploadBannerImageSchema,
  uploadBrandCardImageSchema,
  uploadCustomerProfilePhotoSchema,
  uploadMediaSchema,
  uploadRedemptionEvidenceSchema,
  uploadRewardImageSchema,
  uploadStoreBrandLogoSchema,
  uploadStorePaymentReceiptSchema,
  uploadStoreProductImageSchema,
} from './media.schemas';
import { MediaService } from './media.service';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('assets')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('catalogs.manage')
  uploadInternal(@Body() body: unknown, @CurrentUser() user: InternalAuthUser) {
    return this.mediaService.uploadInternal(parseBody(uploadMediaSchema, body), user);
  }

  @Post('rewards/image')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('catalogs.manage')
  uploadRewardImage(@Body() body: unknown, @CurrentUser() user: InternalAuthUser) {
    return this.mediaService.uploadRewardImage(parseBody(uploadRewardImageSchema, body), user);
  }

  @Post('banners/image')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('marketing.manage')
  uploadBannerImage(@Body() body: unknown, @CurrentUser() user: InternalAuthUser) {
    return this.mediaService.uploadInternal(parseBody(uploadBannerImageSchema, body), user);
  }

  @Post('redemptions/evidence')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('redemption_requests.mark_delivered')
  uploadRedemptionEvidence(@Body() body: unknown, @CurrentUser() user: InternalAuthUser) {
    return this.mediaService.uploadInternal(parseBody(uploadRedemptionEvidenceSchema, body), user);
  }

  @Post('brands/card-image')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('catalogs.manage')
  uploadBrandCardImage(@Body() body: unknown, @CurrentUser() user: InternalAuthUser) {
    return this.mediaService.uploadBrandCardImage(parseBody(uploadBrandCardImageSchema, body), user);
  }

  @Post('customer/profile-photo')
  @UseGuards(CustomerJwtAuthGuard)
  uploadCustomerProfilePhoto(@Body() body: unknown, @CurrentCustomer() customer: CustomerAuthUser) {
    return this.mediaService.uploadCustomerProfilePhoto(parseBody(uploadCustomerProfilePhotoSchema, body), customer);
  }

  @Post('internal/profile-photo')
  @UseGuards(JwtAuthGuard)
  uploadInternalProfilePhoto(@Body() body: unknown, @CurrentUser() user: InternalAuthUser) {
    return this.mediaService.uploadInternalProfilePhoto(parseBody(uploadCustomerProfilePhotoSchema, body), user);
  }

  @Post('customers/:customerId/profile-photo')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('customers.edit')
  uploadCustomerProfilePhotoFromAdmin(@Param('customerId') customerId: string, @Body() body: unknown, @CurrentUser() user: InternalAuthUser) {
    return this.mediaService.uploadCustomerProfilePhotoFromAdmin(customerId, parseBody(uploadCustomerProfilePhotoSchema, body), user);
  }

  @Post('store/brands/logo')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('store_brands.edit')
  uploadStoreBrandLogo(@Body() body: unknown, @CurrentUser() user: InternalAuthUser) {
    return this.mediaService.uploadStoreBrandLogo(parseBody(uploadStoreBrandLogoSchema, body), user);
  }

  @Post('store/products/image')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('store_products.images')
  uploadStoreProductImage(@Body() body: unknown, @CurrentUser() user: InternalAuthUser) {
    return this.mediaService.uploadStoreProductImage(parseBody(uploadStoreProductImageSchema, body), user);
  }

  @Post('store/payments/receipt')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('store_orders.payments')
  uploadStorePaymentReceipt(@Body() body: unknown, @CurrentUser() user: InternalAuthUser) {
    return this.mediaService.uploadStorePaymentReceipt(parseBody(uploadStorePaymentReceiptSchema, body), user);
  }

  @Get('assets/:id/content')
  async getAssetContent(@Param('id') id: string) {
    const result = await this.mediaService.getAssetContent(id);
    return result.file;
  }
}
