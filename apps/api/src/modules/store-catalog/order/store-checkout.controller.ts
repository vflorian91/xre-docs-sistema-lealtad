import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CurrentCustomer } from '../../auth/current-customer.decorator';
import { CustomerJwtAuthGuard } from '../../auth/customer-jwt-auth.guard';
import { CustomerAuthUser } from '../../auth/auth.types';
import { parseBody } from '../../common/parse-body';
import { checkoutPreviewSchema } from './store-order.schemas';
import { StoreOrdersService } from './store-orders.service';

@Controller('pwa-client/store/checkout')
@UseGuards(CustomerJwtAuthGuard)
export class StoreCheckoutController {
  constructor(private readonly storeOrdersService: StoreOrdersService) {}

  @Post('preview')
  preview(@Body() body: unknown, @CurrentCustomer() customer: CustomerAuthUser) {
    return this.storeOrdersService.buildCheckoutPreview(customer, parseBody(checkoutPreviewSchema, body));
  }
}
