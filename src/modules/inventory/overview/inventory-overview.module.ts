import { Module } from '@nestjs/common';
import {
  PrismaService,
  TenantConnectionService,
} from 'src/cores/prisma.service';
import { InventorySeedService } from '../inventory-seed.service';
import { InventoryOverviewController } from './inventory-overview.controller';
import { InventoryOverviewService } from './inventory-overview.service';

@Module({
  controllers: [InventoryOverviewController],
  providers: [
    InventoryOverviewService,
    InventorySeedService,
    PrismaService,
    TenantConnectionService,
  ],
})
export class InventoryOverviewModule {}
