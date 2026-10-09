import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../auth/current-user.decorator';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { RequirePermissions } from '../../auth/require-permissions.decorator';
import { InternalAuthUser } from '../../auth/auth.types';
import { parseBody } from '../../common/parse-body';
import { createStoreBrandSchema, updateStoreBrandSchema, updateStoreBrandStatusSchema } from './store-brand.schemas';
import { StoreBrandsService } from './store-brands.service';

@Controller('admin/store/brands')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StoreBrandsAdminController {
  constructor(private readonly storeBrandsService: StoreBrandsService) {}

  @Get()
  @RequirePermissions('store_brands.read')
  list(@Query() query: Record<string, string | undefined>) {
    return this.storeBrandsService.listAdmin(query);
  }

  @Get(':id')
  @RequirePermissions('store_brands.read')
  get(@Param('id') id: string) {
    return this.storeBrandsService.get(id);
  }

  @Post()
  @RequirePermissions('store_brands.create')
  create(@Body() body: unknown, @CurrentUser() user: InternalAuthUser) {
    return this.storeBrandsService.create(parseBody(createStoreBrandSchema, body), user);
  }

  @Patch(':id')
  @RequirePermissions('store_brands.edit')
  update(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: InternalAuthUser) {
    return this.storeBrandsService.update(id, parseBody(updateStoreBrandSchema, body), user);
  }

  @Patch(':id/status')
  @RequirePermissions('store_brands.status')
  updateStatus(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: InternalAuthUser) {
    return this.storeBrandsService.updateStatus(id, parseBody(updateStoreBrandStatusSchema, body), user);
  }
}
