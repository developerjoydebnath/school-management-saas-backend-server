import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from 'src/common/constants/permissions';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/modules/auth/guards/permissions.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { CreateInventoryStockBatchDto, UpdateInventoryStockBatchDto } from './dto/inventory-stock-batch.dto';
import { InventoryStockBatchesService } from './inventory-stock-batches.service';

@ApiTags('inventory stock batches')
@Controller('inventory/stock-batches')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class InventoryStockBatchesController {
  constructor(private readonly service: InventoryStockBatchesService) {}

  private getUserId(req: any) {
    return req.user?.userId || req.user?.id;
  }

  @Post()
  @ApiOperation({ summary: 'Create inventory stock batch' })
  @RequirePermissions(PERMISSIONS.INVENTORY.STOCK.CREATE, PERMISSIONS.INVENTORY.STOCK.ALL, PERMISSIONS.INVENTORY.ALL)
  create(@Body() dto: CreateInventoryStockBatchDto, @Req() req: any) {
    return this.service.create(dto, this.getUserId(req));
  }

  @Get()
  @ApiOperation({ summary: 'List inventory stock batches' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'itemId', required: false })
  @ApiQuery({ name: 'locationId', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @RequirePermissions(PERMISSIONS.INVENTORY.STOCK.VIEW, PERMISSIONS.INVENTORY.STOCK.ALL, PERMISSIONS.INVENTORY.ALL)
  findAll(@Query() query: any) {
    return this.service.findAll(query);
  }

  @Get('options')
  @ApiOperation({ summary: 'Get inventory stock batches for select options' })
  @RequirePermissions(PERMISSIONS.INVENTORY.STOCK.VIEW, PERMISSIONS.INVENTORY.STOCK.ALL, PERMISSIONS.INVENTORY.ALL)
  getOptions() {
    return this.service.getOptions();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get inventory stock batch details' })
  @RequirePermissions(PERMISSIONS.INVENTORY.STOCK.VIEW, PERMISSIONS.INVENTORY.STOCK.ALL, PERMISSIONS.INVENTORY.ALL)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update inventory stock batch' })
  @RequirePermissions(PERMISSIONS.INVENTORY.STOCK.EDIT, PERMISSIONS.INVENTORY.STOCK.ALL, PERMISSIONS.INVENTORY.ALL)
  update(@Param('id') id: string, @Body() dto: UpdateInventoryStockBatchDto, @Req() req: any) {
    return this.service.update(id, dto, this.getUserId(req));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete inventory stock batch' })
  @RequirePermissions(PERMISSIONS.INVENTORY.STOCK.DELETE, PERMISSIONS.INVENTORY.STOCK.ALL, PERMISSIONS.INVENTORY.ALL)
  remove(@Param('id') id: string, @Req() req: any) {
    return this.service.remove(id, this.getUserId(req));
  }
}
