import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
