import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { AdmissionPortalService } from './admission-portal.service';

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
