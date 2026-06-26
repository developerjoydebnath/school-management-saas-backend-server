import { Module } from '@nestjs/common';
import {
  PrismaService,
  TenantConnectionService,
} from 'src/cores/prisma.service';
import { ShiftsService } from './shifts.service';
import { ShiftsController } from './shifts.controller';

@Module({
  controllers: [ShiftsController],
  providers: [ShiftsService, PrismaService, TenantConnectionService],
  exports: [ShiftsService],
})
export class ShiftsModule {}
