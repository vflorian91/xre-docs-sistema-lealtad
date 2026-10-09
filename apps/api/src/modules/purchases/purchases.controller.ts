import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/require-permissions.decorator';
import { InternalAuthUser } from '../auth/auth.types';
import { parseBody } from '../common/parse-body';
import { approvePurchaseSchema, purchaseEntrySchema, purchaseSearchSchema, rejectPurchaseSchema, reversePurchaseSchema } from './purchase.schemas';
import { PurchasesService } from './purchases.service';

@Controller('purchases')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Post('preview')
  @RequirePermissions('purchases.create')
  preview(@Body() body: unknown, @CurrentUser() user: InternalAuthUser) {
    return this.purchasesService.preview(parseBody(purchaseEntrySchema, body), user);
  }

  @Post()
  @RequirePermissions('purchases.create')
  create(@Body() body: unknown, @CurrentUser() user: InternalAuthUser, @Req() request: FastifyRequest) {
    return this.purchasesService.create(parseBody(purchaseEntrySchema, body), user, request);
  }

  @Get()
  @RequirePermissions('purchases.read')
  search(@Query() query: unknown, @CurrentUser() user: InternalAuthUser) {
    return this.purchasesService.search(parseBody(purchaseSearchSchema, query), user);
  }

  @Get(':id')
  @RequirePermissions('purchases.read')
  get(@Param('id') id: string, @CurrentUser() user: InternalAuthUser) {
    return this.purchasesService.get(id, user);
  }

  @Post(':id/reverse')
  @RequirePermissions('purchases.reverse')
  reverse(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: InternalAuthUser,
    @Req() request: FastifyRequest,
  ) {
    return this.purchasesService.reverse(id, parseBody(reversePurchaseSchema, body), user, request);
  }

  @Post(':id/approve')
  @RequirePermissions('purchases.review')
  approve(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: InternalAuthUser,
    @Req() request: FastifyRequest,
  ) {
    return this.purchasesService.approve(id, parseBody(approvePurchaseSchema, body), user, request);
  }

  @Post(':id/reject')
  @RequirePermissions('purchases.review')
  reject(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: InternalAuthUser,
    @Req() request: FastifyRequest,
  ) {
    return this.purchasesService.reject(id, parseBody(rejectPurchaseSchema, body), user, request);
  }
}
