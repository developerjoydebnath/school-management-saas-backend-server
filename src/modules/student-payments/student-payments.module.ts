import { Module } from '@nestjs/common';
import { PrismaService, TenantConnectionService } from 'src/cores/prisma.service';
import { StudentPaymentsController } from './student-payments.controller';
import { StudentPaymentsService } from './student-payments.service';

@Module({
  controllers: [StudentPaymentsController],
  providers: [StudentPaymentsService, PrismaService, TenantConnectionService],
  exports: [StudentPaymentsService],
})
export class StudentPaymentsModule {}
