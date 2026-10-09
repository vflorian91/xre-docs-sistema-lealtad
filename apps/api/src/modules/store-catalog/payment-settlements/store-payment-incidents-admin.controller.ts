import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../auth/current-user.decorator';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { RequirePermissions } from '../../auth/require-permissions.decorator';
import { InternalAuthUser } from '../../auth/auth.types';
import { parseBody } from '../../common/parse-body';
import {
  markStorePaymentSettlementIncidentSchema,
  releaseStorePaymentSettlementIncidentSchema,
} from './store-payment-settlement.schemas';
import { StorePaymentSettlementsAdminService } from './store-payment-settlements-admin.service';

@Controller('admin/store/payments/:paymentId')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StorePaymentIncidentsAdminController {
  constructor(private readonly settlementsService: StorePaymentSettlementsAdminService) {}

  @Post('settlement-incident')
  @RequirePermissions('store_payment_settlements.incidents')
  markIncident(@Param('paymentId') paymentId: string, @Body() body: unknown, @CurrentUser() user: InternalAuthUser) {
    return this.settlementsService.markIncident(paymentId, parseBody(markStorePaymentSettlementIncidentSchema, body), user);
  }

  @Post('release-incident')
  @RequirePermissions('store_payment_settlements.incidents')
  releaseIncident(@Param('paymentId') paymentId: string, @Body() body: unknown, @CurrentUser() user: InternalAuthUser) {
    return this.settlementsService.releaseIncident(paymentId, parseBody(releaseStorePaymentSettlementIncidentSchema, body), user);
  }
}
