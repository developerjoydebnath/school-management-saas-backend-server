import { Module } from '@nestjs/common';
import {
  PrismaService,
  TenantConnectionService,
} from 'src/cores/prisma.service';
import { AdmissionSettingsController } from './admission-settings.controller';
import { AdmissionSettingsService } from './admission-settings.service';

@Module({
  controllers: [AdmissionSettingsController],
  providers: [AdmissionSettingsService, PrismaService, TenantConnectionService],
  exports: [AdmissionSettingsService],
})
export class AdmissionSettingsModule {}
