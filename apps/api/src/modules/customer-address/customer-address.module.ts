import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CustomerAddressController } from './customer-address.controller';
import { CustomerAddressService } from './customer-address.service';

@Module({
  imports: [AuthModule],
  controllers: [CustomerAddressController],
  providers: [CustomerAddressService],
  exports: [CustomerAddressService],
})
export class CustomerAddressModule {}
