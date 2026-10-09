import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { CurrentUser } from '../auth/current-user.decorator';
import { CurrentCustomer } from '../auth/current-customer.decorator';
import { CustomerJwtAuthGuard } from '../auth/customer-jwt-auth.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/require-permissions.decorator';
import { CustomerAuthUser, InternalAuthUser } from '../auth/auth.types';
import { parseBody } from '../common/parse-body';
import { bannerEventSchema, createMarketingBannerSchema, updateMarketingBannerSchema } from './marketing-banner.schemas';
import { MarketingBannersService } from './marketing-banners.service';

@Controller('marketing-banners')
export class MarketingBannersController {
  constructor(private readonly marketingBannersService: MarketingBannersService) {}

  @Get('public')
  @UseGuards(CustomerJwtAuthGuard)
  listPublic(@CurrentCustomer() customer: CustomerAuthUser, @Query('placement') placement: string | undefined) {
    return this.marketingBannersService.listPublic(customer, placement);
  }

  @Post('public/:id/view')
  @UseGuards(CustomerJwtAuthGuard)
  recordView(@Param('id') id: string, @Body() body: unknown, @CurrentCustomer() customer: CustomerAuthUser) {
    return this.marketingBannersService.recordView(id, parseBody(bannerEventSchema, body ?? {}), customer);
  }

  @Post('public/:id/click')
  @UseGuards(CustomerJwtAuthGuard)
  recordClick(@Param('id') id: string, @Body() body: unknown, @CurrentCustomer() customer: CustomerAuthUser) {
    return this.marketingBannersService.recordClick(id, parseBody(bannerEventSchema, body ?? {}), customer);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('marketing.read')
  listAdmin(@Query() query: Record<string, string | undefined>) {
    return this.marketingBannersService.listAdmin(query);
  }

  @Get('next-sort-order')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('marketing.read')
  getNextSortOrder(
    @Query('audienceType') audienceType: string | undefined,
    @Query('brandIds') brandIds: string | undefined,
    @Query('placement') placement: string | undefined,
    @Query('excludeId') excludeId: string | undefined,
  ) {
    const normalizedAudience = audienceType === 'BRANDS' ? 'BRANDS' : 'ALL';
    const normalizedBrandIds = brandIds ? brandIds.split(',').filter(Boolean) : [];
    return this.marketingBannersService
      .getNextSortOrder(normalizedAudience, normalizedBrandIds, placement, excludeId || undefined)
      .then((sortOrder) => ({ sortOrder }));
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('marketing.read')
  get(@Param('id') id: string) {
    return this.marketingBannersService.get(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('marketing.manage')
  create(@Body() body: unknown, @CurrentUser() user: InternalAuthUser, @Req() request: FastifyRequest) {
    return this.marketingBannersService.create(parseBody(createMarketingBannerSchema, body), user, request);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('marketing.manage')
  update(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: InternalAuthUser, @Req() request: FastifyRequest) {
    return this.marketingBannersService.update(id, parseBody(updateMarketingBannerSchema, body), user, request);
  }
}
