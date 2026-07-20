import { Module } from '@nestjs/common';
import {
  PrismaService,
  TenantConnectionService,
} from 'src/cores/prisma.service';
import { PaymentMethodSettingsController } from './payment-method-settings.controller';
import { PaymentMethodSettingsService } from './payment-method-settings.service';

@Module({
  controllers: [PaymentMethodSettingsController],
  providers: [
    PaymentMethodSettingsService,
    PrismaService,
    TenantConnectionService,
  ],
  exports: [PaymentMethodSettingsService],
})
export class PaymentMethodSettingsModule {}
