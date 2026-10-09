import { Body, Controller, Get, Header, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../auth/current-user.decorator';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { RequirePermissions } from '../../auth/require-permissions.decorator';
import { InternalAuthUser } from '../../auth/auth.types';
import { parseBody } from '../../common/parse-body';
import {
  annulStorePaymentSettlementSchema,
  createStorePaymentSettlementSchema,
} from './store-payment-settlement.schemas';
import { StorePaymentSettlementsAdminService } from './store-payment-settlements-admin.service';

@Controller('admin/store/payment-settlements')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StorePaymentSettlementsAdminController {
  constructor(private readonly settlementsService: StorePaymentSettlementsAdminService) {}

  @Get('summary')
  @RequirePermissions('store_payment_settlements.read')
  summary() {
    return this.settlementsService.getSummary();
  }

  @Get('pending')
  @RequirePermissions('store_payment_settlements.read')
  pending(@Query() query: Record<string, string | undefined>) {
    return this.settlementsService.listPending(query);
  }

  @Get('export')
  @RequirePermissions('store_payment_settlements.export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="liquidaciones-cobros.csv"')
  async export(@Query() query: Record<string, string | undefined>) {
    const type = query.type === 'pending' ? 'pending' : 'settlements';
    return this.settlementsService.exportCsv(type, query);
  }

  @Get()
  @RequirePermissions('store_payment_settlements.read')
  list(@Query() query: Record<string, string | undefined>) {
    return this.settlementsService.listAdmin(query);
  }

  @Get(':settlementId')
  @RequirePermissions('store_payment_settlements.read')
  get(@Param('settlementId') settlementId: string) {
    return this.settlementsService.getAdmin(settlementId);
  }

  @Post()
  @RequirePermissions('store_payment_settlements.create')
  create(@Body() body: unknown, @CurrentUser() user: InternalAuthUser) {
    return this.settlementsService.create(parseBody(createStorePaymentSettlementSchema, body), user);
  }

  @Post(':settlementId/annul')
  @RequirePermissions('store_payment_settlements.annul')
  annul(@Param('settlementId') settlementId: string, @Body() body: unknown, @CurrentUser() user: InternalAuthUser) {
    return this.settlementsService.annul(settlementId, parseBody(annulStorePaymentSettlementSchema, body), user);
  }
}
