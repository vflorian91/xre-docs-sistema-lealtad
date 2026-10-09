import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { SettingsModule } from '../settings/settings.module';
import { PromotionalBalanceController } from './promotional-balance.controller';
import { PromotionalBalanceService } from './promotional-balance.service';

@Module({
  imports: [AuditModule, AuthModule, SettingsModule],
  controllers: [PromotionalBalanceController],
  providers: [PromotionalBalanceService],
  exports: [PromotionalBalanceService],
})
export class PromotionalBalanceModule {}
