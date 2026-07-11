import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PERMISSIONS } from 'src/common/constants/permissions';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/modules/auth/guards/permissions.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { UpdateStudentDto, UpdateStudentStatusDto } from './dto/student.dto';
import { StudentsService } from './students.service';

@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  private userId(req: any) {
    return req.user?.userId || req.user?.id;
  }

  @Get()
  @RequirePermissions(
    PERMISSIONS.STUDENTS.DIRECTORY.VIEW,
    PERMISSIONS.STUDENTS.DIRECTORY.ALL,
    PERMISSIONS.STUDENTS.ALL,
  )
  findAll(@Query() query: any) {
    return this.studentsService.findAll(query);
  }

  @Get('classes-summary')
  @RequirePermissions(
    PERMISSIONS.STUDENTS.DIRECTORY.VIEW,
    PERMISSIONS.STUDENTS.DIRECTORY.ALL,
    PERMISSIONS.STUDENTS.ALL,
  )
  classesSummary(@Query() query: any) {
    return this.studentsService.classesSummary(query);
  }

  @Get('options')
  @RequirePermissions(
    PERMISSIONS.STUDENTS.DIRECTORY.VIEW,
    PERMISSIONS.STUDENTS.DIRECTORY.ALL,
    PERMISSIONS.STUDENTS.ALL,
  )
  options(@Query() query: any) {
    return this.studentsService.options(query);
  }

  @Get('by-class/:classId')
  @RequirePermissions(
    PERMISSIONS.STUDENTS.DIRECTORY.VIEW,
    PERMISSIONS.STUDENTS.DIRECTORY.ALL,
    PERMISSIONS.STUDENTS.ALL,
  )
  byClass(@Param('classId') classId: string, @Query() query: any) {
    return this.studentsService.byClass(classId, query);
  }

  @Get(':id')
  @RequirePermissions(
    PERMISSIONS.STUDENTS.PROFILE.VIEW,
    PERMISSIONS.STUDENTS.PROFILE.ALL,
    PERMISSIONS.STUDENTS.ALL,
  )
  findOne(@Param('id') id: string) {
    return this.studentsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(
    PERMISSIONS.STUDENTS.PROFILE.EDIT,
    PERMISSIONS.STUDENTS.PROFILE.ALL,
    PERMISSIONS.STUDENTS.ALL,
  )
  update(@Param('id') id: string, @Body() dto: UpdateStudentDto, @Req() req: any) {
    return this.studentsService.update(id, dto, this.userId(req));
  }

  @Patch(':id/status')
  @RequirePermissions(
    PERMISSIONS.STUDENTS.PROFILE.STATUS,
    PERMISSIONS.STUDENTS.PROFILE.ALL,
    PERMISSIONS.STUDENTS.ALL,
  )
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStudentStatusDto,
    @Req() req: any,
  ) {
    return this.studentsService.updateStatus(id, dto, this.userId(req));
  }

  @Delete(':id')
  @RequirePermissions(
    PERMISSIONS.STUDENTS.PROFILE.DELETE,
    PERMISSIONS.STUDENTS.PROFILE.ALL,
    PERMISSIONS.STUDENTS.ALL,
  )
  remove(@Param('id') id: string, @Req() req: any) {
    return this.studentsService.remove(id, this.userId(req));
  }
}
