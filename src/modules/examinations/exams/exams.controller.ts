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
import { PERMISSIONS } from 'src/common/constants/permissions';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/modules/auth/guards/permissions.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import {
  CreateExamDto,
  ExamStatusEnum,
  UpdateExamDto,
  UpdateExamSubjectDto,
} from './dto/exam.dto';
import { ExamsService } from './exams.service';

@ApiTags('exams')
@Controller('exams')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Post()
  @ApiOperation({ summary: 'Create exam and copy subject mark setup' })
  @RequirePermissions(PERMISSIONS.EXAMS.CREATE, PERMISSIONS.EXAMS.ALL)
  create(@Body() dto: CreateExamDto, @Req() req: any) {
    return this.examsService.create(dto, req.user?.id);
  }

  @Get()
  @ApiOperation({ summary: 'List exams' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'sessionId', required: false })
  @ApiQuery({ name: 'classId', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @RequirePermissions(PERMISSIONS.EXAMS.VIEW, PERMISSIONS.EXAMS.ALL)
  findAll(@Query() query: any) {
    return this.examsService.findAll(query);
  }

  @Get('active-list')
  @ApiOperation({ summary: 'List active exams for select boxes' })
  @RequirePermissions(PERMISSIONS.EXAMS.VIEW, PERMISSIONS.EXAMS.ALL)
  findActiveList(@Query() query: any) {
    return this.examsService.findActiveList(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get exam details' })
  @RequirePermissions(PERMISSIONS.EXAMS.VIEW, PERMISSIONS.EXAMS.ALL)
  findOne(@Param('id') id: string) {
    return this.examsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update exam' })
  @RequirePermissions(PERMISSIONS.EXAMS.EDIT, PERMISSIONS.EXAMS.ALL)
  update(@Param('id') id: string, @Body() dto: UpdateExamDto) {
    return this.examsService.update(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Change exam status' })
  @RequirePermissions(PERMISSIONS.EXAMS.EDIT, PERMISSIONS.EXAMS.ALL)
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: ExamStatusEnum,
  ) {
    return this.examsService.updateStatus(id, status);
  }

  @Patch(':id/subjects/:subjectId')
  @ApiOperation({ summary: 'Update exam subject schedule and marks' })
  @RequirePermissions(PERMISSIONS.EXAMS.EDIT, PERMISSIONS.EXAMS.ALL)
  updateSubject(
    @Param('id') id: string,
    @Param('subjectId') subjectId: string,
    @Body() dto: UpdateExamSubjectDto,
  ) {
    return this.examsService.updateSubject(id, subjectId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete exam' })
  @RequirePermissions(PERMISSIONS.EXAMS.DELETE, PERMISSIONS.EXAMS.ALL)
  remove(@Param('id') id: string, @Req() req: any) {
    return this.examsService.remove(id, req.user?.id);
  }
}
