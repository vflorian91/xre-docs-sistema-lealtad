import { Module } from '@nestjs/common';
import { LoyaltyLevelsModule } from '../../loyalty-levels/loyalty-levels.module';
import { NotificationsModule } from '../../notifications/notifications.module';
import { PointsModule } from '../../points/points.module';
import { StoreOrderLoyaltyService } from './store-order-loyalty.service';

@Module({
  imports: [PointsModule, LoyaltyLevelsModule, NotificationsModule],
  providers: [StoreOrderLoyaltyService],
  exports: [StoreOrderLoyaltyService],
})
export class StoreOrderLoyaltyModule {}
