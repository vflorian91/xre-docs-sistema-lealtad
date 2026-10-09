import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/require-permissions.decorator';
import { InternalAuthUser } from '../auth/auth.types';
import { parseBody } from '../common/parse-body';
import {
  convertPointsToBalanceSchema,
  createPromotionalCreditSchema,
  usePromotionalBalanceSchema,
} from './promotional-balance.schemas';
import { PromotionalBalanceService } from './promotional-balance.service';

@Controller('promotional-balance')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PromotionalBalanceController {
  constructor(private readonly promotionalBalanceService: PromotionalBalanceService) {}

  @Get('customers/:customerId')
  @RequirePermissions('points.read')
  getCustomerBalance(@Param('customerId') customerId: string) {
    return this.promotionalBalanceService.getCustomerBalance(customerId);
  }

  @Post('credits')
  @RequirePermissions('points.manage')
  createCredit(@Body() body: unknown, @CurrentUser() user: InternalAuthUser, @Req() request: FastifyRequest) {
    return this.promotionalBalanceService.createCredit(parseBody(createPromotionalCreditSchema, body), user, request);
  }

  @Post('convert-points')
  @RequirePermissions('points.manage')
  convertPoints(@Body() body: unknown, @CurrentUser() user: InternalAuthUser, @Req() request: FastifyRequest) {
    return this.promotionalBalanceService.convertPoints(parseBody(convertPointsToBalanceSchema, body), user, request);
  }

  @Post('use')
  @RequirePermissions('purchases.create')
  useBalance(@Body() body: unknown, @CurrentUser() user: InternalAuthUser, @Req() request: FastifyRequest) {
    return this.promotionalBalanceService.useBalance(parseBody(usePromotionalBalanceSchema, body), user, request);
  }
}
