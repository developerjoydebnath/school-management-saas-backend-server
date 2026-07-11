import { Module } from '@nestjs/common';
import {
  PrismaService,
  TenantConnectionService,
} from 'src/cores/prisma.service';
import { InventoryMovementsController } from './inventory-movements.controller';
import { InventoryMovementsService } from './inventory-movements.service';

@Module({
  controllers: [InventoryMovementsController],
  providers: [InventoryMovementsService, PrismaService, TenantConnectionService],
})
export class InventoryMovementsModule {}
