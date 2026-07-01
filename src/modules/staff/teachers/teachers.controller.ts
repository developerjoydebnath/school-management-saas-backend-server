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
import { TeachersService } from './teachers.service';
import {
  CreateTeacherDto,
  TeacherFilterDto,
  UpdateTeacherDto,
  UpdateTeacherStatusDto,
} from './dto/teacher.dto';

@Controller('staff/teachers')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.STAFF.TEACHERS?.CREATE || 'staff.teachers.create', PERMISSIONS.STAFF.TEACHERS?.ALL || 'staff.teachers.all')
  create(@Body() dto: CreateTeacherDto) {
    return this.teachersService.create(dto);
  }

  @Get('short-list')
  @RequirePermissions(PERMISSIONS.STAFF.TEACHERS?.VIEW || 'staff.teachers.view', PERMISSIONS.STAFF.TEACHERS?.ALL || 'staff.teachers.all')
  findShortList() {
    return this.teachersService.findShortList();
  }

  @Get()
  @RequirePermissions(PERMISSIONS.STAFF.TEACHERS?.VIEW || 'staff.teachers.view', PERMISSIONS.STAFF.TEACHERS?.ALL || 'staff.teachers.all')
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query() filter?: TeacherFilterDto,
  ) {
    return this.teachersService.findAll({ page, limit, ...filter });
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.STAFF.TEACHERS?.VIEW || 'staff.teachers.view', PERMISSIONS.STAFF.TEACHERS?.ALL || 'staff.teachers.all')
  findOne(@Param('id') id: string) {
    return this.teachersService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.STAFF.TEACHERS?.EDIT || 'staff.teachers.edit', PERMISSIONS.STAFF.TEACHERS?.ALL || 'staff.teachers.all')
  update(@Param('id') id: string, @Body() dto: UpdateTeacherDto) {
    return this.teachersService.update(id, dto);
  }

  @Patch(':id/employment-status')
  @RequirePermissions(PERMISSIONS.STAFF.TEACHERS?.EDIT || 'staff.teachers.edit', PERMISSIONS.STAFF.TEACHERS?.ALL || 'staff.teachers.all')
  updateEmploymentStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTeacherStatusDto,
  ) {
    return this.teachersService.updateEmploymentStatus(id, dto.status);
  }

  @Delete(':id/documents/:documentId')
  @RequirePermissions(PERMISSIONS.STAFF.TEACHERS?.DELETE || 'staff.teachers.delete', PERMISSIONS.STAFF.TEACHERS?.ALL || 'staff.teachers.all')
  removeDocument(
    @Param('id') id: string,
    @Param('documentId') documentId: string,
  ) {
    return this.teachersService.removeDocument(id, documentId);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.STAFF.TEACHERS?.DELETE || 'staff.teachers.delete', PERMISSIONS.STAFF.TEACHERS?.ALL || 'staff.teachers.all')
  remove(@Param('id') id: string) {
    return this.teachersService.remove(id);
  }
}
