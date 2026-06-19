import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PERMISSIONS } from 'src/common/constants/permissions';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/modules/auth/guards/permissions.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { CreatePermissionDto, UpdatePermissionDto } from './dto/permission.dto';
import { PermissionsService } from './permissions.service';

@Controller('permissions')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.ROLES.MATRIX.CREATE, PERMISSIONS.ROLES.ALL)
  create(@Body() createPermissionDto: CreatePermissionDto) {
    return this.permissionsService.create(createPermissionDto);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.ROLES.MATRIX.VIEW, PERMISSIONS.ROLES.ALL)
  findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 1000,
    @Query('search') search?: string,
    @Query('modules') modules?: string | string[],
  ) {
    const modulesArray = Array.isArray(modules)
      ? modules
      : modules
        ? [modules]
        : undefined;
    return this.permissionsService.findAll(page, limit, search, modulesArray);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.ROLES.MATRIX.VIEW, PERMISSIONS.ROLES.ALL)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.permissionsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.ROLES.MATRIX.EDIT, PERMISSIONS.ROLES.ALL)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePermissionDto: UpdatePermissionDto,
  ) {
    return this.permissionsService.update(id, updatePermissionDto);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.ROLES.MATRIX.DELETE, PERMISSIONS.ROLES.ALL)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.permissionsService.remove(id);
  }
}
