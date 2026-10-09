import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../auth/current-user.decorator';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { RequirePermissions } from '../../auth/require-permissions.decorator';
import { InternalAuthUser } from '../../auth/auth.types';
import { parseBody } from '../../common/parse-body';
import {
  createStoreProductSchema,
  updateStoreProductSchema,
  updateStoreProductStatusSchema,
  updateStoreProductStockSchema,
} from './store-product.schemas';
import { StoreProductsService } from './store-products.service';

@Controller('admin/store/products')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StoreProductsAdminController {
  constructor(private readonly storeProductsService: StoreProductsService) {}

  @Get()
  @RequirePermissions('store_products.read')
  list(@Query() query: Record<string, string | undefined>) {
    return this.storeProductsService.listAdmin(query);
  }

  @Get(':id')
  @RequirePermissions('store_products.read')
  get(@Param('id') id: string) {
    return this.storeProductsService.get(id);
  }

  @Get(':id/stock-movements')
  @RequirePermissions('store_products.read')
  listStockMovements(@Param('id') id: string) {
    return this.storeProductsService.listStockMovements(id);
  }

  @Post()
  @RequirePermissions('store_products.create')
  create(@Body() body: unknown, @CurrentUser() user: InternalAuthUser) {
    return this.storeProductsService.create(parseBody(createStoreProductSchema, body), user);
  }

  @Patch(':id')
  @RequirePermissions('store_products.edit')
  update(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: InternalAuthUser) {
    return this.storeProductsService.update(id, parseBody(updateStoreProductSchema, body), user);
  }

  @Patch(':id/status')
  @RequirePermissions('store_products.status')
  updateStatus(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: InternalAuthUser) {
    return this.storeProductsService.updateStatus(id, parseBody(updateStoreProductStatusSchema, body), user);
  }

  @Patch(':id/stock')
  @RequirePermissions('store_products.stock')
  updateStock(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: InternalAuthUser) {
    return this.storeProductsService.updateStock(id, parseBody(updateStoreProductStockSchema, body), user);
  }
}
