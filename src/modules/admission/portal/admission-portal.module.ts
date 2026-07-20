import { Module } from '@nestjs/common';
import {
  PrismaService,
  TenantConnectionService,
} from 'src/cores/prisma.service';
import { AdmissionApplicationsModule } from '../applications/admission-applications.module';
import { AdmissionSettingsModule } from '../settings/admission-settings.module';
import { PaymentMethodSettingsModule } from '../../settings/payment-methods/payment-method-settings.module';
import { StudentPaymentsModule } from '../../student-payments/student-payments.module';
import {
  AdmissionPortalAdminController,
  AdmissionPortalController,
  SslCommerzPaymentController,
} from './admission-portal.controller';
import { AdmissionPortalService } from './admission-portal.service';

@Module({
  imports: [
    AdmissionApplicationsModule,
    AdmissionSettingsModule,
    PaymentMethodSettingsModule,
    StudentPaymentsModule,
  ],
  controllers: [
    AdmissionPortalAdminController,
    AdmissionPortalController,
    SslCommerzPaymentController,
  ],
  providers: [AdmissionPortalService, PrismaService, TenantConnectionService],
})
export class AdmissionPortalModule {}
