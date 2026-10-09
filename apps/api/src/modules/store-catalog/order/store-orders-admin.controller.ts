import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../auth/current-user.decorator';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { RequirePermissions } from '../../auth/require-permissions.decorator';
import { InternalAuthUser } from '../../auth/auth.types';
import { parseBody } from '../../common/parse-body';
import {
  cancelStoreOrderSchema,
  cancelAfterIncidentSchema,
  changeAddressDeliveryIncidentSchema,
  confirmStoreOrderSchema,
  rescheduleDeliveryIncidentSchema,
  reviewDeliveryIncidentSchema,
  rescheduleStoreOrderSchema,
  reviewStoreOrderSchema,
} from './store-order-admin.schemas';
import { StoreOrdersAdminService } from './store-orders-admin.service';

@Controller('admin/store/orders')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StoreOrdersAdminController {
  constructor(private readonly storeOrdersAdminService: StoreOrdersAdminService) {}

  @Get()
  @RequirePermissions('store_orders.read')
  list(@Query() query: Record<string, string | undefined>) {
    return this.storeOrdersAdminService.listAdmin(query);
  }

  @Get(':orderId')
  @RequirePermissions('store_orders.read')
  get(@Param('orderId') orderId: string) {
    return this.storeOrdersAdminService.getAdmin(orderId);
  }

  @Post(':orderId/review')
  @RequirePermissions('store_orders.review')
  review(@Param('orderId') orderId: string, @Body() body: unknown, @CurrentUser() user: InternalAuthUser) {
    return this.storeOrdersAdminService.review(orderId, parseBody(reviewStoreOrderSchema, body), user);
  }

  @Post(':orderId/confirm')
  @RequirePermissions('store_orders.confirm')
  confirm(@Param('orderId') orderId: string, @Body() body: unknown, @CurrentUser() user: InternalAuthUser) {
    return this.storeOrdersAdminService.confirm(orderId, parseBody(confirmStoreOrderSchema, body), user);
  }

  @Post(':orderId/reschedule')
  @RequirePermissions('store_orders.reschedule')
  reschedule(@Param('orderId') orderId: string, @Body() body: unknown, @CurrentUser() user: InternalAuthUser) {
    return this.storeOrdersAdminService.reschedule(orderId, parseBody(rescheduleStoreOrderSchema, body), user);
  }

  @Post(':orderId/cancel')
  @RequirePermissions('store_orders.cancel')
  cancel(@Param('orderId') orderId: string, @Body() body: unknown, @CurrentUser() user: InternalAuthUser) {
    return this.storeOrdersAdminService.cancel(orderId, parseBody(cancelStoreOrderSchema, body), user);
  }

  @Get(':orderId/incidents')
  @RequirePermissions('store_orders.read')
  listIncidents(@Param('orderId') orderId: string) {
    return this.storeOrdersAdminService.listIncidents(orderId);
  }

  @Patch(':orderId/incidents/:incidentId/review')
  @RequirePermissions('store_orders.review')
  reviewIncident(
    @Param('orderId') orderId: string,
    @Param('incidentId') incidentId: string,
    @Body() body: unknown,
    @CurrentUser() user: InternalAuthUser,
  ) {
    return this.storeOrdersAdminService.reviewIncident(orderId, incidentId, parseBody(reviewDeliveryIncidentSchema, body), user);
  }

  @Patch(':orderId/incidents/:incidentId/reschedule')
  @RequirePermissions('store_orders.reschedule')
  rescheduleIncident(
    @Param('orderId') orderId: string,
    @Param('incidentId') incidentId: string,
    @Body() body: unknown,
    @CurrentUser() user: InternalAuthUser,
  ) {
    return this.storeOrdersAdminService.rescheduleIncident(orderId, incidentId, parseBody(rescheduleDeliveryIncidentSchema, body), user);
  }

  @Patch(':orderId/incidents/:incidentId/change-address')
  @RequirePermissions('store_orders.reschedule')
  changeIncidentAddress(
    @Param('orderId') orderId: string,
    @Param('incidentId') incidentId: string,
    @Body() body: unknown,
    @CurrentUser() user: InternalAuthUser,
  ) {
    return this.storeOrdersAdminService.changeIncidentAddress(orderId, incidentId, parseBody(changeAddressDeliveryIncidentSchema, body), user);
  }

  @Patch(':orderId/incidents/:incidentId/cancel-order')
  @RequirePermissions('store_orders.cancel')
  cancelAfterIncident(
    @Param('orderId') orderId: string,
    @Param('incidentId') incidentId: string,
    @Body() body: unknown,
    @CurrentUser() user: InternalAuthUser,
  ) {
    return this.storeOrdersAdminService.cancelAfterIncident(orderId, incidentId, parseBody(cancelAfterIncidentSchema, body), user);
  }
}
