import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/require-permissions.decorator';
import { InternalAuthUser } from '../auth/auth.types';
import { parseBody } from '../common/parse-body';
import { createPointRuleSchema, listPointRulesSchema } from './point-rule.schemas';
import { PointRulesService } from './point-rules.service';

@Controller('points/rules')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PointRulesController {
  constructor(private readonly pointRulesService: PointRulesService) {}

  @Get()
  @RequirePermissions('settings.read')
  listRules(@Query() query: unknown) {
    return this.pointRulesService.listRules(parseBody(listPointRulesSchema, query));
  }

  @Get('active')
  @RequirePermissions('settings.read')
  getActiveRule() {
    return this.pointRulesService.getActiveRule();
  }

  @Get(':id')
  @RequirePermissions('settings.read')
  getRule(@Param('id') id: string) {
    return this.pointRulesService.getRule(id);
  }

  @Post()
  @RequirePermissions('settings.manage')
  createRule(@Body() body: unknown, @CurrentUser() user: InternalAuthUser, @Req() request: FastifyRequest) {
    return this.pointRulesService.createRule(parseBody(createPointRuleSchema, body), user, request);
  }

  @Post(':id/activate')
  @RequirePermissions('settings.manage')
  activateRule(@Param('id') id: string, @CurrentUser() user: InternalAuthUser, @Req() request: FastifyRequest) {
    return this.pointRulesService.activateRule(id, user, request);
  }

}
