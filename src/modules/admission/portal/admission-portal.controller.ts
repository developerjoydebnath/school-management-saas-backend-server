import {
  All,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { PERMISSIONS } from 'src/common/constants/permissions';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { ApiKeyOptional } from 'src/cores/api-key/decorators/api-key-optional.decorator';
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

  @Get(':slug/payments/:applicationId')
  paymentDetails(
    @Param('slug') slug: string,
    @Param('applicationId') applicationId: string,
  ) {
    return this.admissionPortalService.paymentDetails(slug, applicationId);
  }

  @Post(':slug/payments/:applicationId')
  submitPayment(
    @Param('slug') slug: string,
    @Param('applicationId') applicationId: string,
    @Body() dto: any,
  ) {
    return this.admissionPortalService.submitPayment(slug, applicationId, dto);
  }
}

@Controller('payments/sslcommerz')
@ApiKeyOptional()
export class SslCommerzPaymentController {
  constructor(private readonly admissionPortalService: AdmissionPortalService) {}

  private callbackPayload(req: any) {
    return {
      ...(req.query || {}),
      ...(req.body || {}),
    };
  }

  private async redirectResult(kind: 'success' | 'fail' | 'cancel' | 'ipn', req: any, res: any) {
    const result = await this.admissionPortalService.handleSslCommerzCallback(
      kind,
      this.callbackPayload(req),
    );
    return res.redirect(this.admissionPortalService.paymentResultUrl(result));
  }

  @All('success')
  success(@Req() req: any, @Res() res: any) {
    return this.redirectResult('success', req, res);
  }

  @All('fail')
  fail(@Req() req: any, @Res() res: any) {
    return this.redirectResult('fail', req, res);
  }

  @All('cancel')
  cancel(@Req() req: any, @Res() res: any) {
    return this.redirectResult('cancel', req, res);
  }

  @All('ipn')
  ipn(@Req() req: any) {
    return this.admissionPortalService.handleSslCommerzCallback(
      'ipn',
      this.callbackPayload(req),
    );
  }
}
