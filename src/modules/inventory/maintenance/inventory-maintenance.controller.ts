import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/modules/auth/guards/permissions.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { PERMISSIONS } from 'src/common/constants/permissions';
import { InventoryMaintenanceService } from './inventory-maintenance.service';
import {
  CreateInventoryMaintenanceDto,
  UpdateInventoryMaintenanceDto,
  MaintenanceFilterDto,
} from './dto/inventory-maintenance.dto';

@ApiTags('Inventory Maintenance')
@ApiBearerAuth()
@Controller('inventory/maintenance')
export class InventoryMaintenanceController {
  constructor(
    private readonly inventoryMaintenanceService: InventoryMaintenanceService,
  ) {}

  private getUserId(req: any) {
    return req.user?.userId;
  }

  @Post()
  @ApiOperation({ summary: 'Create inventory maintenance record' })
  @RequirePermissions(
    PERMISSIONS.INVENTORY.MAINTENANCE.CREATE,
    PERMISSIONS.INVENTORY.MAINTENANCE.ALL,
    PERMISSIONS.INVENTORY.ALL,
  )
  createMaintenance(
    @Body() dto: CreateInventoryMaintenanceDto,
    @Req() req: any,
  ) {
    return this.inventoryMaintenanceService.createMaintenance(
      dto,
      this.getUserId(req),
    );
  }

  @Get()
  @ApiOperation({ summary: 'List inventory maintenance records' })
  @RequirePermissions(
    PERMISSIONS.INVENTORY.MAINTENANCE.VIEW,
    PERMISSIONS.INVENTORY.MAINTENANCE.ALL,
    PERMISSIONS.INVENTORY.ALL,
  )
  findMaintenances(@Query() query: MaintenanceFilterDto) {
    return this.inventoryMaintenanceService.findMaintenances(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get inventory maintenance details' })
  @RequirePermissions(
    PERMISSIONS.INVENTORY.MAINTENANCE.VIEW,
    PERMISSIONS.INVENTORY.MAINTENANCE.ALL,
    PERMISSIONS.INVENTORY.ALL,
  )
  findMaintenance(@Param('id') id: string) {
    return this.inventoryMaintenanceService.findMaintenance(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update inventory maintenance record' })
  @RequirePermissions(
    PERMISSIONS.INVENTORY.MAINTENANCE.EDIT,
    PERMISSIONS.INVENTORY.MAINTENANCE.ALL,
    PERMISSIONS.INVENTORY.ALL,
  )
  updateMaintenance(
    @Param('id') id: string,
    @Body() dto: UpdateInventoryMaintenanceDto,
    @Req() req: any,
  ) {
    return this.inventoryMaintenanceService.updateMaintenance(
      id,
      dto,
      this.getUserId(req),
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete inventory maintenance record' })
  @RequirePermissions(
    PERMISSIONS.INVENTORY.MAINTENANCE.DELETE,
    PERMISSIONS.INVENTORY.MAINTENANCE.ALL,
    PERMISSIONS.INVENTORY.ALL,
  )
  deleteMaintenance(@Param('id') id: string, @Req() req: any) {
    return this.inventoryMaintenanceService.deleteMaintenance(
      id,
      this.getUserId(req),
    );
  }
}
