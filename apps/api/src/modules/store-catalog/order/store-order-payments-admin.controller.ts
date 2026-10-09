import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../auth/current-user.decorator';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { RequirePermissions } from '../../auth/require-permissions.decorator';
import { InternalAuthUser } from '../../auth/auth.types';
import { parseBody } from '../../common/parse-body';
import {
  confirmStoreOrderPaymentSchema,
  markStoreOrderPaymentNoPaidSchema,
  registerStoreOrderVisaLinkSchema,
  rejectStoreOrderPaymentSchema,
} from './store-order-payment-admin.schemas';
import { StoreOrderPaymentsAdminService } from './store-order-payments-admin.service';

@Controller('admin/store/orders/:orderId/payments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StoreOrderPaymentsAdminController {
  constructor(private readonly storeOrderPaymentsAdminService: StoreOrderPaymentsAdminService) {}

  @Post('visa-link')
  @RequirePermissions('store_orders.visa_link')
  registerVisaLink(@Param('orderId') orderId: string, @Body() body: unknown, @CurrentUser() user: InternalAuthUser) {
    return this.storeOrderPaymentsAdminService.registerVisaLink(orderId, parseBody(registerStoreOrderVisaLinkSchema, body), user);
  }

  @Post('confirm')
  @RequirePermissions('store_orders.payments')
  confirm(@Param('orderId') orderId: string, @Body() body: unknown, @CurrentUser() user: InternalAuthUser) {
    return this.storeOrderPaymentsAdminService.confirmPayment(orderId, parseBody(confirmStoreOrderPaymentSchema, body), user);
  }

  @Post('reject')
  @RequirePermissions('store_orders.payments')
  reject(@Param('orderId') orderId: string, @Body() body: unknown, @CurrentUser() user: InternalAuthUser) {
    return this.storeOrderPaymentsAdminService.rejectPayment(orderId, parseBody(rejectStoreOrderPaymentSchema, body), user);
  }

  @Post('no-paid')
  @RequirePermissions('store_orders.payments')
  noPaid(@Param('orderId') orderId: string, @Body() body: unknown, @CurrentUser() user: InternalAuthUser) {
    return this.storeOrderPaymentsAdminService.markNoPaid(orderId, parseBody(markStoreOrderPaymentNoPaidSchema, body), user);
  }
}
