import { Controller, Get, Header, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { RequirePermissions } from '../../auth/require-permissions.decorator';
import { StoreReportsAdminService } from './store-reports-admin.service';

type ReportQuery = Record<string, string | undefined>;

@Controller('admin/store/reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StoreReportsAdminController {
  constructor(private readonly reportsService: StoreReportsAdminService) {}

  @Get('summary')
  @RequirePermissions('store_reports.read')
  summary(@Query() query: ReportQuery) {
    return this.reportsService.getSummary(query);
  }

  @Get('sales')
  @RequirePermissions('store_reports.sales')
  sales(@Query() query: ReportQuery) {
    return this.reportsService.getSales(query);
  }

  @Get('payments')
  @RequirePermissions('store_reports.payments')
  payments(@Query() query: ReportQuery) {
    return this.reportsService.getPayments(query);
  }

  @Get('settlements')
  @RequirePermissions('store_reports.settlements')
  settlements(@Query() query: ReportQuery) {
    return this.reportsService.getSettlements(query);
  }

  @Get('deliveries')
  @RequirePermissions('store_reports.deliveries')
  deliveries(@Query() query: ReportQuery) {
    return this.reportsService.getDeliveries(query);
  }

  @Get('products')
  @RequirePermissions('store_reports.products')
  products(@Query() query: ReportQuery) {
    return this.reportsService.getProducts(query);
  }

  @Get('customers')
  @RequirePermissions('store_reports.customers')
  customers(@Query() query: ReportQuery) {
    return this.reportsService.getCustomers(query);
  }

  @Get('export')
  @RequirePermissions('store_reports.export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  export(@Query('report') report: string, @Query() query: ReportQuery) {
    return this.reportsService.exportCsv(report, query);
  }
}
