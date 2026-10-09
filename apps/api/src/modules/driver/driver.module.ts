import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { StoreOrderLoyaltyModule } from '../store-catalog/order/store-order-loyalty.module';
import { StoreOrderTimelineService } from '../store-catalog/order/store-order-timeline.service';
import { DriverAuthController } from './driver-auth.controller';
import { DriverAuthService } from './driver-auth.service';
import { DriverDeliveriesController } from './driver-deliveries.controller';
import { DriverDeliveriesService } from './driver-deliveries.service';
import { DriverJwtAuthGuard } from './driver-jwt-auth.guard';

@Module({
  imports: [AuthModule, NotificationsModule, MediaModule, StoreOrderLoyaltyModule],
  controllers: [DriverAuthController, DriverDeliveriesController],
  providers: [DriverAuthService, DriverDeliveriesService, DriverJwtAuthGuard, StoreOrderTimelineService],
})
export class DriverModule {}
