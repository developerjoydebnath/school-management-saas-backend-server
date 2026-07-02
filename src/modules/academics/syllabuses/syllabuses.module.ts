import { Module } from '@nestjs/common';
import {
  PrismaService,
  TenantConnectionService,
} from 'src/cores/prisma.service';
import { SyllabusesController } from './syllabuses.controller';
import { SyllabusesService } from './syllabuses.service';

@Module({
  controllers: [SyllabusesController],
  providers: [SyllabusesService, PrismaService, TenantConnectionService],
  exports: [SyllabusesService],
})
export class SyllabusesModule {}
