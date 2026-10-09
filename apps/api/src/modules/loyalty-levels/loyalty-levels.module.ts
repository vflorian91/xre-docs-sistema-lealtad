import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LoyaltyLevelsController } from './loyalty-levels.controller';
import { LoyaltyLevelsService } from './loyalty-levels.service';

@Global()
@Module({
  imports: [AuthModule],
  controllers: [LoyaltyLevelsController],
  providers: [LoyaltyLevelsService],
  exports: [LoyaltyLevelsService],
})
export class LoyaltyLevelsModule {}
