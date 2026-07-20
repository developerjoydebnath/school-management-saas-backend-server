import { Module } from '@nestjs/common';
import {
  PrismaService,
  TenantConnectionService,
} from 'src/cores/prisma.service';
import { MailSettingsModule } from '../mail-settings/mail-settings.module';
import { SchoolMailController } from './school-mail.controller';

@Module({
  imports: [MailSettingsModule],
  controllers: [SchoolMailController],
  providers: [PrismaService, TenantConnectionService],
})
export class SchoolMailModule {}
