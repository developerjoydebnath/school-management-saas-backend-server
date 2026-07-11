import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from 'src/common/constants/permissions';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/modules/auth/guards/permissions.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { CreateInventoryCategoryDto, UpdateInventoryCategoryDto } from './dto/inventory-category.dto';
import { InventoryCategoriesService } from './inventory-categories.service';

@ApiTags('inventory categories')
@Controller('inventory/categories')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class InventoryCategoriesController {
  constructor(private readonly service: InventoryCategoriesService) {}

  private getUserId(req: any) {
    return req.user?.userId || req.user?.id;
  }

  @Post()
  @ApiOperation({ summary: 'Create inventory category' })
  @RequirePermissions(PERMISSIONS.INVENTORY.CATEGORIES.CREATE, PERMISSIONS.INVENTORY.CATEGORIES.ALL, PERMISSIONS.INVENTORY.ALL)
  create(@Body() dto: CreateInventoryCategoryDto, @Req() req: any) {
    return this.service.create(dto, this.getUserId(req));
  }

  @Get()
  @ApiOperation({ summary: 'List inventory categories' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'isActive', required: false })
  @ApiQuery({ name: 'isSystem', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @RequirePermissions(PERMISSIONS.INVENTORY.CATEGORIES.VIEW, PERMISSIONS.INVENTORY.CATEGORIES.ALL, PERMISSIONS.INVENTORY.ALL)
  findAll(@Query() query: any) {
    return this.service.findAll(query);
  }

  @Get('options')
  @ApiOperation({ summary: 'Get inventory categories for select options' })
  @RequirePermissions(PERMISSIONS.INVENTORY.CATEGORIES.VIEW, PERMISSIONS.INVENTORY.CATEGORIES.ALL, PERMISSIONS.INVENTORY.ALL)
  getOptions() {
    return this.service.getOptions();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get inventory category details' })
  @RequirePermissions(PERMISSIONS.INVENTORY.CATEGORIES.VIEW, PERMISSIONS.INVENTORY.CATEGORIES.ALL, PERMISSIONS.INVENTORY.ALL)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update inventory category' })
  @RequirePermissions(PERMISSIONS.INVENTORY.CATEGORIES.EDIT, PERMISSIONS.INVENTORY.CATEGORIES.ALL, PERMISSIONS.INVENTORY.ALL)
  update(@Param('id') id: string, @Body() dto: UpdateInventoryCategoryDto, @Req() req: any) {
    return this.service.update(id, dto, this.getUserId(req));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete inventory category' })
  @RequirePermissions(PERMISSIONS.INVENTORY.CATEGORIES.DELETE, PERMISSIONS.INVENTORY.CATEGORIES.ALL, PERMISSIONS.INVENTORY.ALL)
  remove(@Param('id') id: string, @Req() req: any) {
    return this.service.remove(id, this.getUserId(req));
  }
}
