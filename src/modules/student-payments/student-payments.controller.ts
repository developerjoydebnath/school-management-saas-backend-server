import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from 'src/common/constants/permissions';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/modules/auth/guards/permissions.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { StudentPaymentQueryDto } from './dto/student-payment.dto';
import { StudentPaymentsService } from './student-payments.service';

@ApiTags('student-payments')
@Controller('student-payments')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class StudentPaymentsController {
  constructor(private readonly service: StudentPaymentsService) {}

  @Get()
  @ApiOperation({ summary: 'List student payment collection history' })
  @RequirePermissions(
    PERMISSIONS.STUDENTS.PAYMENTS.VIEW,
    PERMISSIONS.STUDENTS.PAYMENTS.ALL,
    PERMISSIONS.STUDENTS.ALL,
  )
  findAll(@Query() query: StudentPaymentQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get student payment details' })
  @RequirePermissions(
    PERMISSIONS.STUDENTS.PAYMENTS.VIEW,
    PERMISSIONS.STUDENTS.PAYMENTS.ALL,
    PERMISSIONS.STUDENTS.ALL,
  )
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}

