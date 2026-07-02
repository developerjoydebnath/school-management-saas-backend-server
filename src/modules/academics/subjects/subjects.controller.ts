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
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from 'src/common/constants/permissions';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/modules/auth/guards/permissions.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { CreateSubjectDto, UpdateSubjectDto } from './dto/subject.dto';
import { SubjectsService } from './subjects.service';

@ApiTags('subjects')
@Controller('subjects')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Create subject' })
  @RequirePermissions(PERMISSIONS.SUBJECTS.CREATE, PERMISSIONS.SUBJECTS.ALL)
  create(@Body() dto: CreateSubjectDto) {
    return this.subjectsService.create(dto);
  }

  @Get('active-list')
  @ApiOperation({ summary: 'List active subjects' })
  @ApiQuery({ name: 'classId', required: false })
  @RequirePermissions(PERMISSIONS.SUBJECTS.VIEW, PERMISSIONS.SUBJECTS.ALL)
  findActiveList(@Query('classId') classId?: string) {
    return this.subjectsService.findActiveList({ classId });
  }

  @Get()
  @ApiOperation({ summary: 'List subjects' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'group', required: false })
  @ApiQuery({ name: 'classId', required: false })
  @RequirePermissions(PERMISSIONS.SUBJECTS.VIEW, PERMISSIONS.SUBJECTS.ALL)
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('group') group?: string,
    @Query('classId') classId?: string,
  ) {
    return this.subjectsService.findAll({
      page,
      limit,
      search,
      status,
      type,
      group,
      classId,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get subject details' })
  @RequirePermissions(PERMISSIONS.SUBJECTS.VIEW, PERMISSIONS.SUBJECTS.ALL)
  findOne(@Param('id') id: string) {
    return this.subjectsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update subject' })
  @RequirePermissions(PERMISSIONS.SUBJECTS.EDIT, PERMISSIONS.SUBJECTS.ALL)
  update(@Param('id') id: string, @Body() dto: UpdateSubjectDto) {
    return this.subjectsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete subject' })
  @RequirePermissions(PERMISSIONS.SUBJECTS.DELETE, PERMISSIONS.SUBJECTS.ALL)
  remove(@Param('id') id: string) {
    return this.subjectsService.remove(id);
  }
}
