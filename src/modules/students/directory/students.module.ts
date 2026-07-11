import { Module } from '@nestjs/common';
import {
  PrismaService,
  TenantConnectionService,
} from 'src/cores/prisma.service';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';

@Module({
  controllers: [StudentsController],
  providers: [StudentsService, PrismaService, TenantConnectionService],
  exports: [StudentsService],
})
export class StudentsDirectoryModule {}
