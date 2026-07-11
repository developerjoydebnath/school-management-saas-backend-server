import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from 'src/common/constants/permissions';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/modules/auth/guards/permissions.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { CreateInventoryMovementDto } from './dto/inventory-movement.dto';
import { InventoryMovementsService } from './inventory-movements.service';

@ApiTags('inventory movements')
@Controller('inventory/movements')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class InventoryMovementsController {
  constructor(private readonly service: InventoryMovementsService) {}

  private getUserId(req: any) {
    return req.user?.userId || req.user?.id;
  }

  @Post()
  @ApiOperation({ summary: 'Create inventory movement' })
  @RequirePermissions(
    PERMISSIONS.INVENTORY.MOVEMENTS.CREATE,
    PERMISSIONS.INVENTORY.MOVEMENTS.ALL,
    PERMISSIONS.INVENTORY.ALL,
  )
  create(@Body() dto: CreateInventoryMovementDto, @Req() req: any) {
    return this.service.create(dto, this.getUserId(req));
  }

  @Get()
  @ApiOperation({ summary: 'List inventory movements' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'itemId', required: false })
  @ApiQuery({ name: 'movementType', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'chartPeriod', required: false })
  @RequirePermissions(
    PERMISSIONS.INVENTORY.MOVEMENTS.VIEW,
    PERMISSIONS.INVENTORY.MOVEMENTS.ALL,
    PERMISSIONS.INVENTORY.ALL,
  )
  findAll(@Query() query: any) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get inventory movement details' })
  @RequirePermissions(
    PERMISSIONS.INVENTORY.MOVEMENTS.VIEW,
    PERMISSIONS.INVENTORY.MOVEMENTS.ALL,
    PERMISSIONS.INVENTORY.ALL,
  )
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
