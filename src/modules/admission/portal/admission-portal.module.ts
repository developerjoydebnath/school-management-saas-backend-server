import { Module } from '@nestjs/common';
import {
  PrismaService,
  TenantConnectionService,
} from 'src/cores/prisma.service';
import { AdmissionApplicationsModule } from '../applications/admission-applications.module';
import { AdmissionSettingsModule } from '../settings/admission-settings.module';
import {
  AdmissionPortalAdminController,
  AdmissionPortalController,
} from './admission-portal.controller';
import { AdmissionPortalService } from './admission-portal.service';

@Module({
  imports: [AdmissionApplicationsModule, AdmissionSettingsModule],
  controllers: [AdmissionPortalAdminController, AdmissionPortalController],
  providers: [AdmissionPortalService, PrismaService, TenantConnectionService],
})
export class AdmissionPortalModule {}
