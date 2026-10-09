import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { MediaModule } from '../media/media.module';
import { HealthService } from './health.service';

@Module({
  imports: [MediaModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
