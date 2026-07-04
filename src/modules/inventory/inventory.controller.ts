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
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { PERMISSIONS } from 'src/common/constants/permissions';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/modules/auth/guards/permissions.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import {
  CreateInventoryAssetDto,
  CreateInventoryCategoryDto,
  CreateInventoryItemDto,
  CreateInventoryLocationDto,
  CreateInventoryMaintenanceDto,
  CreateInventoryMovementDto,
  CreateInventoryStockBatchDto,
  UpdateInventoryAssetDto,
  UpdateInventoryCategoryDto,
  UpdateInventoryItemDto,
  UpdateInventoryLocationDto,
  UpdateInventoryMaintenanceDto,
  UpdateInventoryStockBatchDto,
} from './dto/inventory.dto';
import { InventoryService } from './inventory.service';

@ApiTags('inventory')
@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  private getUserId(req: any) {
    return req.user?.userId || req.user?.id;
  }

  @Post('seed')
  @ApiOperation({ summary: 'Seed inventory defaults for current tenant' })
  @RequirePermissions(PERMISSIONS.INVENTORY.ALL)
  seedCurrentTenant() {
    return this.inventoryService.seedCurrentTenant();
  }

  @Get('overview')
  @ApiOperation({ summary: 'Get inventory overview' })
  @RequirePermissions(PERMISSIONS.INVENTORY.VIEW, PERMISSIONS.INVENTORY.ALL)
  overview() {
    return this.inventoryService.overview();
  }

  @Post('categories')
  @ApiOperation({ summary: 'Create inventory category' })
  @RequirePermissions(
    PERMISSIONS.INVENTORY.CATEGORIES.CREATE,
    PERMISSIONS.INVENTORY.CATEGORIES.ALL,
    PERMISSIONS.INVENTORY.ALL,
  )
  createCategory(@Body() dto: CreateInventoryCategoryDto, @Req() req: any) {
    return this.inventoryService.createCategory(dto, this.getUserId(req));
  }

  @Get('categories')
  @ApiOperation({ summary: 'List inventory categories' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @RequirePermissions(
    PERMISSIONS.INVENTORY.CATEGORIES.VIEW,
    PERMISSIONS.INVENTORY.CATEGORIES.ALL,
    PERMISSIONS.INVENTORY.ALL,
  )
  findCategories(@Query() query: any) {
    return this.inventoryService.findCategories(query);
  }

  @Get('categories/:id')
  @ApiOperation({ summary: 'Get inventory category details' })
  @RequirePermissions(
    PERMISSIONS.INVENTORY.CATEGORIES.VIEW,
    PERMISSIONS.INVENTORY.CATEGORIES.ALL,
    PERMISSIONS.INVENTORY.ALL,
  )
  findCategory(@Param('id') id: string) {
    return this.inventoryService.findCategory(id);
  }

  @Patch('categories/:id')
  @ApiOperation({ summary: 'Update inventory category' })
  @RequirePermissions(
    PERMISSIONS.INVENTORY.CATEGORIES.EDIT,
    PERMISSIONS.INVENTORY.CATEGORIES.ALL,
    PERMISSIONS.INVENTORY.ALL,
  )
  updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateInventoryCategoryDto,
    @Req() req: any,
  ) {
    return this.inventoryService.updateCategory(id, dto, this.getUserId(req));
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: 'Delete inventory category' })
  @RequirePermissions(
    PERMISSIONS.INVENTORY.CATEGORIES.DELETE,
    PERMISSIONS.INVENTORY.CATEGORIES.ALL,
    PERMISSIONS.INVENTORY.ALL,
  )
  deleteCategory(@Param('id') id: string, @Req() req: any) {
    return this.inventoryService.deleteCategory(id, this.getUserId(req));
  }

  @Post('items')
  @ApiOperation({ summary: 'Create inventory item' })
  @RequirePermissions(
    PERMISSIONS.INVENTORY.ITEMS.CREATE,
    PERMISSIONS.INVENTORY.ITEMS.ALL,
    PERMISSIONS.INVENTORY.ALL,
  )
  createItem(@Body() dto: CreateInventoryItemDto, @Req() req: any) {
    return this.inventoryService.createItem(dto, this.getUserId(req));
  }

  @Get('items')
  @ApiOperation({ summary: 'List inventory items' })
  @RequirePermissions(
    PERMISSIONS.INVENTORY.ITEMS.VIEW,
    PERMISSIONS.INVENTORY.ITEMS.ALL,
    PERMISSIONS.INVENTORY.ALL,
  )
  findItems(@Query() query: any) {
    return this.inventoryService.findItems(query);
  }

  @Get('items/:id')
  @ApiOperation({ summary: 'Get inventory item details' })
  @RequirePermissions(
    PERMISSIONS.INVENTORY.ITEMS.VIEW,
    PERMISSIONS.INVENTORY.ITEMS.ALL,
    PERMISSIONS.INVENTORY.ALL,
  )
  findItem(@Param('id') id: string) {
    return this.inventoryService.findItem(id);
  }

  @Patch('items/:id')
  @ApiOperation({ summary: 'Update inventory item' })
  @RequirePermissions(
    PERMISSIONS.INVENTORY.ITEMS.EDIT,
    PERMISSIONS.INVENTORY.ITEMS.ALL,
    PERMISSIONS.INVENTORY.ALL,
  )
  updateItem(
    @Param('id') id: string,
    @Body() dto: UpdateInventoryItemDto,
    @Req() req: any,
  ) {
    return this.inventoryService.updateItem(id, dto, this.getUserId(req));
  }

  @Delete('items/:id')
  @ApiOperation({ summary: 'Delete inventory item' })
  @RequirePermissions(
    PERMISSIONS.INVENTORY.ITEMS.DELETE,
    PERMISSIONS.INVENTORY.ITEMS.ALL,
    PERMISSIONS.INVENTORY.ALL,
  )
  deleteItem(@Param('id') id: string, @Req() req: any) {
    return this.inventoryService.deleteItem(id, this.getUserId(req));
  }

  @Post('locations')
  @ApiOperation({ summary: 'Create inventory location' })
  @RequirePermissions(
    PERMISSIONS.INVENTORY.LOCATIONS.CREATE,
    PERMISSIONS.INVENTORY.LOCATIONS.ALL,
    PERMISSIONS.INVENTORY.ALL,
  )
  createLocation(@Body() dto: CreateInventoryLocationDto, @Req() req: any) {
    return this.inventoryService.createLocation(dto, this.getUserId(req));
  }

  @Get('locations')
  @ApiOperation({ summary: 'List inventory locations' })
  @RequirePermissions(
    PERMISSIONS.INVENTORY.LOCATIONS.VIEW,
    PERMISSIONS.INVENTORY.LOCATIONS.ALL,
    PERMISSIONS.INVENTORY.ALL,
  )
  findLocations(@Query() query: any) {
    return this.inventoryService.findLocations(query);
  }

  @Get('locations/:id')
  @ApiOperation({ summary: 'Get inventory location details' })
  @RequirePermissions(
    PERMISSIONS.INVENTORY.LOCATIONS.VIEW,
    PERMISSIONS.INVENTORY.LOCATIONS.ALL,
    PERMISSIONS.INVENTORY.ALL,
  )
  findLocation(@Param('id') id: string) {
    return this.inventoryService.findLocation(id);
  }

  @Patch('locations/:id')
  @ApiOperation({ summary: 'Update inventory location' })
  @RequirePermissions(
    PERMISSIONS.INVENTORY.LOCATIONS.EDIT,
    PERMISSIONS.INVENTORY.LOCATIONS.ALL,
    PERMISSIONS.INVENTORY.ALL,
  )
  updateLocation(
    @Param('id') id: string,
    @Body() dto: UpdateInventoryLocationDto,
    @Req() req: any,
  ) {
    return this.inventoryService.updateLocation(id, dto, this.getUserId(req));
  }

  @Delete('locations/:id')
  @ApiOperation({ summary: 'Delete inventory location' })
  @RequirePermissions(
    PERMISSIONS.INVENTORY.LOCATIONS.DELETE,
    PERMISSIONS.INVENTORY.LOCATIONS.ALL,
    PERMISSIONS.INVENTORY.ALL,
  )
  deleteLocation(@Param('id') id: string, @Req() req: any) {
    return this.inventoryService.deleteLocation(id, this.getUserId(req));
  }

  @Post('stock-batches')
  @ApiOperation({ summary: 'Create inventory stock batch' })
  @RequirePermissions(
    PERMISSIONS.INVENTORY.STOCK.CREATE,
    PERMISSIONS.INVENTORY.STOCK.ALL,
    PERMISSIONS.INVENTORY.ALL,
  )
  createStockBatch(@Body() dto: CreateInventoryStockBatchDto, @Req() req: any) {
    return this.inventoryService.createStockBatch(dto, this.getUserId(req));
  }

  @Get('stock-batches')
  @ApiOperation({ summary: 'List inventory stock batches' })
  @RequirePermissions(
    PERMISSIONS.INVENTORY.STOCK.VIEW,
    PERMISSIONS.INVENTORY.STOCK.ALL,
    PERMISSIONS.INVENTORY.ALL,
  )
  findStockBatches(@Query() query: any) {
    return this.inventoryService.findStockBatches(query);
  }

  @Get('stock-batches/:id')
  @ApiOperation({ summary: 'Get inventory stock batch details' })
  @RequirePermissions(
    PERMISSIONS.INVENTORY.STOCK.VIEW,
    PERMISSIONS.INVENTORY.STOCK.ALL,
    PERMISSIONS.INVENTORY.ALL,
  )
  findStockBatch(@Param('id') id: string) {
    return this.inventoryService.findStockBatch(id);
  }

  @Patch('stock-batches/:id')
  @ApiOperation({ summary: 'Update inventory stock batch' })
  @RequirePermissions(
    PERMISSIONS.INVENTORY.STOCK.EDIT,
    PERMISSIONS.INVENTORY.STOCK.ALL,
    PERMISSIONS.INVENTORY.ALL,
  )
  updateStockBatch(
    @Param('id') id: string,
    @Body() dto: UpdateInventoryStockBatchDto,
    @Req() req: any,
  ) {
    return this.inventoryService.updateStockBatch(id, dto, this.getUserId(req));
  }

  @Delete('stock-batches/:id')
  @ApiOperation({ summary: 'Delete inventory stock batch' })
  @RequirePermissions(
    PERMISSIONS.INVENTORY.STOCK.DELETE,
    PERMISSIONS.INVENTORY.STOCK.ALL,
    PERMISSIONS.INVENTORY.ALL,
  )
  deleteStockBatch(@Param('id') id: string, @Req() req: any) {
    return this.inventoryService.deleteStockBatch(id, this.getUserId(req));
  }

  @Post('assets')
  @ApiOperation({ summary: 'Create inventory asset' })
  @RequirePermissions(
    PERMISSIONS.INVENTORY.ASSETS.CREATE,
    PERMISSIONS.INVENTORY.ASSETS.ALL,
    PERMISSIONS.INVENTORY.ALL,
  )
  createAsset(@Body() dto: CreateInventoryAssetDto, @Req() req: any) {
    return this.inventoryService.createAsset(dto, this.getUserId(req), {
      role: req.user?.role as Role | undefined,
      schema: req.user?.schema,
    });
  }

  @Get('users/active-list')
  @ApiOperation({ summary: 'List assignable users for inventory assets' })
  @RequirePermissions(
    PERMISSIONS.INVENTORY.ASSETS.VIEW,
    PERMISSIONS.INVENTORY.ASSETS.ALL,
    PERMISSIONS.INVENTORY.ALL,
  )
  findAssignableUsers(@Req() req: any) {
    return this.inventoryService.findAssignableUsers({
      role: req.user?.role as Role | undefined,
      schema: req.user?.schema,
    });
  }

  @Get('assets')
  @ApiOperation({ summary: 'List inventory assets' })
  @RequirePermissions(
    PERMISSIONS.INVENTORY.ASSETS.VIEW,
    PERMISSIONS.INVENTORY.ASSETS.ALL,
    PERMISSIONS.INVENTORY.ALL,
  )
  findAssets(@Query() query: any) {
    return this.inventoryService.findAssets(query);
  }

  @Get('assets/:id')
  @ApiOperation({ summary: 'Get inventory asset details' })
  @RequirePermissions(
    PERMISSIONS.INVENTORY.ASSETS.VIEW,
    PERMISSIONS.INVENTORY.ASSETS.ALL,
    PERMISSIONS.INVENTORY.ALL,
  )
  findAsset(@Param('id') id: string) {
    return this.inventoryService.findAsset(id);
  }

  @Patch('assets/:id')
  @ApiOperation({ summary: 'Update inventory asset' })
  @RequirePermissions(
    PERMISSIONS.INVENTORY.ASSETS.EDIT,
    PERMISSIONS.INVENTORY.ASSETS.ALL,
    PERMISSIONS.INVENTORY.ALL,
  )
  updateAsset(
    @Param('id') id: string,
    @Body() dto: UpdateInventoryAssetDto,
    @Req() req: any,
  ) {
    return this.inventoryService.updateAsset(id, dto, this.getUserId(req), {
      role: req.user?.role as Role | undefined,
      schema: req.user?.schema,
    });
  }

  @Delete('assets/:id')
  @ApiOperation({ summary: 'Delete inventory asset' })
  @RequirePermissions(
    PERMISSIONS.INVENTORY.ASSETS.DELETE,
    PERMISSIONS.INVENTORY.ASSETS.ALL,
    PERMISSIONS.INVENTORY.ALL,
  )
  deleteAsset(@Param('id') id: string, @Req() req: any) {
    return this.inventoryService.deleteAsset(id, this.getUserId(req));
  }

  @Post('movements')
  @ApiOperation({ summary: 'Create inventory movement' })
  @RequirePermissions(
    PERMISSIONS.INVENTORY.MOVEMENTS.CREATE,
    PERMISSIONS.INVENTORY.MOVEMENTS.ALL,
    PERMISSIONS.INVENTORY.ALL,
  )
  createMovement(@Body() dto: CreateInventoryMovementDto, @Req() req: any) {
    return this.inventoryService.createMovement(dto, this.getUserId(req));
  }

  @Get('movements')
  @ApiOperation({ summary: 'List inventory movements' })
  @RequirePermissions(
    PERMISSIONS.INVENTORY.MOVEMENTS.VIEW,
    PERMISSIONS.INVENTORY.MOVEMENTS.ALL,
    PERMISSIONS.INVENTORY.ALL,
  )
  findMovements(@Query() query: any) {
    return this.inventoryService.findMovements(query);
  }

  @Get('movements/:id')
  @ApiOperation({ summary: 'Get inventory movement details' })
  @RequirePermissions(
    PERMISSIONS.INVENTORY.MOVEMENTS.VIEW,
    PERMISSIONS.INVENTORY.MOVEMENTS.ALL,
    PERMISSIONS.INVENTORY.ALL,
  )
  findMovement(@Param('id') id: string) {
    return this.inventoryService.findMovement(id);
  }

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

  @Post('maintenance')
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
    return this.inventoryService.createMaintenance(dto, this.getUserId(req));
  }

  @Get('maintenance')
  @ApiOperation({ summary: 'List inventory maintenance records' })
  @RequirePermissions(
    PERMISSIONS.INVENTORY.MAINTENANCE.VIEW,
    PERMISSIONS.INVENTORY.MAINTENANCE.ALL,
    PERMISSIONS.INVENTORY.ALL,
  )
  findMaintenances(@Query() query: any) {
    return this.inventoryService.findMaintenances(query);
  }

  @Get('maintenance/:id')
  @ApiOperation({ summary: 'Get inventory maintenance details' })
  @RequirePermissions(
    PERMISSIONS.INVENTORY.MAINTENANCE.VIEW,
    PERMISSIONS.INVENTORY.MAINTENANCE.ALL,
    PERMISSIONS.INVENTORY.ALL,
  )
  findMaintenance(@Param('id') id: string) {
    return this.inventoryService.findMaintenance(id);
  }

  @Patch('maintenance/:id')
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
    return this.inventoryService.updateMaintenance(
      id,
      dto,
      this.getUserId(req),
    );
  }

  @Delete('maintenance/:id')
  @ApiOperation({ summary: 'Delete inventory maintenance record' })
  @RequirePermissions(
    PERMISSIONS.INVENTORY.MAINTENANCE.DELETE,
    PERMISSIONS.INVENTORY.MAINTENANCE.ALL,
    PERMISSIONS.INVENTORY.ALL,
  )
  deleteMaintenance(@Param('id') id: string, @Req() req: any) {
    return this.inventoryService.deleteMaintenance(id, this.getUserId(req));
  }
}
