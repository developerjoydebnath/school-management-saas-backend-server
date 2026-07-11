import { Module } from '@nestjs/common';
import {
  PrismaService,
  TenantConnectionService,
} from 'src/cores/prisma.service';
import { InventoryMaintenanceController } from './inventory-maintenance.controller';
import { InventoryMaintenanceService } from './inventory-maintenance.service';

@Module({
  controllers: [InventoryMaintenanceController],
  providers: [InventoryMaintenanceService, PrismaService, TenantConnectionService],
  exports: [InventoryMaintenanceService],
})
export class InventoryMaintenanceModule {}
