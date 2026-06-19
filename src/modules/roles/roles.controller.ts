import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';
import { RolesService } from './roles.service';

@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @RequirePermissions(
    PERMISSIONS.ROLES.MANAGEMENT.CREATE,
    PERMISSIONS.ROLES.ALL,
  )
  create(@Body() createRoleDto: CreateRoleDto) {
    return this.rolesService.create(createRoleDto);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.ROLES.VIEW, PERMISSIONS.ROLES.ALL)
  findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
  ) {
    return this.rolesService.findAll(page, limit, search);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.ROLES.VIEW, PERMISSIONS.ROLES.ALL)
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.ROLES.MANAGEMENT.EDIT, PERMISSIONS.ROLES.ALL)
  update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    return this.rolesService.update(id, updateRoleDto);
  }

  @Delete(':id')
  @RequirePermissions(
    PERMISSIONS.ROLES.MANAGEMENT.DELETE,
    PERMISSIONS.ROLES.ALL,
  )
  remove(@Param('id') id: string) {
    return this.rolesService.remove(id);
  }
}
