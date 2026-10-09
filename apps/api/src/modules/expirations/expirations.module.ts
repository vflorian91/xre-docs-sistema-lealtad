import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ExpirationsService } from './expirations.service';

@Module({
  imports: [AuditModule, NotificationsModule],
  providers: [ExpirationsService],
  exports: [ExpirationsService],
})
export class ExpirationsModule {}
