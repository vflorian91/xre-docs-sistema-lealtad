import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../auth/current-user.decorator';
import { InternalAuthUser } from '../../auth/auth.types';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { RequirePermissions } from '../../auth/require-permissions.decorator';
import { parseBody } from '../../common/parse-body';
import {
  assignStoreDeliveryDriverSchema,
  cancelStoreDeliveryScheduleSchema,
  changeStoreDeliveryDriverSchema,
  programStoreDeliverySchema,
  rescheduleStoreDeliverySchema,
} from './store-delivery-schedule.schemas';
import { StoreDeliveryScheduleService } from './store-delivery-schedule.service';

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StoreDeliveryScheduleAdminController {
  constructor(private readonly deliveryScheduleService: StoreDeliveryScheduleService) {}

  @Get('admin/store/delivery-schedule')
  @RequirePermissions('store_delivery_schedule.read')
  list(@Query() query: Record<string, string | undefined>) {
    return this.deliveryScheduleService.list(query);
  }

  @Get('admin/store/delivery-schedule/day/:date')
  @RequirePermissions('store_delivery_schedule.read')
  listDay(@Param('date') date: string) {
    return this.deliveryScheduleService.listDay(date);
  }

  @Post('admin/store/orders/:orderId/delivery/program')
  @RequirePermissions('store_delivery_schedule.program')
  program(@Param('orderId') orderId: string, @Body() body: unknown, @CurrentUser() user: InternalAuthUser) {
    return this.deliveryScheduleService.program(orderId, parseBody(programStoreDeliverySchema, body), user);
  }

  @Post('admin/store/orders/:orderId/delivery/reschedule')
  @RequirePermissions('store_delivery_schedule.reschedule')
  reschedule(@Param('orderId') orderId: string, @Body() body: unknown, @CurrentUser() user: InternalAuthUser) {
    return this.deliveryScheduleService.reschedule(orderId, parseBody(rescheduleStoreDeliverySchema, body), user);
  }

  @Post('admin/store/orders/:orderId/delivery/assign-driver')
  @RequirePermissions('store_delivery_schedule.assign')
  assignDriver(@Param('orderId') orderId: string, @Body() body: unknown, @CurrentUser() user: InternalAuthUser) {
    return this.deliveryScheduleService.assignDriver(orderId, parseBody(assignStoreDeliveryDriverSchema, body), user);
  }

  @Post('admin/store/orders/:orderId/delivery/change-driver')
  @RequirePermissions('store_delivery_schedule.assign')
  changeDriver(@Param('orderId') orderId: string, @Body() body: unknown, @CurrentUser() user: InternalAuthUser) {
    return this.deliveryScheduleService.changeDriver(orderId, parseBody(changeStoreDeliveryDriverSchema, body), user);
  }

  @Post('admin/store/orders/:orderId/delivery/cancel-schedule')
  @RequirePermissions('store_delivery_schedule.cancel')
  cancelSchedule(@Param('orderId') orderId: string, @Body() body: unknown, @CurrentUser() user: InternalAuthUser) {
    return this.deliveryScheduleService.cancelSchedule(orderId, parseBody(cancelStoreDeliveryScheduleSchema, body), user);
  }
}
