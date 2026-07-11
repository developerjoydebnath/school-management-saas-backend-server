import { Module } from '@nestjs/common';
import {
  PrismaService,
  TenantConnectionService,
} from 'src/cores/prisma.service';
import { InventoryCategoriesController } from './inventory-categories.controller';
import { InventoryCategoriesService } from './inventory-categories.service';

@Module({
  controllers: [InventoryCategoriesController],
  providers: [
    InventoryCategoriesService,
    PrismaService,
    TenantConnectionService,
  ],
})
export class InventoryCategoriesModule {}
