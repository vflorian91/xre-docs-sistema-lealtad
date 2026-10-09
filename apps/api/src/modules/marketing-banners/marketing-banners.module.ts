import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MarketingBannersController } from './marketing-banners.controller';
import { MarketingBannersService } from './marketing-banners.service';

@Module({
  imports: [AuditModule, AuthModule, NotificationsModule],
  controllers: [MarketingBannersController],
  providers: [MarketingBannersService],
})
export class MarketingBannersModule {}
