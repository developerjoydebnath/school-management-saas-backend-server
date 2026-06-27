import { Module } from '@nestjs/common';
import { PrismaService, TenantConnectionService } from 'src/cores/prisma.service';
import { DepartmentsController } from './departments.controller';
import { DepartmentsService } from './departments.service';

@Module({
  controllers: [DepartmentsController],
  providers: [DepartmentsService, PrismaService, TenantConnectionService],
  exports: [DepartmentsService],
})
export class DepartmentsModule {}
