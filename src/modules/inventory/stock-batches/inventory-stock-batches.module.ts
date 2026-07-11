import { Module } from '@nestjs/common';
import { PrismaService, TenantConnectionService } from 'src/cores/prisma.service';
import { InventoryStockBatchesController } from './inventory-stock-batches.controller';
import { InventoryStockBatchesService } from './inventory-stock-batches.service';

@Module({
  controllers: [InventoryStockBatchesController],
  providers: [InventoryStockBatchesService, PrismaService, TenantConnectionService],
})
export class InventoryStockBatchesModule {}
