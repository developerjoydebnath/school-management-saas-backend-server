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
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from 'src/common/constants/permissions';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/modules/auth/guards/permissions.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { AdmissionApplicationsService } from './admission-applications.service';
import {
  ApproveAdmissionDto,
  RejectAdmissionDto,
  WaitlistAdmissionDto,
} from './dto/admission-application.dto';

@ApiTags('admissions')
@Controller('admissions')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class AdmissionApplicationsController {
  constructor(private readonly service: AdmissionApplicationsService) {}

  private userId(req: any) {
    return req.user?.userId || req.user?.id;
  }

  @Post()
  @ApiOperation({ summary: 'Create admission application' })
  @RequirePermissions(
    PERMISSIONS.ADMISSION.APPLICATIONS.CREATE,
    PERMISSIONS.ADMISSION.APPLICATIONS.ALL,
    PERMISSIONS.ADMISSION.ALL,
  )
  create(@Body() dto: any, @Req() req: any) {
    return this.service.create(dto, this.userId(req));
  }

  @Get()
  @ApiOperation({ summary: 'List admission applications' })
  @RequirePermissions(
    PERMISSIONS.ADMISSION.APPLICATIONS.VIEW,
    PERMISSIONS.ADMISSION.APPLICATIONS.ALL,
    PERMISSIONS.ADMISSION.ALL,
  )
  findAll(@Query() query: any) {
    return this.service.findAll(query);
  }

  @Get('rolls')
  @ApiOperation({ summary: 'List student rolls for class/session/section' })
  @RequirePermissions(
    PERMISSIONS.ADMISSION.APPLICATIONS.VIEW,
    PERMISSIONS.ADMISSION.APPLICATIONS.ALL,
    PERMISSIONS.ADMISSION.ALL,
  )
  rolls(@Query() query: any) {
    return this.service.rolls(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get admission application details' })
  @RequirePermissions(
    PERMISSIONS.ADMISSION.APPLICATIONS.VIEW,
    PERMISSIONS.ADMISSION.APPLICATIONS.ALL,
    PERMISSIONS.ADMISSION.ALL,
  )
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update admission application' })
  @RequirePermissions(
    PERMISSIONS.ADMISSION.APPLICATIONS.EDIT,
    PERMISSIONS.ADMISSION.APPLICATIONS.ALL,
    PERMISSIONS.ADMISSION.ALL,
  )
  update(
    @Param('id') id: string,
    @Body() dto: any,
    @Req() req: any,
  ) {
    return this.service.update(id, dto, this.userId(req));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete admission application' })
  @RequirePermissions(
    PERMISSIONS.ADMISSION.APPLICATIONS.DELETE,
    PERMISSIONS.ADMISSION.APPLICATIONS.ALL,
    PERMISSIONS.ADMISSION.ALL,
  )
  remove(@Param('id') id: string, @Req() req: any) {
    return this.service.remove(id, this.userId(req));
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve admission application and create student' })
  @RequirePermissions(
    PERMISSIONS.ADMISSION.APPLICATIONS.APPROVE,
    PERMISSIONS.ADMISSION.APPLICATIONS.ALL,
    PERMISSIONS.ADMISSION.ALL,
  )
  approve(@Param('id') id: string, @Body() dto: ApproveAdmissionDto, @Req() req: any) {
    return this.service.approve(id, dto, this.userId(req));
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject admission application' })
  @RequirePermissions(
    PERMISSIONS.ADMISSION.APPLICATIONS.REJECT,
    PERMISSIONS.ADMISSION.APPLICATIONS.ALL,
    PERMISSIONS.ADMISSION.ALL,
  )
  reject(@Param('id') id: string, @Body() dto: RejectAdmissionDto, @Req() req: any) {
    return this.service.reject(id, dto, this.userId(req));
  }

  @Post(':id/waitlist')
  @ApiOperation({ summary: 'Waitlist admission application' })
  @RequirePermissions(
    PERMISSIONS.ADMISSION.APPLICATIONS.EDIT,
    PERMISSIONS.ADMISSION.APPLICATIONS.ALL,
    PERMISSIONS.ADMISSION.ALL,
  )
  waitlist(@Param('id') id: string, @Body() dto: WaitlistAdmissionDto, @Req() req: any) {
    return this.service.waitlist(id, dto, this.userId(req));
  }

  @Post(':id/eligible-for-payment')
  @ApiOperation({ summary: 'Mark admission application eligible for payment' })
  @RequirePermissions(
    PERMISSIONS.ADMISSION.APPLICATIONS.EDIT,
    PERMISSIONS.ADMISSION.APPLICATIONS.ALL,
    PERMISSIONS.ADMISSION.ALL,
  )
  markEligibleForPayment(@Param('id') id: string, @Req() req: any) {
    return this.service.markEligibleForPayment(id, this.userId(req));
  }
}
