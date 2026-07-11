import { Module } from '@nestjs/common';
import {
  PrismaService,
  TenantConnectionService,
} from 'src/cores/prisma.service';
import { AdmissionApplicationsModule } from '../applications/admission-applications.module';
import { AdmissionSettingsModule } from '../settings/admission-settings.module';
import { AdmissionPortalController } from './admission-portal.controller';
import { AdmissionPortalService } from './admission-portal.service';

@Module({
  imports: [AdmissionApplicationsModule, AdmissionSettingsModule],
  controllers: [AdmissionPortalController],
  providers: [AdmissionPortalService, PrismaService, TenantConnectionService],
})
export class AdmissionPortalModule {}
