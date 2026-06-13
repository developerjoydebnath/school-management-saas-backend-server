import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApiKeyModule } from './cores/api-key/api-key.module';
import { TenantMiddleware } from './cores/user-context/tenant.middleware';
import { SessionsModule } from './modules/academics/sessions/sessions.module';
import { AuthModule } from './modules/auth/auth.module';
import { SchoolBankAccountsModule } from './modules/school-bank-accounts/school-bank-accounts.module';
import { SchoolSubscriptionDiscountsModule } from './modules/school-subscription-discounts/school-subscription-discounts.module';
import { SchoolSubscriptionsModule } from './modules/school-subscriptions/school-subscriptions.module';
import { SchoolsModule } from './modules/schools/schools.module';
import { SubscriptionPlansModule } from './modules/subscription-plans/subscription-plans.module';
import { VouchersModule } from './modules/vouchers/vouchers.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    ApiKeyModule,
    SessionsModule,
    SchoolsModule,
    SchoolBankAccountsModule,
    SchoolSubscriptionsModule,
    SchoolSubscriptionDiscountsModule,
    SubscriptionPlansModule,
    VouchersModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
