import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../auth/current-user.decorator';
import { InternalAuthUser } from '../../auth/auth.types';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { RequirePermissions } from '../../auth/require-permissions.decorator';
import { parseBody } from '../../common/parse-body';
import {
  createStoreDriverSchema,
  resetStoreDriverPasswordSchema,
  updateStoreDriverAccessStatusSchema,
  updateStoreDriverSchema,
  updateStoreDriverStatusSchema,
  upsertStoreDriverAccessSchema,
} from './store-driver.schemas';
import { StoreDriversService } from './store-drivers.service';

@Controller('admin/store/drivers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StoreDriversAdminController {
  constructor(private readonly storeDriversService: StoreDriversService) {}

  @Get()
  @RequirePermissions('store_drivers.read')
  list(@Query() query: Record<string, string | undefined>) {
    return this.storeDriversService.listAdmin(query);
  }

  @Get('active')
  @RequirePermissions('store_delivery_schedule.assign')
  listActive() {
    return this.storeDriversService.listActive();
  }

  @Get(':driverId')
  @RequirePermissions('store_drivers.read')
  get(@Param('driverId') driverId: string) {
    return this.storeDriversService.get(driverId);
  }

  @Post()
  @RequirePermissions('store_drivers.create')
  create(@Body() body: unknown, @CurrentUser() user: InternalAuthUser) {
    return this.storeDriversService.create(parseBody(createStoreDriverSchema, body), user);
  }

  @Patch(':driverId')
  @RequirePermissions('store_drivers.edit')
  update(@Param('driverId') driverId: string, @Body() body: unknown, @CurrentUser() user: InternalAuthUser) {
    return this.storeDriversService.update(driverId, parseBody(updateStoreDriverSchema, body), user);
  }

  @Patch(':driverId/status')
  @RequirePermissions('store_drivers.status')
  updateStatus(@Param('driverId') driverId: string, @Body() body: unknown, @CurrentUser() user: InternalAuthUser) {
    return this.storeDriversService.updateStatus(driverId, parseBody(updateStoreDriverStatusSchema, body), user);
  }

  @Post(':driverId/access')
  @RequirePermissions('store_drivers.access')
  upsertAccess(@Param('driverId') driverId: string, @Body() body: unknown, @CurrentUser() user: InternalAuthUser) {
    return this.storeDriversService.upsertAccess(driverId, parseBody(upsertStoreDriverAccessSchema, body), user);
  }

  @Post(':driverId/access/reset-password')
  @RequirePermissions('store_drivers.access')
  resetPassword(@Param('driverId') driverId: string, @Body() body: unknown, @CurrentUser() user: InternalAuthUser) {
    return this.storeDriversService.resetPassword(driverId, parseBody(resetStoreDriverPasswordSchema, body), user);
  }

  @Patch(':driverId/access/status')
  @RequirePermissions('store_drivers.access')
  updateAccessStatus(@Param('driverId') driverId: string, @Body() body: unknown, @CurrentUser() user: InternalAuthUser) {
    return this.storeDriversService.updateAccessStatus(driverId, parseBody(updateStoreDriverAccessStatusSchema, body), user);
  }
}
