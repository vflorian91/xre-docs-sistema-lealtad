import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { CatalogsController } from './catalogs.controller';
import { CatalogsService } from './catalogs.service';

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [CatalogsController],
  providers: [CatalogsService],
})
export class CatalogsModule {}
