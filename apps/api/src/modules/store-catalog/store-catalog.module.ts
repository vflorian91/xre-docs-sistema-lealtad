import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { CustomerAddressModule } from '../customer-address/customer-address.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { StoreBrandsAdminController } from './brands/store-brands-admin.controller';
import { StoreBrandsPublicController } from './brands/store-brands-public.controller';
import { StoreBrandsService } from './brands/store-brands.service';
import { StoreCartController } from './cart/store-cart.controller';
import { StoreCartService } from './cart/store-cart.service';
import { StoreDeliveryScheduleAdminController } from './delivery-schedule/store-delivery-schedule-admin.controller';
import { StoreDeliveryScheduleService } from './delivery-schedule/store-delivery-schedule.service';
import { StoreDriversAdminController } from './drivers/store-drivers-admin.controller';
import { StoreDriversService } from './drivers/store-drivers.service';
import { StoreOrderNumberService } from './order/store-order-number.service';
import { StoreOrderPaymentsAdminController } from './order/store-order-payments-admin.controller';
import { StoreOrderPaymentsAdminService } from './order/store-order-payments-admin.service';
import { StoreOrderTimelineService } from './order/store-order-timeline.service';
import { StoreOrdersAdminController } from './order/store-orders-admin.controller';
import { StoreOrdersAdminService } from './order/store-orders-admin.service';
import { StoreOrderPickupAdminController } from './order/store-order-pickup-admin.controller';
import { StoreOrderPickupAdminService } from './order/store-order-pickup-admin.service';
import { StoreBankAccountsAdminController } from './bank-accounts/store-bank-accounts-admin.controller';
import { StorePaymentsClientController } from './bank-accounts/store-payments-client.controller';
import { StoreBankAccountsService } from './bank-accounts/store-bank-accounts.service';
import { StoreOrderPaymentClientController } from './order/store-order-payment-client.controller';
import { StoreOrderPaymentClientService } from './order/store-order-payment-client.service';
import { StoreOrdersController } from './order/store-orders.controller';
import { StoreCheckoutController } from './order/store-checkout.controller';
import { StoreOrdersService } from './order/store-orders.service';
import { StorePaymentIncidentsAdminController } from './payment-settlements/store-payment-incidents-admin.controller';
import { StorePaymentSettlementNumberService } from './payment-settlements/store-payment-settlement-number.service';
import { StorePaymentSettlementsAdminController } from './payment-settlements/store-payment-settlements-admin.controller';
import { StorePaymentSettlementsAdminService } from './payment-settlements/store-payment-settlements-admin.service';
import { StoreProductImagesController } from './products/store-product-images.controller';
import { StoreProductImagesService } from './products/store-product-images.service';
import { StoreProductsAdminController } from './products/store-products-admin.controller';
import { StoreProductsPublicController } from './products/store-products-public.controller';
import { StoreProductsService } from './products/store-products.service';
import { StoreReportsAdminController } from './reports/store-reports-admin.controller';
import { StoreReportsAdminService } from './reports/store-reports-admin.service';
import { StoreStockMovementsService } from './stock/store-stock-movements.service';

@Module({
  imports: [AuditModule, AuthModule, CustomerAddressModule, NotificationsModule],
  controllers: [
    StoreBrandsAdminController,
    StoreBrandsPublicController,
    StoreProductsAdminController,
    StoreProductsPublicController,
    StoreProductImagesController,
    StoreCartController,
    StoreOrdersController,
    StoreCheckoutController,
    StoreOrdersAdminController,
    StoreOrderPickupAdminController,
    StoreBankAccountsAdminController,
    StorePaymentsClientController,
    StoreOrderPaymentClientController,
    StoreOrderPaymentsAdminController,
    StoreDriversAdminController,
    StoreDeliveryScheduleAdminController,
    StorePaymentSettlementsAdminController,
    StorePaymentIncidentsAdminController,
    StoreReportsAdminController,
  ],
  providers: [
    StoreBrandsService,
    StoreProductsService,
    StoreProductImagesService,
    StoreStockMovementsService,
    StoreCartService,
    StoreOrdersService,
    StoreOrderNumberService,
    StoreOrderTimelineService,
    StoreOrdersAdminService,
    StoreOrderPickupAdminService,
    StoreBankAccountsService,
    StoreOrderPaymentClientService,
    StoreOrderPaymentsAdminService,
    StoreDriversService,
    StoreDeliveryScheduleService,
    StorePaymentSettlementsAdminService,
    StorePaymentSettlementNumberService,
    StoreReportsAdminService,
  ],
})
export class StoreCatalogModule {}
