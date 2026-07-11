import { Module } from '@nestjs/common';
import {
  PrismaService,
  TenantConnectionService,
} from 'src/cores/prisma.service';
import { PdfService } from 'src/modules/payments/pdf.service';
import { ExamRoutinesController } from './exam-routines.controller';
import { ExamRoutinesService } from './exam-routines.service';

@Module({
  controllers: [ExamRoutinesController],
  providers: [
    ExamRoutinesService,
    PrismaService,
    TenantConnectionService,
    PdfService,
  ],
})
export class ExamRoutinesModule {}
