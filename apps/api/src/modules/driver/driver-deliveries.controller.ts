import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentDriver } from '../auth/current-driver.decorator';
import { DriverAuthUser } from '../auth/auth.types';
import { parseBody } from '../common/parse-body';
import { confirmDeliverySchema, failedDeliverySchema, markPickedUpSchema, reportIncidentSchema } from './driver.schemas';
import { STORE_DELIVERY_INCIDENT_TYPES } from '../store-catalog/order/store-order.constants';
import { MediaService } from '../media/media.service';
import { uploadCustomerProfilePhotoSchema } from '../media/media.schemas';
import { DriverJwtAuthGuard } from './driver-jwt-auth.guard';
import { DriverDeliveriesService } from './driver-deliveries.service';

@Controller('driver')
@UseGuards(DriverJwtAuthGuard)
export class DriverDeliveriesController {
  constructor(
    private readonly driverDeliveriesService: DriverDeliveriesService,
    private readonly mediaService: MediaService,
  ) {}

  @Get('dashboard')
  dashboard(@CurrentDriver() driver: DriverAuthUser) {
    return this.driverDeliveriesService.dashboard(driver);
  }

  @Get('deliveries')
  list(@CurrentDriver() driver: DriverAuthUser, @Query() query: Record<string, string | undefined>) {
    return this.driverDeliveriesService.list(driver, query);
  }

  @Get('pickup-stops')
  pickupStops(@CurrentDriver() driver: DriverAuthUser) {
    return this.driverDeliveriesService.pickupStops(driver);
  }

  @Get('deliveries/:orderId')
  get(@CurrentDriver() driver: DriverAuthUser, @Param('orderId') orderId: string) {
    return this.driverDeliveriesService.get(driver, orderId);
  }

  @Get('deliveries/:orderId/pickup')
  getPickup(@CurrentDriver() driver: DriverAuthUser, @Param('orderId') orderId: string) {
    return this.driverDeliveriesService.getPickup(driver, orderId);
  }

  @Patch('deliveries/:orderId/items/:itemId/mark-picked-up')
  markPickedUp(
    @CurrentDriver() driver: DriverAuthUser,
    @Param('orderId') orderId: string,
    @Param('itemId') itemId: string,
    @Body() body: unknown,
  ) {
    return this.driverDeliveriesService.markPickedUp(driver, orderId, itemId, parseBody(markPickedUpSchema, body));
  }

  @Post('deliveries/:orderId/complete-pickup')
  completePickup(@CurrentDriver() driver: DriverAuthUser, @Param('orderId') orderId: string) {
    return this.driverDeliveriesService.completePickup(driver, orderId);
  }

  @Post('deliveries/:orderId/start-route')
  startRoute(@CurrentDriver() driver: DriverAuthUser, @Param('orderId') orderId: string) {
    return this.driverDeliveriesService.startRoute(driver, orderId);
  }

  @Post('deliveries/:orderId/confirm-delivery')
  confirmDelivery(@CurrentDriver() driver: DriverAuthUser, @Param('orderId') orderId: string, @Body() body: unknown) {
    return this.driverDeliveriesService.confirmDelivery(driver, orderId, parseBody(confirmDeliverySchema, body));
  }

  @Post('deliveries/:orderId/failed-delivery')
  failedDelivery(@CurrentDriver() driver: DriverAuthUser, @Param('orderId') orderId: string, @Body() body: unknown) {
    return this.driverDeliveriesService.failedDelivery(driver, orderId, parseBody(failedDeliverySchema, body));
  }

  @Get('incident-types')
  incidentTypes() {
    return STORE_DELIVERY_INCIDENT_TYPES;
  }

  @Post('deliveries/:orderId/incident')
  reportIncident(@CurrentDriver() driver: DriverAuthUser, @Param('orderId') orderId: string, @Body() body: unknown) {
    return this.driverDeliveriesService.reportIncident(driver, orderId, parseBody(reportIncidentSchema, body));
  }

  @Get('history')
  history(@CurrentDriver() driver: DriverAuthUser) {
    return this.driverDeliveriesService.history(driver);
  }

  @Get('profile')
  profile(@CurrentDriver() driver: DriverAuthUser) {
    return this.driverDeliveriesService.profile(driver);
  }

  @Post('profile/photo')
  uploadProfilePhoto(@CurrentDriver() driver: DriverAuthUser, @Body() body: unknown) {
    return this.mediaService.uploadDriverProfilePhoto(parseBody(uploadCustomerProfilePhotoSchema, body), driver.id);
  }

  @Get('settlements')
  settlements(@CurrentDriver() driver: DriverAuthUser) {
    return this.driverDeliveriesService.settlements(driver);
  }

  @Get('notifications')
  notifications(@CurrentDriver() driver: DriverAuthUser) {
    return this.driverDeliveriesService.listNotifications(driver);
  }

  @Get('notifications/unread-count')
  notificationsUnread(@CurrentDriver() driver: DriverAuthUser) {
    return this.driverDeliveriesService.unreadNotificationsCount(driver);
  }

  @Post('notifications/:notificationId/read')
  markNotificationRead(@CurrentDriver() driver: DriverAuthUser, @Param('notificationId') notificationId: string) {
    return this.driverDeliveriesService.markNotificationRead(driver, notificationId);
  }

  @Post('notifications/read-all')
  markAllNotificationsRead(@CurrentDriver() driver: DriverAuthUser) {
    return this.driverDeliveriesService.markAllNotificationsRead(driver);
  }
}
