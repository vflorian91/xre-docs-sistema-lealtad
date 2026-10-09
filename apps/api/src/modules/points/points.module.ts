import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PointAdjustmentsController } from './point-adjustments.controller';
import { PointPromotionsController, PointPromotionsDiscoveryController } from './point-promotions.controller';
import { PointPromotionsService } from './point-promotions.service';
import { PointRulesController } from './point-rules.controller';
import { PointRulesService } from './point-rules.service';

@Module({
  imports: [AuditModule, AuthModule, NotificationsModule],
  controllers: [PointRulesController, PointPromotionsDiscoveryController, PointPromotionsController, PointAdjustmentsController],
  providers: [PointRulesService, PointPromotionsService],
  exports: [PointRulesService, PointPromotionsService],
})
export class PointsModule {}
