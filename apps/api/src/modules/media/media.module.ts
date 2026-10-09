import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { StorageService } from './storage.service';

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [MediaController],
  providers: [MediaService, StorageService],
  exports: [StorageService, MediaService],
})
export class MediaModule {}
