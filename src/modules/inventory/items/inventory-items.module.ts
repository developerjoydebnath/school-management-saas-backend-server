import { Module } from '@nestjs/common';
import { PrismaService, TenantConnectionService } from 'src/cores/prisma.service';
import { InventoryItemsController } from './inventory-items.controller';
import { InventoryItemsService } from './inventory-items.service';

@Module({
  controllers: [InventoryItemsController],
  providers: [InventoryItemsService, PrismaService, TenantConnectionService],
})
export class InventoryItemsModule {}
