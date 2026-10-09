import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../auth/current-user.decorator';
import { InternalAuthUser } from '../../auth/auth.types';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { RequirePermissions } from '../../auth/require-permissions.decorator';
import { parseBody } from '../../common/parse-body';
import { StoreOrderPickupAdminService } from './store-order-pickup-admin.service';
import { adminPickupStatusSchema, assignOriginStoreSchema } from './store-order-pickup-admin.schemas';

@Controller('admin/store/orders')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StoreOrderPickupAdminController {
  constructor(private readonly pickupService: StoreOrderPickupAdminService) {}

  @Get(':orderId/pickup')
  @RequirePermissions('store_orders.read')
  getPickup(@Param('orderId') orderId: string) {
    return this.pickupService.getPickup(orderId);
  }

  @Get(':orderId/pickup-summary')
  @RequirePermissions('store_orders.read')
  getSummary(@Param('orderId') orderId: string) {
    return this.pickupService.getSummary(orderId);
  }

  @Patch(':orderId/items/:itemId/origin-store')
  @RequirePermissions('store_orders.confirm')
  assignOriginStore(
    @Param('orderId') orderId: string,
    @Param('itemId') itemId: string,
    @Body() body: unknown,
    @CurrentUser() user: InternalAuthUser,
  ) {
    return this.pickupService.assignOriginStore(orderId, itemId, parseBody(assignOriginStoreSchema, body), user);
  }

  @Patch(':orderId/items/:itemId/pickup-status')
  @RequirePermissions('store_orders.confirm')
  setPickupStatus(
    @Param('orderId') orderId: string,
    @Param('itemId') itemId: string,
    @Body() body: unknown,
    @CurrentUser() user: InternalAuthUser,
  ) {
    return this.pickupService.setPickupStatus(orderId, itemId, parseBody(adminPickupStatusSchema, body), user);
  }
}
