import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentCustomer } from '../../auth/current-customer.decorator';
import { CustomerJwtAuthGuard } from '../../auth/customer-jwt-auth.guard';
import { CustomerAuthUser } from '../../auth/auth.types';
import { parseBody } from '../../common/parse-body';
import { createStoreOrderSchema } from './store-order.schemas';
import { StoreOrdersService } from './store-orders.service';

@Controller('pwa-client/store/orders')
@UseGuards(CustomerJwtAuthGuard)
export class StoreOrdersController {
  constructor(private readonly storeOrdersService: StoreOrdersService) {}

  @Post()
  create(@Body() body: unknown, @CurrentCustomer() customer: CustomerAuthUser) {
    return this.storeOrdersService.createOrder(customer, parseBody(createStoreOrderSchema, body));
  }

  @Get()
  list(@CurrentCustomer() customer: CustomerAuthUser) {
    return this.storeOrdersService.listOrders(customer);
  }

  @Get(':orderId')
  get(@Param('orderId') orderId: string, @CurrentCustomer() customer: CustomerAuthUser) {
    return this.storeOrdersService.getOrder(customer, orderId);
  }
}
