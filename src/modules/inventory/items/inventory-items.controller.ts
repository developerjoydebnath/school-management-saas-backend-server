import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from 'src/common/constants/permissions';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/modules/auth/guards/permissions.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { CreateInventoryItemDto, UpdateInventoryItemDto } from './dto/inventory-item.dto';
import { InventoryItemsService } from './inventory-items.service';

@ApiTags('inventory items')
@Controller('inventory/items')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class InventoryItemsController {
  constructor(private readonly service: InventoryItemsService) {}
  private getUserId(req: any) { return req.user?.userId || req.user?.id; }
  @Post() @ApiOperation({ summary: 'Create inventory item' }) @RequirePermissions(PERMISSIONS.INVENTORY.ITEMS.CREATE, PERMISSIONS.INVENTORY.ITEMS.ALL, PERMISSIONS.INVENTORY.ALL)
  create(@Body() dto: CreateInventoryItemDto, @Req() req: any) { return this.service.create(dto, this.getUserId(req)); }
  @Get() @ApiOperation({ summary: 'List inventory items' }) @RequirePermissions(PERMISSIONS.INVENTORY.ITEMS.VIEW, PERMISSIONS.INVENTORY.ITEMS.ALL, PERMISSIONS.INVENTORY.ALL)
  findAll(@Query() query: any) { return this.service.findAll(query); }
  
  @Get('options')
  @ApiOperation({ summary: 'Get inventory items for select options' })
  @RequirePermissions(
    PERMISSIONS.INVENTORY.ITEMS.VIEW,
    PERMISSIONS.INVENTORY.ITEMS.ALL,
    PERMISSIONS.INVENTORY.ALL,
  )
  getOptions() {
    return this.service.getOptions();
  }

  @Get(':id') @ApiOperation({ summary: 'Get inventory item details' }) @RequirePermissions(PERMISSIONS.INVENTORY.ITEMS.VIEW, PERMISSIONS.INVENTORY.ITEMS.ALL, PERMISSIONS.INVENTORY.ALL)
  findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Patch(':id') @ApiOperation({ summary: 'Update inventory item' }) @RequirePermissions(PERMISSIONS.INVENTORY.ITEMS.EDIT, PERMISSIONS.INVENTORY.ITEMS.ALL, PERMISSIONS.INVENTORY.ALL)
  update(@Param('id') id: string, @Body() dto: UpdateInventoryItemDto, @Req() req: any) { return this.service.update(id, dto, this.getUserId(req)); }
  @Delete(':id') @ApiOperation({ summary: 'Delete inventory item' }) @RequirePermissions(PERMISSIONS.INVENTORY.ITEMS.DELETE, PERMISSIONS.INVENTORY.ITEMS.ALL, PERMISSIONS.INVENTORY.ALL)
  remove(@Param('id') id: string, @Req() req: any) { return this.service.remove(id, this.getUserId(req)); }
}
