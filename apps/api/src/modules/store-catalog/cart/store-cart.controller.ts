import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentCustomer } from '../../auth/current-customer.decorator';
import { CustomerJwtAuthGuard } from '../../auth/customer-jwt-auth.guard';
import { CustomerAuthUser } from '../../auth/auth.types';
import { parseBody } from '../../common/parse-body';
import { addStoreCartItemSchema, updateStoreCartItemSchema } from './store-cart.schemas';
import { StoreCartService } from './store-cart.service';

@Controller('pwa-client/store/cart')
@UseGuards(CustomerJwtAuthGuard)
export class StoreCartController {
  constructor(private readonly storeCartService: StoreCartService) {}

  @Get()
  getCart(@CurrentCustomer() customer: CustomerAuthUser) {
    return this.storeCartService.getCart(customer);
  }

  @Post('items')
  addItem(@Body() body: unknown, @CurrentCustomer() customer: CustomerAuthUser) {
    return this.storeCartService.addItem(customer, parseBody(addStoreCartItemSchema, body));
  }

  @Patch('items/:itemId')
  updateItem(@Param('itemId') itemId: string, @Body() body: unknown, @CurrentCustomer() customer: CustomerAuthUser) {
    return this.storeCartService.updateItem(customer, itemId, parseBody(updateStoreCartItemSchema, body));
  }

  @Delete('items/:itemId')
  removeItem(@Param('itemId') itemId: string, @CurrentCustomer() customer: CustomerAuthUser) {
    return this.storeCartService.removeItem(customer, itemId);
  }

  @Delete()
  clearCart(@CurrentCustomer() customer: CustomerAuthUser) {
    return this.storeCartService.clearCart(customer);
  }
}
