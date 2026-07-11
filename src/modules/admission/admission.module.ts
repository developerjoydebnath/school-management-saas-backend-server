import { Module } from '@nestjs/common';
import { AdmissionApplicationsModule } from './applications/admission-applications.module';
import { AdmissionPortalModule } from './portal/admission-portal.module';
import { AdmissionSettingsModule } from './settings/admission-settings.module';

@Module({
  imports: [
    AdmissionSettingsModule,
    AdmissionApplicationsModule,
    AdmissionPortalModule,
  ],
  exports: [AdmissionSettingsModule, AdmissionApplicationsModule],
})
export class AdmissionModule {}
