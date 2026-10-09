import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { CustomerJwtAuthGuard } from '../../auth/customer-jwt-auth.guard';
import { StoreProductsService } from './store-products.service';

@Controller('pwa-client/store/products')
@UseGuards(CustomerJwtAuthGuard)
export class StoreProductsPublicController {
  constructor(private readonly storeProductsService: StoreProductsService) {}

  @Get()
  list() {
    return this.storeProductsService.listPublic();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.storeProductsService.getPublic(id);
  }
}
