import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from 'src/common/constants/permissions';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/modules/auth/guards/permissions.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { InventoryOverviewService } from './inventory-overview.service';

@ApiTags('inventory overview')
@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class InventoryOverviewController {
  constructor(private readonly service: InventoryOverviewService) {}

  @Post('seed')
  @ApiOperation({ summary: 'Seed inventory defaults for current tenant' })
  @RequirePermissions(PERMISSIONS.INVENTORY.ALL)
  seedCurrentTenant() {
    return this.service.seedCurrentTenant();
  }

  @Get('overview')
  @ApiOperation({ summary: 'Get inventory overview' })
  @RequirePermissions(PERMISSIONS.INVENTORY.VIEW, PERMISSIONS.INVENTORY.ALL)
  overview() {
    return this.service.overview();
  }
}
