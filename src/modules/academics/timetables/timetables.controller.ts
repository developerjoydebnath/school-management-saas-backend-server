import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from 'src/common/constants/permissions';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/modules/auth/guards/permissions.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { SaveTimetableDto } from './dto/timetable.dto';
import { TimetablesService } from './timetables.service';

@ApiTags('timetables')
@Controller('timetables')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class TimetablesController {
  constructor(private readonly timetablesService: TimetablesService) {}

  @Get('current')
  @ApiOperation({ summary: 'Get current timetable for class or section' })
  @ApiQuery({ name: 'sessionId', required: false })
  @ApiQuery({ name: 'classId', required: true })
  @ApiQuery({ name: 'sectionId', required: false })
  @RequirePermissions(PERMISSIONS.TIMETABLE.VIEW, PERMISSIONS.TIMETABLE.ALL)
  findCurrent(
    @Query('sessionId') sessionId?: string,
    @Query('classId') classId?: string,
    @Query('sectionId') sectionId?: string,
  ) {
    return this.timetablesService.findCurrent({
      sessionId,
      classId,
      sectionId,
    });
  }

  @Get('subject-teachers')
  @ApiOperation({ summary: 'List teachers matching a subject' })
  @ApiQuery({ name: 'subjectId', required: true })
  @RequirePermissions(PERMISSIONS.TIMETABLE.VIEW, PERMISSIONS.TIMETABLE.ALL)
  findTeachersBySubject(@Query('subjectId') subjectId: string) {
    return this.timetablesService.findTeachersBySubject(subjectId);
  }

  @Get('history')
  @ApiOperation({ summary: 'List timetable history logs' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'sessionId', required: false })
  @ApiQuery({ name: 'classId', required: false })
  @ApiQuery({ name: 'sectionId', required: false })
  @ApiQuery({ name: 'savedFrom', required: false })
  @ApiQuery({ name: 'savedTo', required: false })
  @RequirePermissions(PERMISSIONS.TIMETABLE.VIEW, PERMISSIONS.TIMETABLE.ALL)
  findHistoryList(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sessionId') sessionId?: string,
    @Query('classId') classId?: string,
    @Query('sectionId') sectionId?: string,
    @Query('savedFrom') savedFrom?: string,
    @Query('savedTo') savedTo?: string,
  ) {
    return this.timetablesService.findHistoryList({
      page,
      limit,
      sessionId,
      classId,
      sectionId,
      savedFrom,
      savedTo,
    });
  }

  @Get('history/:historyId')
  @ApiOperation({ summary: 'Get timetable history snapshot by ID' })
  @RequirePermissions(PERMISSIONS.TIMETABLE.VIEW, PERMISSIONS.TIMETABLE.ALL)
  findHistoryOne(@Param('historyId') historyId: string) {
    return this.timetablesService.findHistoryOne(historyId);
  }

  @Get('print')
  @ApiOperation({ summary: 'Download selected class or section timetable PDF' })
  @ApiQuery({ name: 'sessionId', required: false })
  @ApiQuery({ name: 'classId', required: true })
  @ApiQuery({ name: 'sectionIds', required: false })
  @ApiQuery({ name: 'locale', required: false })
  @RequirePermissions(PERMISSIONS.TIMETABLE.VIEW, PERMISSIONS.TIMETABLE.ALL)
  async print(
    @Query('sessionId') sessionId: string,
    @Query('classId') classId: string,
    @Query('sectionIds') sectionIds: string | undefined,
    @Query('locale') locale: string | undefined,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.timetablesService.generatePrintPdf({
      sessionId,
      classId,
      sectionIds,
      locale,
    });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename=class-timetable.pdf',
      'Content-Length': pdfBuffer.length,
    });

    res.end(pdfBuffer);
  }

  @Post('save')
  @ApiOperation({ summary: 'Save timetable and write history snapshot' })
  @RequirePermissions(
    PERMISSIONS.TIMETABLE.CREATE,
    PERMISSIONS.TIMETABLE.EDIT,
    PERMISSIONS.TIMETABLE.ALL,
  )
  save(@Body() dto: SaveTimetableDto, @Req() req: any) {
    return this.timetablesService.save(dto, req.user?.id);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get timetable save history' })
  @RequirePermissions(PERMISSIONS.TIMETABLE.VIEW, PERMISSIONS.TIMETABLE.ALL)
  findHistory(@Param('id') id: string) {
    return this.timetablesService.findHistory(id);
  }
}
