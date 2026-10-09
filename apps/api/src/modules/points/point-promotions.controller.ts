import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/require-permissions.decorator';
import { InternalAuthUser } from '../auth/auth.types';
import { parseBody } from '../common/parse-body';
import { createPointPromotionSchema, listPointPromotionsSchema } from './point-promotion.schemas';
import { PointPromotionsService } from './point-promotions.service';

@Controller('points/promotions')
@UseGuards(JwtAuthGuard)
export class PointPromotionsDiscoveryController {
  constructor(private readonly pointPromotionsService: PointPromotionsService) {}

  @Get('active')
  active(@CurrentUser() user: InternalAuthUser) {
    return this.pointPromotionsService.listActiveForUser(user);
  }
}

@Controller('points/promotions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PointPromotionsController {
  constructor(private readonly pointPromotionsService: PointPromotionsService) {}

  @Get()
  @RequirePermissions('settings.read')
  list(@Query() query: unknown) {
    return this.pointPromotionsService.list(parseBody(listPointPromotionsSchema, query));
  }

  @Get(':id')
  @RequirePermissions('settings.read')
  get(@Param('id') id: string) {
    return this.pointPromotionsService.get(id);
  }

  @Post()
  @RequirePermissions('settings.manage')
  create(@Body() body: unknown, @CurrentUser() user: InternalAuthUser, @Req() request: FastifyRequest) {
    return this.pointPromotionsService.create(parseBody(createPointPromotionSchema, body), user, request);
  }

  @Post(':id/finish')
  @RequirePermissions('settings.manage')
  finish(@Param('id') id: string, @CurrentUser() user: InternalAuthUser, @Req() request: FastifyRequest) {
    return this.pointPromotionsService.finish(id, user, request);
  }
}
