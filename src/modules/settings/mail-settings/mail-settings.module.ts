import { Module } from '@nestjs/common';
import {
  PrismaService,
  TenantConnectionService,
} from 'src/cores/prisma.service';
import { MailSettingsController } from './mail-settings.controller';
import { MailSettingsService } from './mail-settings.service';

@Module({
  controllers: [MailSettingsController],
  providers: [MailSettingsService, PrismaService, TenantConnectionService],
  exports: [MailSettingsService],
})
export class MailSettingsModule {}
