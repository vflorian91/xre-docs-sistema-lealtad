import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentCustomer } from '../auth/current-customer.decorator';
import { CustomerJwtAuthGuard } from '../auth/customer-jwt-auth.guard';
import { CustomerAuthUser } from '../auth/auth.types';
import { parseBody } from '../common/parse-body';
import { CustomerAddressService } from './customer-address.service';
import { createCustomerAddressSchema, updateCustomerAddressSchema } from './customer-address.schemas';

@Controller('pwa-client/customer/addresses')
@UseGuards(CustomerJwtAuthGuard)
export class CustomerAddressController {
  constructor(private readonly addressService: CustomerAddressService) {}

  @Get()
  list(@CurrentCustomer() customer: CustomerAuthUser) {
    return this.addressService.list(customer.id);
  }

  @Post()
  create(@Body() body: unknown, @CurrentCustomer() customer: CustomerAuthUser) {
    return this.addressService.create(customer.id, parseBody(createCustomerAddressSchema, body));
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentCustomer() customer: CustomerAuthUser) {
    return this.addressService.get(customer.id, id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: unknown, @CurrentCustomer() customer: CustomerAuthUser) {
    return this.addressService.update(customer.id, id, parseBody(updateCustomerAddressSchema, body));
  }

  @Patch(':id/default')
  setDefault(@Param('id') id: string, @CurrentCustomer() customer: CustomerAuthUser) {
    return this.addressService.setDefault(customer.id, id);
  }

  @Patch(':id/inactivate')
  inactivate(@Param('id') id: string, @CurrentCustomer() customer: CustomerAuthUser) {
    return this.addressService.inactivate(customer.id, id);
  }
}
