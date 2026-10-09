import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { InternalUsersController } from './internal-users.controller';
import { InternalUsersService } from './internal-users.service';

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [InternalUsersController],
  providers: [InternalUsersService],
})
export class InternalUsersModule {}
