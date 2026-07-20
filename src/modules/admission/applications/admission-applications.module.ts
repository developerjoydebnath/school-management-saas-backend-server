import { Module } from '@nestjs/common';
import {
  PrismaService,
  TenantConnectionService,
} from 'src/cores/prisma.service';
import { AdmissionSettingsModule } from '../settings/admission-settings.module';
import { MailQueueModule } from 'src/modules/mail-queue/mail-queue.module';
import { StudentPaymentsModule } from 'src/modules/student-payments/student-payments.module';
import { UsernamesModule } from 'src/modules/usernames/usernames.module';
import { AdmissionApplicationsController } from './admission-applications.controller';
import { AdmissionApplicationsService } from './admission-applications.service';

@Module({
  imports: [AdmissionSettingsModule, StudentPaymentsModule, MailQueueModule, UsernamesModule],
  controllers: [AdmissionApplicationsController],
  providers: [AdmissionApplicationsService, PrismaService, TenantConnectionService],
  exports: [AdmissionApplicationsService],
})
export class AdmissionApplicationsModule {}
