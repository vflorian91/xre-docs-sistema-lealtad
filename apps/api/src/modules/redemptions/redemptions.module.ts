import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { SettingsModule } from '../settings/settings.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RedemptionsController } from './redemptions.controller';
import { RedemptionsService } from './redemptions.service';

@Module({
  imports: [AuditModule, AuthModule, SettingsModule, NotificationsModule],
  controllers: [RedemptionsController],
  providers: [RedemptionsService],
})
export class RedemptionsModule {}
