import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuditModule } from '../audit/audit.module';
import { AuthController, CustomerAuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { CustomerJwtAuthGuard } from './customer-jwt-auth.guard';

@Module({
  imports: [AuditModule, JwtModule.register({})],
  controllers: [AuthController, CustomerAuthController],
  providers: [AuthService, JwtAuthGuard, PermissionsGuard, CustomerJwtAuthGuard],
  exports: [AuthService, JwtAuthGuard, PermissionsGuard, CustomerJwtAuthGuard, JwtModule],
})
export class AuthModule {}
