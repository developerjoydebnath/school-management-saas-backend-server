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
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/department.dto';

@Controller('departments')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.STAFF.DEPARTMENTS.CREATE, PERMISSIONS.STAFF.DEPARTMENTS.ALL)
  create(@Body() dto: CreateDepartmentDto) {
    return this.departmentsService.create(dto);
  }

  @Get('active-list')
  @RequirePermissions(PERMISSIONS.STAFF.DEPARTMENTS.VIEW, PERMISSIONS.STAFF.DEPARTMENTS.ALL)
  findActiveList() {
    return this.departmentsService.findActiveList();
  }

  @Get()
  @RequirePermissions(PERMISSIONS.STAFF.DEPARTMENTS.VIEW, PERMISSIONS.STAFF.DEPARTMENTS.ALL)
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.departmentsService.findAll({ page, limit, search, isActive });
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.STAFF.DEPARTMENTS.VIEW, PERMISSIONS.STAFF.DEPARTMENTS.ALL)
  findOne(@Param('id') id: string) {
    return this.departmentsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.STAFF.DEPARTMENTS.EDIT, PERMISSIONS.STAFF.DEPARTMENTS.ALL)
  update(@Param('id') id: string, @Body() dto: UpdateDepartmentDto) {
    return this.departmentsService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.STAFF.DEPARTMENTS.DELETE, PERMISSIONS.STAFF.DEPARTMENTS.ALL)
  remove(@Param('id') id: string) {
    return this.departmentsService.remove(id);
  }
}
