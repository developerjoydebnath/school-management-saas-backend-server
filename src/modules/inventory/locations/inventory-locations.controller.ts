import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from 'src/common/constants/permissions';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/modules/auth/guards/permissions.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { CreateInventoryLocationDto, UpdateInventoryLocationDto } from './dto/inventory-location.dto';
import { InventoryLocationsService } from './inventory-locations.service';

@ApiTags('inventory locations')
@Controller('inventory/locations')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class InventoryLocationsController {
  constructor(private readonly service: InventoryLocationsService) {}
  private getUserId(req: any) { return req.user?.userId || req.user?.id; }
  @Post() @ApiOperation({ summary: 'Create inventory location' }) @RequirePermissions(PERMISSIONS.INVENTORY.LOCATIONS.CREATE, PERMISSIONS.INVENTORY.LOCATIONS.ALL, PERMISSIONS.INVENTORY.ALL)
  create(@Body() dto: CreateInventoryLocationDto, @Req() req: any) { return this.service.create(dto, this.getUserId(req)); }
  @Get() @ApiOperation({ summary: 'List inventory locations' }) @RequirePermissions(PERMISSIONS.INVENTORY.LOCATIONS.VIEW, PERMISSIONS.INVENTORY.LOCATIONS.ALL, PERMISSIONS.INVENTORY.ALL)
  findAll(@Query() query: any) { return this.service.findAll(query); }
  @Get('options') @ApiOperation({ summary: 'Get inventory locations for select options' }) @RequirePermissions(PERMISSIONS.INVENTORY.LOCATIONS.VIEW, PERMISSIONS.INVENTORY.LOCATIONS.ALL, PERMISSIONS.INVENTORY.ALL)
  getOptions() { return this.service.getOptions(); }
  @Get(':id') @ApiOperation({ summary: 'Get inventory location details' }) @RequirePermissions(PERMISSIONS.INVENTORY.LOCATIONS.VIEW, PERMISSIONS.INVENTORY.LOCATIONS.ALL, PERMISSIONS.INVENTORY.ALL)
  findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Patch(':id') @ApiOperation({ summary: 'Update inventory location' }) @RequirePermissions(PERMISSIONS.INVENTORY.LOCATIONS.EDIT, PERMISSIONS.INVENTORY.LOCATIONS.ALL, PERMISSIONS.INVENTORY.ALL)
  update(@Param('id') id: string, @Body() dto: UpdateInventoryLocationDto, @Req() req: any) { return this.service.update(id, dto, this.getUserId(req)); }
  @Delete(':id') @ApiOperation({ summary: 'Delete inventory location' }) @RequirePermissions(PERMISSIONS.INVENTORY.LOCATIONS.DELETE, PERMISSIONS.INVENTORY.LOCATIONS.ALL, PERMISSIONS.INVENTORY.ALL)
  remove(@Param('id') id: string, @Req() req: any) { return this.service.remove(id, this.getUserId(req)); }
}
