import { Module } from '@nestjs/common';
import {
  PrismaService,
  TenantConnectionService,
} from 'src/cores/prisma.service';
import { AdmissionSettingsModule } from '../settings/admission-settings.module';
import { AdmissionApplicationsController } from './admission-applications.controller';
import { AdmissionApplicationsService } from './admission-applications.service';

@Module({
  imports: [AdmissionSettingsModule],
  controllers: [AdmissionApplicationsController],
  providers: [AdmissionApplicationsService, PrismaService, TenantConnectionService],
  exports: [AdmissionApplicationsService],
})
export class AdmissionApplicationsModule {}
