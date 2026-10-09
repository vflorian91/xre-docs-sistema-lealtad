import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/require-permissions.decorator';
import { AuditService } from './audit.service';

@Controller('audit')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermissions('audit.read')
  listAuditLogs(
    @Query('module') module?: string,
    @Query('action') action?: string,
    @Query('actorType') actorType?: string,
    @Query('customerName') customerName?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ) {
    return this.auditService.listLogs({
      module,
      action,
      actorType,
      customerName,
      dateFrom,
      dateTo,
      limit: limit ? Number(limit) : undefined,
      page: page ? Number(page) : undefined,
    });
  }
}
