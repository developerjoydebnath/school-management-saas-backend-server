import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from 'src/common/constants/permissions';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/modules/auth/guards/permissions.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { InventoryService } from './inventory.service';

@ApiTags('inventory')
@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('audit-logs')
  @ApiOperation({ summary: 'List inventory audit logs' })
  @RequirePermissions(
    PERMISSIONS.INVENTORY.MOVEMENTS.VIEW,
    PERMISSIONS.INVENTORY.MOVEMENTS.ALL,
    PERMISSIONS.INVENTORY.ALL,
  )
  findAuditLogs(@Query() query: any) {
    return this.inventoryService.findAuditLogs(query);
  }

  
}
