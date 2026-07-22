import { Module } from '@nestjs/common';
import {
  PrismaService,
  TenantConnectionService,
} from 'src/cores/prisma.service';
import { ParentsController } from './parents.controller';
import { ParentsService } from './parents.service';

@Module({
  controllers: [ParentsController],
  providers: [ParentsService, PrismaService, TenantConnectionService],
  exports: [ParentsService],
})
export class ParentsModule {}
