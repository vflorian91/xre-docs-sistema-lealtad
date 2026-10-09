import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PointsModule } from '../points/points.module';
import { SettingsModule } from '../settings/settings.module';
import { ClientController } from './client.controller';
import { ClientService } from './client.service';

@Module({
  imports: [AuditModule, AuthModule, NotificationsModule, PointsModule, SettingsModule],
  controllers: [ClientController],
  providers: [ClientService],
})
export class ClientModule {}
