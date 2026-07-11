import { Module } from '@nestjs/common';
import { InventoryAuditLogsModule } from './audit-logs/inventory-audit-logs.module';
import {
  PrismaService,
  TenantConnectionService,
} from 'src/cores/prisma.service';
import { InventoryAuditLogsController } from './audit-logs/inventory-audit-logs.controller';
import { InventoryAuditLogsService } from './audit-logs/inventory-audit-logs.service';
import { InventoryAssetsModule } from './assets/inventory-assets.module';
import { InventoryCategoriesModule } from './categories/inventory-categories.module';
import { InventoryItemsModule } from './items/inventory-items.module';
import { InventoryStockBatchesModule } from './stock-batches/inventory-stock-batches.module';
import { InventoryMovementsModule } from './movements/inventory-movements.module';
import { InventorySeedService } from './inventory-seed.service';
import { InventoryService } from './inventory.service';
import { InventoryLocationsController } from './locations/inventory-locations.controller';
import { InventoryLocationsService } from './locations/inventory-locations.service';
import { InventoryMaintenanceModule } from './maintenance/inventory-maintenance.module';
import { InventoryOverviewModule } from './overview/inventory-overview.module';

@Module({
  imports: [
    InventoryAuditLogsModule,
    InventoryCategoriesModule,
    InventoryItemsModule,
    InventoryStockBatchesModule,
    InventoryAssetsModule,
    InventoryMovementsModule,
    InventoryMaintenanceModule,
    InventoryOverviewModule,
  ],
  controllers: [
    InventoryLocationsController,
    InventoryAuditLogsController,
  ],
  providers: [
    InventoryService,
    InventoryLocationsService,
    InventoryAuditLogsService,
    InventorySeedService,
    PrismaService,
    TenantConnectionService,
  ],
  exports: [InventorySeedService],
})
export class InventoryModule {}
