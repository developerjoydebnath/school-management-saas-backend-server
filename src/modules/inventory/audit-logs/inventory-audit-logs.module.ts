import { PrismaService, TenantConnectionService } from 'src/cores/prisma.service';
import { Module } from '@nestjs/common';
import { InventoryAuditLogsController } from './inventory-audit-logs.controller';
import { InventoryAuditLogsService } from './inventory-audit-logs.service';



@Module({
  controllers: [InventoryAuditLogsController],
  providers: [
    InventoryAuditLogsService,
    PrismaService,
    TenantConnectionService,
  ],
  exports: [InventoryAuditLogsService],
})
export class InventoryAuditLogsModule {}
