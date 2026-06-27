import { Module } from '@nestjs/common';
import { PrismaService, TenantConnectionService } from 'src/cores/prisma.service';
import { DesignationsController } from './designations.controller';
import { DesignationsService } from './designations.service';

@Module({
  controllers: [DesignationsController],
  providers: [DesignationsService, PrismaService, TenantConnectionService],
  exports: [DesignationsService],
})
export class DesignationsModule {}
