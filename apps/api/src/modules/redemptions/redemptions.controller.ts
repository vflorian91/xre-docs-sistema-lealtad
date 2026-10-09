import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { z } from 'zod';
import { CurrentCustomer } from '../auth/current-customer.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { CustomerJwtAuthGuard } from '../auth/customer-jwt-auth.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/require-permissions.decorator';
import { CustomerAuthUser, InternalAuthUser } from '../auth/auth.types';
import { parseBody } from '../common/parse-body';
import {
  cancelRedemptionSchema,
  confirmDeliverySchema,
  deliverRedemptionSchema,
  listRedemptionsSchema,
  redeemPointsByAmountSchema,
  rejectRedemptionSchema,
  requestRedemptionSchema,
  transitionCommentSchema,
} from './redemption.schemas';
import { RedemptionsService } from './redemptions.service';

const zIdSchema = z.string().trim().min(1, 'Identificador invalido.');

@Controller('redemptions')
export class RedemptionsController {
  constructor(private readonly redemptionsService: RedemptionsService) {}

  @Get('customer')
  @UseGuards(CustomerJwtAuthGuard)
  listCustomer(@CurrentCustomer() customer: CustomerAuthUser) {
    return this.redemptionsService.listCustomer(customer);
  }

  @Post('customer/request')
  @UseGuards(CustomerJwtAuthGuard)
  request(@Body() body: unknown, @CurrentCustomer() customer: CustomerAuthUser, @Req() request: FastifyRequest) {
    return this.redemptionsService.request(parseBody(requestRedemptionSchema, body), customer, request);
  }

  @Post('customer/:id/cancel')
  @UseGuards(CustomerJwtAuthGuard)
  cancelCustomer(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentCustomer() customer: CustomerAuthUser,
    @Req() request: FastifyRequest,
  ) {
    return this.redemptionsService.cancelCustomer(parseBody(zIdSchema, id), parseBody(cancelRedemptionSchema, body), customer, request);
  }

  @Post('customer/confirm-delivery')
  @UseGuards(CustomerJwtAuthGuard)
  confirmDelivery(@Body() body: unknown, @CurrentCustomer() customer: CustomerAuthUser, @Req() request: FastifyRequest) {
    return this.redemptionsService.confirmDeliveryByCustomer(parseBody(confirmDeliverySchema, body), customer, request);
  }

  @Post('points')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('redemption_requests.redeem_points')
  redeemPointsByAmount(@Body() body: unknown, @CurrentUser() user: InternalAuthUser, @Req() request: FastifyRequest) {
    return this.redemptionsService.redeemPointsByAmount(parseBody(redeemPointsByAmountSchema, body), user, request);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('redemption_requests.read')
  list(@Query() query: unknown, @CurrentUser() user: InternalAuthUser) {
    return this.redemptionsService.listAdmin(parseBody(listRedemptionsSchema, query), user);
  }

  @Get('validate/:code')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('redemption_requests.read')
  validateCode(@Param('code') code: string, @CurrentUser() user: InternalAuthUser) {
    return this.redemptionsService.validateCode(parseBody(zIdSchema, code), user);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('redemption_requests.read')
  get(@Param('id') id: string, @CurrentUser() user: InternalAuthUser) {
    return this.redemptionsService.get(parseBody(zIdSchema, id), user);
  }

  @Post(':id/reject')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('redemption_requests.reject')
  reject(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: InternalAuthUser, @Req() request: FastifyRequest) {
    return this.redemptionsService.reject(parseBody(zIdSchema, id), parseBody(rejectRedemptionSchema, body), user, request);
  }

  @Post(':id/approve')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('redemption_requests.approve')
  approve(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: InternalAuthUser, @Req() request: FastifyRequest) {
    return this.redemptionsService.approve(parseBody(zIdSchema, id), parseBody(transitionCommentSchema, body ?? {}), user, request);
  }

  @Post(':id/send-to-store')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('redemption_requests.mark_sent_to_store')
  markSentToStore(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: InternalAuthUser, @Req() request: FastifyRequest) {
    return this.redemptionsService.markSentToStore(parseBody(zIdSchema, id), parseBody(transitionCommentSchema, body ?? {}), user, request);
  }

  @Post(':id/ready')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('redemption_requests.mark_ready')
  markReady(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: InternalAuthUser, @Req() request: FastifyRequest) {
    return this.redemptionsService.markReady(parseBody(zIdSchema, id), parseBody(transitionCommentSchema, body ?? {}), user, request);
  }

  @Post(':id/deliver')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('redemption_requests.mark_delivered')
  markDelivered(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: InternalAuthUser, @Req() request: FastifyRequest) {
    return this.redemptionsService.markDelivered(parseBody(zIdSchema, id), parseBody(deliverRedemptionSchema, body ?? {}), user, request);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('redemption_requests.cancel')
  cancelInternal(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: InternalAuthUser,
    @Req() request: FastifyRequest,
  ) {
    return this.redemptionsService.cancelInternal(parseBody(zIdSchema, id), parseBody(cancelRedemptionSchema, body), user, request);
  }
}
