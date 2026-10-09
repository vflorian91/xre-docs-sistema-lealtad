import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { CatalogsModule } from './catalogs/catalogs.module';
import { ClientModule } from './client/client.module';
import { CustomerAddressModule } from './customer-address/customer-address.module';
import { CustomersModule } from './customers/customers.module';
import { DatabaseModule } from './database/database.module';
import { DriverModule } from './driver/driver.module';
import { HealthModule } from './health/health.module';
import { InternalUsersModule } from './internal-users/internal-users.module';
import { LoyaltyLevelsModule } from './loyalty-levels/loyalty-levels.module';
import { MarketingBannersModule } from './marketing-banners/marketing-banners.module';
import { MediaModule } from './media/media.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PointsModule } from './points/points.module';
import { PromotionalBalanceModule } from './promotional-balance/promotional-balance.module';
import { PurchasesModule } from './purchases/purchases.module';
import { RedemptionsModule } from './redemptions/redemptions.module';
import { RewardsModule } from './rewards/rewards.module';
import { SettingsModule } from './settings/settings.module';
import { StoreCatalogModule } from './store-catalog/store-catalog.module';
import { StoresModule } from './stores/stores.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env', '../../.env'],
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
    AuditModule,
    AuthModule,
    AdminModule,
    CatalogsModule,
    ClientModule,
    CustomerAddressModule,
    CustomersModule,
    DatabaseModule,
    DriverModule,
    HealthModule,
    InternalUsersModule,
    LoyaltyLevelsModule,
    MarketingBannersModule,
    MediaModule,
    NotificationsModule,
    PointsModule,
    PromotionalBalanceModule,
    PurchasesModule,
    RedemptionsModule,
    RewardsModule,
    SettingsModule,
    StoreCatalogModule,
    StoresModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
