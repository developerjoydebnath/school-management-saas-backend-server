import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PERMISSIONS } from 'src/common/constants/permissions';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/modules/auth/guards/permissions.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { AdmissionPortalService } from './admission-portal.service';

@Controller('admission/portal')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class AdmissionPortalAdminController {
  constructor(private readonly admissionPortalService: AdmissionPortalService) {}

  private userId(req: any) {
    return req.user?.userId || req.user?.id;
  }

  @Get('config')
  @RequirePermissions(
    PERMISSIONS.ADMISSION.SETTINGS.VIEW,
    PERMISSIONS.ADMISSION.SETTINGS.ALL,
    PERMISSIONS.ADMISSION.ALL,
  )
  config(@Query('sessionId') sessionId: string | undefined, @Req() req: any) {
    return this.admissionPortalService.adminConfig(sessionId, this.userId(req));
  }

  @Put('config')
  @RequirePermissions(
    PERMISSIONS.ADMISSION.SETTINGS.EDIT,
    PERMISSIONS.ADMISSION.SETTINGS.ALL,
    PERMISSIONS.ADMISSION.ALL,
  )
  updateConfig(@Body() dto: any, @Req() req: any) {
    return this.admissionPortalService.updateAdminConfig(dto, this.userId(req));
  }
}

@Controller('public/admission')
export class AdmissionPortalController {
  constructor(private readonly admissionPortalService: AdmissionPortalService) {}

  @Get(':slug/config')
  config(@Param('slug') slug: string) {
    return this.admissionPortalService.config(slug);
  }

  @Get(':slug/fee')
  fee(
    @Param('slug') slug: string,
    @Query('classId') classId: string | undefined,
  ) {
    return this.admissionPortalService.fee(slug, classId);
  }

  @Post(':slug/applications')
  createApplication(
    @Param('slug') slug: string,
    @Body() dto: any,
    @Req() req: any,
  ) {
    return this.admissionPortalService.createApplication(slug, dto, req);
  }
}
