import { Module } from '@nestjs/common';
import { PrismaService, TenantConnectionService } from '../../cores/prisma.service';
import { SchoolsModule } from '../schools/schools.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PdfService } from './pdf.service';

@Module({
  imports: [SchoolsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PrismaService, TenantConnectionService, PdfService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
