import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { CurrentCustomer } from '../auth/current-customer.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { CustomerJwtAuthGuard } from '../auth/customer-jwt-auth.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/require-permissions.decorator';
import { CustomerAuthUser, InternalAuthUser } from '../auth/auth.types';
import { parseBody } from '../common/parse-body';
import { createRewardSchema, updateRewardSchema } from './reward.schemas';
import { RewardsService } from './rewards.service';

@Controller('rewards')
export class RewardsController {
  constructor(private readonly rewardsService: RewardsService) {}

  @Get('public')
  @UseGuards(CustomerJwtAuthGuard)
  listPublic(@CurrentCustomer() customer: CustomerAuthUser) {
    return this.rewardsService.listPublic(customer);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('redeemable_products.read')
  listAdmin(@Query() query: Record<string, string | undefined>) {
    return this.rewardsService.listAdmin(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('redeemable_products.read')
  get(@Param('id') id: string) {
    return this.rewardsService.get(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('redeemable_products.create')
  create(@Body() body: unknown, @CurrentUser() user: InternalAuthUser, @Req() request: FastifyRequest) {
    return this.rewardsService.create(parseBody(createRewardSchema, body), user, request);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('redeemable_products.edit')
  update(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: InternalAuthUser, @Req() request: FastifyRequest) {
    return this.rewardsService.update(id, parseBody(updateRewardSchema, body), user, request);
  }
}
