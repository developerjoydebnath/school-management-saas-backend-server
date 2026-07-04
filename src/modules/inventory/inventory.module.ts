import { Module } from '@nestjs/common';
import {
  PrismaService,
  TenantConnectionService,
} from 'src/cores/prisma.service';
import { InventoryController } from './inventory.controller';
import { InventorySeedService } from './inventory-seed.service';
import { InventoryService } from './inventory.service';

@Module({
  controllers: [InventoryController],
  providers: [
    InventoryService,
    InventorySeedService,
    PrismaService,
    TenantConnectionService,
  ],
  exports: [InventorySeedService],
})
export class InventoryModule {}
