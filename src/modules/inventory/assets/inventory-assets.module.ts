import { Module } from '@nestjs/common';
import { PrismaService, TenantConnectionService } from 'src/cores/prisma.service';
import { InventoryAssetsController } from './inventory-assets.controller';
import { InventoryAssetsService } from './inventory-assets.service';

@Module({
  controllers: [InventoryAssetsController],
  providers: [InventoryAssetsService, PrismaService, TenantConnectionService],
  exports: [InventoryAssetsService],
})
export class InventoryAssetsModule {}
