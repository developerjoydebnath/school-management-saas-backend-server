import { Module } from '@nestjs/common';
import {
  PrismaService,
  TenantConnectionService,
} from 'src/cores/prisma.service';
import { PdfService } from 'src/modules/payments/pdf.service';
import { TimetablesController } from './timetables.controller';
import { TimetablesService } from './timetables.service';

@Module({
  controllers: [TimetablesController],
  providers: [
    TimetablesService,
    PrismaService,
    TenantConnectionService,
    PdfService,
  ],
})
export class TimetablesModule {}
