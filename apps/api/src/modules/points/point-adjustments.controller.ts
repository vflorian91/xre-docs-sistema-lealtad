import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/require-permissions.decorator';
import { InternalAuthUser } from '../auth/auth.types';
import { parseBody } from '../common/parse-body';
import { createPointAdjustmentSchema } from './point-adjustment.schemas';
import { PointRulesService } from './point-rules.service';

@Controller('points/adjustments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PointAdjustmentsController {
  constructor(private readonly pointRulesService: PointRulesService) {}

  @Post()
  @RequirePermissions('points.manage')
  create(@Body() body: unknown, @CurrentUser() user: InternalAuthUser, @Req() request: FastifyRequest) {
    return this.pointRulesService.createAdjustment(parseBody(createPointAdjustmentSchema, body), user, request);
  }
}
