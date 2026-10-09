import { Controller, Get, UseGuards } from '@nestjs/common';
import { CustomerJwtAuthGuard } from '../../auth/customer-jwt-auth.guard';
import { StoreBrandsService } from './store-brands.service';

@Controller('pwa-client/store/brands')
@UseGuards(CustomerJwtAuthGuard)
export class StoreBrandsPublicController {
  constructor(private readonly storeBrandsService: StoreBrandsService) {}

  @Get()
  list() {
    return this.storeBrandsService.listActiveForClient();
  }
}
