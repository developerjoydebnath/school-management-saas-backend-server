import { Module } from '@nestjs/common';
import {
  PrismaService,
  TenantConnectionService,
} from 'src/cores/prisma.service';
import { MailSettingsModule } from '../mail-settings/mail-settings.module';
import { SoftwareMailController } from './software-mail.controller';

@Module({
  imports: [MailSettingsModule],
  controllers: [SoftwareMailController],
  providers: [PrismaService, TenantConnectionService],
})
export class SoftwareMailModule {}
