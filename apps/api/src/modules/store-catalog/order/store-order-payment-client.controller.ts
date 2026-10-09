import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentCustomer } from '../../auth/current-customer.decorator';
import { CustomerJwtAuthGuard } from '../../auth/customer-jwt-auth.guard';
import { CustomerAuthUser } from '../../auth/auth.types';
import { parseBody } from '../../common/parse-body';
import { StoreOrderPaymentClientService } from './store-order-payment-client.service';
import { registerCashSchema, reportDepositSchema, reportTransferSchema, reportVisaLinkSchema } from './store-order-payment-client.schemas';

@Controller('pwa-client/store/orders')
@UseGuards(CustomerJwtAuthGuard)
export class StoreOrderPaymentClientController {
  constructor(private readonly paymentService: StoreOrderPaymentClientService) {}

  @Post(':orderId/payment/deposit')
  reportDeposit(@Param('orderId') orderId: string, @Body() body: unknown, @CurrentCustomer() customer: CustomerAuthUser) {
    return this.paymentService.reportDeposit(customer, orderId, parseBody(reportDepositSchema, body));
  }

  @Post(':orderId/payment/transfer')
  reportTransfer(@Param('orderId') orderId: string, @Body() body: unknown, @CurrentCustomer() customer: CustomerAuthUser) {
    return this.paymentService.reportTransfer(customer, orderId, parseBody(reportTransferSchema, body));
  }

  @Post(':orderId/payment/visa-link/request')
  requestVisaLink(@Param('orderId') orderId: string, @CurrentCustomer() customer: CustomerAuthUser) {
    return this.paymentService.requestVisaLink(customer, orderId);
  }

  @Get(':orderId/payment/visa-link')
  getVisaLink(@Param('orderId') orderId: string, @CurrentCustomer() customer: CustomerAuthUser) {
    return this.paymentService.getVisaLink(customer, orderId);
  }

  @Post(':orderId/payment/visa-link/report')
  reportVisaLink(@Param('orderId') orderId: string, @Body() body: unknown, @CurrentCustomer() customer: CustomerAuthUser) {
    return this.paymentService.reportVisaLink(customer, orderId, parseBody(reportVisaLinkSchema, body));
  }

  @Post(':orderId/payment/cash')
  registerCash(@Param('orderId') orderId: string, @Body() body: unknown, @CurrentCustomer() customer: CustomerAuthUser) {
    return this.paymentService.registerCashPayment(customer, orderId, parseBody(registerCashSchema, body));
  }
}
