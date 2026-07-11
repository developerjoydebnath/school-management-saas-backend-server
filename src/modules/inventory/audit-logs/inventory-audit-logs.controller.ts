import { Controller, Get, Query, UseGuards, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { PERMISSIONS } from 'src/common/constants/permissions';
import { InventoryAuditLogsService } from './inventory-audit-logs.service';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { PermissionsGuard } from 'src/modules/auth/guards/permissions.guard';

@ApiTags('Inventory Audit Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('inventory/audit-logs')
export class InventoryAuditLogsController {
  constructor(private readonly auditLogsService: InventoryAuditLogsService) {}

  @Get()
  @ApiOperation({ summary: 'List inventory audit logs' })
  @RequirePermissions(
    PERMISSIONS.INVENTORY.AUDIT_LOGS.VIEW,
    PERMISSIONS.INVENTORY.AUDIT_LOGS.ALL,
    PERMISSIONS.INVENTORY.ALL,
  )
  findAuditLogs(@Query() query: any) {
    return this.auditLogsService.findAuditLogs(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single audit log' })
  @RequirePermissions(
    PERMISSIONS.INVENTORY.AUDIT_LOGS.VIEW,
    PERMISSIONS.INVENTORY.AUDIT_LOGS.ALL,
    PERMISSIONS.INVENTORY.ALL,
  )
  findOne(@Param('id') id: string) {
    return this.auditLogsService.findOne(id);
  }
}
