import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { z } from 'zod';
import { CurrentUser } from '../auth/current-user.decorator';
import { InternalAuthUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/require-permissions.decorator';
import { parseBody } from '../common/parse-body';
import { ExpirationsService } from '../expirations/expirations.service';
import { AdminService } from './admin.service';

const runExpirationsSchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(2000).optional(),
  })
  .strict();

@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly expirationsService: ExpirationsService,
  ) {}

  @Get('summary')
  @RequirePermissions('reports.read')
  summary() {
    return this.adminService.getSummary();
  }

  @Get('reports')
  @RequirePermissions('reports.read')
  reports(
    @CurrentUser() user: InternalAuthUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('storeId') storeId?: string,
  ) {
    return this.adminService.getReports({ from, to, storeId }, user);
  }

  @Get('dashboard-summary')
  @RequirePermissions('reports.read')
  dashboardSummary(@Query('month') month?: string) {
    return this.adminService.getDashboardMonthlySummary(month);
  }

  @Post('maintenance/expirations/run')
  @RequirePermissions('settings.manage')
  runExpirations(@Body() body: unknown, @CurrentUser() user: InternalAuthUser, @Req() request: FastifyRequest) {
    const input = parseBody(runExpirationsSchema, body ?? {});
    return this.expirationsService.run({
      limit: input.limit,
      actorInternalUserId: user.id,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });
  }
}
