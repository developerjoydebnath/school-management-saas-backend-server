import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { PERMISSIONS } from 'src/common/constants/permissions';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/modules/auth/guards/permissions.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { CreateInventoryAssetDto, UpdateInventoryAssetDto } from './dto/inventory-asset.dto';
import { InventoryAssetsService } from './inventory-assets.service';

@ApiTags('inventory assets')
@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class InventoryAssetsController {
  constructor(private readonly service: InventoryAssetsService) {}
  private getUserId(req: any) { return req.user?.userId || req.user?.id; }
  private getUserContext(req: any) { return { role: req.user?.role as Role | undefined, schema: req.user?.schema }; }
  @Get('users/active-list') @ApiOperation({ summary: 'List assignable users for inventory assets' }) @RequirePermissions(PERMISSIONS.INVENTORY.ASSETS.VIEW, PERMISSIONS.INVENTORY.ASSETS.ALL, PERMISSIONS.INVENTORY.ALL)
  findAssignableUsers(@Req() req: any) { return this.service.findAssignableUsers(this.getUserContext(req)); }
  @Post('assets') @ApiOperation({ summary: 'Create inventory asset' }) @RequirePermissions(PERMISSIONS.INVENTORY.ASSETS.CREATE, PERMISSIONS.INVENTORY.ASSETS.ALL, PERMISSIONS.INVENTORY.ALL)
  create(@Body() dto: CreateInventoryAssetDto, @Req() req: any) { return this.service.create(dto, this.getUserId(req), this.getUserContext(req)); }
  @Get('assets') @ApiOperation({ summary: 'List inventory assets' }) @RequirePermissions(PERMISSIONS.INVENTORY.ASSETS.VIEW, PERMISSIONS.INVENTORY.ASSETS.ALL, PERMISSIONS.INVENTORY.ALL)
  findAll(@Query() query: any) { return this.service.findAll(query); }
  @Get('assets/options') @ApiOperation({ summary: 'Get inventory assets for select options' }) @RequirePermissions(PERMISSIONS.INVENTORY.ASSETS.VIEW, PERMISSIONS.INVENTORY.ASSETS.ALL, PERMISSIONS.INVENTORY.ALL)
  getOptions() { return this.service.getOptions(); }
  @Get('assets/:id') @ApiOperation({ summary: 'Get inventory asset details' }) @RequirePermissions(PERMISSIONS.INVENTORY.ASSETS.VIEW, PERMISSIONS.INVENTORY.ASSETS.ALL, PERMISSIONS.INVENTORY.ALL)
  findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Patch('assets/:id') @ApiOperation({ summary: 'Update inventory asset' }) @RequirePermissions(PERMISSIONS.INVENTORY.ASSETS.EDIT, PERMISSIONS.INVENTORY.ASSETS.ALL, PERMISSIONS.INVENTORY.ALL)
  update(@Param('id') id: string, @Body() dto: UpdateInventoryAssetDto, @Req() req: any) { return this.service.update(id, dto, this.getUserId(req), this.getUserContext(req)); }
  @Delete('assets/:id') @ApiOperation({ summary: 'Delete inventory asset' }) @RequirePermissions(PERMISSIONS.INVENTORY.ASSETS.DELETE, PERMISSIONS.INVENTORY.ASSETS.ALL, PERMISSIONS.INVENTORY.ALL)
  remove(@Param('id') id: string, @Req() req: any) { return this.service.remove(id, this.getUserId(req)); }
}
