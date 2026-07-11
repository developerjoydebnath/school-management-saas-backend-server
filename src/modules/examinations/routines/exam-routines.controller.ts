import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { PERMISSIONS } from 'src/common/constants/permissions';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/modules/auth/guards/permissions.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { SaveExamRoutineDto } from './dto/exam-routine.dto';
import { ExamRoutinesService } from './exam-routines.service';

@ApiTags('exam-routines')
@Controller('exam-routines')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class ExamRoutinesController {
  constructor(private readonly examRoutinesService: ExamRoutinesService) {}

  @Get('current')
  @ApiOperation({ summary: 'Get exam routine for selected exam and class' })
  @ApiQuery({ name: 'examId', required: true })
  @ApiQuery({ name: 'classId', required: false })
  @RequirePermissions(PERMISSIONS.EXAMS.VIEW, PERMISSIONS.EXAMS.ALL)
  findCurrent(
    @Query('examId') examId?: string,
    @Query('classId') classId?: string,
  ) {
    return this.examRoutinesService.findCurrent({ examId, classId });
  }

  @Post('save')
  @ApiOperation({ summary: 'Save routine rows for selected exam class' })
  @RequirePermissions(
    PERMISSIONS.EXAMS.CREATE,
    PERMISSIONS.EXAMS.EDIT,
    PERMISSIONS.EXAMS.ALL,
  )
  save(@Body() dto: SaveExamRoutineDto) {
    return this.examRoutinesService.save(dto);
  }

  @Get('print')
  @ApiOperation({ summary: 'Download exam routine PDF' })
  @ApiQuery({ name: 'examId', required: true })
  @ApiQuery({ name: 'classId', required: false })
  @ApiQuery({ name: 'locale', required: false })
  @RequirePermissions(PERMISSIONS.EXAMS.VIEW, PERMISSIONS.EXAMS.ALL)
  async print(
    @Query('examId') examId: string,
    @Query('classId') classId: string | undefined,
    @Query('locale') locale: string | undefined,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.examRoutinesService.generatePrintPdf({
      examId,
      classId,
      locale,
    });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename=exam-routine.pdf',
      'Content-Length': pdfBuffer.length,
    });

    res.end(pdfBuffer);
  }
}
