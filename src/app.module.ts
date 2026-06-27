import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import { ApiKeyModule } from './cores/api-key/api-key.module';
import { TenantMiddleware } from './cores/user-context/tenant.middleware';
import { MediaModule } from './media/media.module';
import { ClassRoomsModule } from './modules/academics/class-rooms/class-rooms.module';
import { ClassesModule } from './modules/academics/classes/classes.module';
import { SessionsModule } from './modules/academics/sessions/sessions.module';
import { ShiftsModule } from './modules/academics/shifts/shifts.module';
import { SubjectsModule } from './modules/academics/subjects/subjects.module';
import { AuthModule } from './modules/auth/auth.module';
import { LocationsModule } from './modules/locations/locations.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { RolesModule } from './modules/roles/roles.module';
import { SchoolBankAccountsModule } from './modules/school-bank-accounts/school-bank-accounts.module';
import { SchoolSubscriptionDiscountsModule } from './modules/school-subscription-discounts/school-subscription-discounts.module';
import { SchoolSubscriptionsModule } from './modules/school-subscriptions/school-subscriptions.module';
import { SchoolsModule } from './modules/schools/schools.module';
import { SubscriptionPlansModule } from './modules/subscription-plans/subscription-plans.module';
import { DepartmentsModule } from './modules/staff/departments/departments.module';
import { DesignationsModule } from './modules/staff/designations/designations.module';
import { VouchersModule } from './modules/vouchers/vouchers.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    ApiKeyModule,
    SessionsModule,
    ClassRoomsModule,
    ClassesModule,
    SubjectsModule,
    ShiftsModule,
    SchoolsModule,
    RolesModule,
    PermissionsModule,
    SchoolBankAccountsModule,
    SchoolSubscriptionsModule,
    SchoolSubscriptionDiscountsModule,
    SubscriptionPlansModule,
    VouchersModule,
    LocationsModule,
    PaymentsModule,
    ScheduleModule.forRoot(),
    MediaModule,
    DesignationsModule,
    DepartmentsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
