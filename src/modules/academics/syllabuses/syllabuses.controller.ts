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
  CreateSyllabusDto,
  SyllabusStatusEnum,
  ToggleSyllabusTopicDto,
  UpdateSyllabusDto,
} from './dto/syllabus.dto';
import { SyllabusesService } from './syllabuses.service';

@ApiTags('syllabuses')
@Controller('syllabuses')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class SyllabusesController {
  constructor(private readonly syllabusesService: SyllabusesService) {}

  private getUserId(req: any) {
    return req.user?.userId || req.user?.id;
  }

  @Post()
  @ApiOperation({ summary: 'Create syllabus for class or sections' })
  @RequirePermissions(PERMISSIONS.SYLLABUS.CREATE, PERMISSIONS.SYLLABUS.ALL)
  create(@Body() dto: CreateSyllabusDto, @Req() req: any) {
    return this.syllabusesService.create(dto, this.getUserId(req));
  }

  @Get()
  @ApiOperation({ summary: 'List syllabuses' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'sessionId', required: false })
  @ApiQuery({ name: 'examId', required: false })
  @ApiQuery({ name: 'classId', required: false })
  @ApiQuery({ name: 'sectionId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @RequirePermissions(PERMISSIONS.SYLLABUS.VIEW, PERMISSIONS.SYLLABUS.ALL)
  findAll(@Query() query: any) {
    return this.syllabusesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get syllabus details' })
  @RequirePermissions(PERMISSIONS.SYLLABUS.VIEW, PERMISSIONS.SYLLABUS.ALL)
  findOne(@Param('id') id: string) {
    return this.syllabusesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update syllabus and write history' })
  @RequirePermissions(PERMISSIONS.SYLLABUS.EDIT, PERMISSIONS.SYLLABUS.ALL)
  update(@Param('id') id: string, @Body() dto: UpdateSyllabusDto, @Req() req: any) {
    return this.syllabusesService.update(id, dto, this.getUserId(req));
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Change syllabus status and write history' })
  @RequirePermissions(PERMISSIONS.SYLLABUS.EDIT, PERMISSIONS.SYLLABUS.ALL)
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: SyllabusStatusEnum,
    @Req() req: any,
  ) {
    return this.syllabusesService.updateStatus(id, status, this.getUserId(req));
  }

  @Patch(':id/topics/:topicId')
  @ApiOperation({ summary: 'Toggle syllabus topic progress' })
  @RequirePermissions(PERMISSIONS.SYLLABUS.EDIT, PERMISSIONS.SYLLABUS.ALL)
  toggleTopic(
    @Param('id') id: string,
    @Param('topicId') topicId: string,
    @Body() dto: ToggleSyllabusTopicDto,
    @Req() req: any,
  ) {
    return this.syllabusesService.toggleTopic(id, topicId, dto, this.getUserId(req));
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'List syllabus history' })
  @RequirePermissions(PERMISSIONS.SYLLABUS.VIEW, PERMISSIONS.SYLLABUS.ALL)
  findHistory(@Param('id') id: string, @Query() query: any) {
    return this.syllabusesService.findHistory(id, query);
  }

  @Get(':id/history/:historyId')
  @ApiOperation({ summary: 'Get syllabus history snapshot' })
  @RequirePermissions(PERMISSIONS.SYLLABUS.VIEW, PERMISSIONS.SYLLABUS.ALL)
  findHistoryOne(@Param('id') id: string, @Param('historyId') historyId: string) {
    return this.syllabusesService.findHistoryOne(id, historyId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete syllabus' })
  @RequirePermissions(PERMISSIONS.SYLLABUS.DELETE, PERMISSIONS.SYLLABUS.ALL)
  remove(@Param('id') id: string, @Req() req: any) {
    return this.syllabusesService.remove(id, this.getUserId(req));
  }
}
