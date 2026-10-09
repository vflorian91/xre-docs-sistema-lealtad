import { Controller, Get, UseGuards } from '@nestjs/common';
import { CustomerJwtAuthGuard } from '../../auth/customer-jwt-auth.guard';
import { STORE_PAYMENT_METHOD } from '../order/store-order.constants';
import { StoreBankAccountsService } from './store-bank-accounts.service';

const PAYMENT_METHODS = [
  { value: STORE_PAYMENT_METHOD.DEPOSITO_BANCARIO, label: 'Depósito bancario', requiresBankAccount: true, requiresProof: true },
  { value: STORE_PAYMENT_METHOD.TRANSFERENCIA_BANCARIA, label: 'Transferencia bancaria', requiresBankAccount: true, requiresProof: true },
  { value: STORE_PAYMENT_METHOD.VISA_LINK_MANUAL, label: 'Visa Link', requiresBankAccount: false, requiresProof: true },
  { value: STORE_PAYMENT_METHOD.EFECTIVO_CONTRA_ENTREGA, label: 'Efectivo contra entrega', requiresBankAccount: false, requiresProof: false },
];

@Controller('pwa-client/store')
@UseGuards(CustomerJwtAuthGuard)
export class StorePaymentsClientController {
  constructor(private readonly bankAccountsService: StoreBankAccountsService) {}

  @Get('payment-methods')
  paymentMethods() {
    return PAYMENT_METHODS;
  }

  @Get('bank-accounts')
  bankAccounts() {
    return this.bankAccountsService.listActiveForClient();
  }
}
