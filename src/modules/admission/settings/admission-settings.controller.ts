import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
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
import { AdmissionSettingsService } from './admission-settings.service';
import {
  AdmissionFieldConfigDto,
  AdmissionFeeHeadDto,
  UpdateAdmissionFieldsDto,
  UpsertAdmissionSettingsDto,
} from './dto/admission-settings.dto';

@ApiTags('admission-settings')
@Controller('admission/settings')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class AdmissionSettingsController {
  constructor(private readonly service: AdmissionSettingsService) {}

  private userId(req: any) {
    return req.user?.userId || req.user?.id;
  }

  @Get('current')
  @ApiOperation({ summary: 'Get current admission settings' })
  @RequirePermissions(
    PERMISSIONS.ADMISSION.SETTINGS.VIEW,
    PERMISSIONS.ADMISSION.SETTINGS.ALL,
    PERMISSIONS.ADMISSION.ALL,
  )
  getCurrent(@Query('sessionId') sessionId: string | undefined, @Req() req: any) {
    return this.service.getCurrent(sessionId, this.userId(req));
  }

  @Get('fee/calculate')
  @ApiOperation({ summary: 'Calculate current admission fee' })
  @RequirePermissions(
    PERMISSIONS.ADMISSION.SETTINGS.VIEW,
    PERMISSIONS.ADMISSION.SETTINGS.ALL,
    PERMISSIONS.ADMISSION.ALL,
  )
  calculateFee(
    @Query('sessionId') sessionId: string | undefined,
    @Query('classId') classId: string | undefined,
    @Query('manualDiscountType') manualDiscountType: string | undefined,
    @Query('manualDiscountScope') manualDiscountScope: string | undefined,
    @Query('manualDiscountValue') manualDiscountValue: string | undefined,
    @Query('manualDiscountReason') manualDiscountReason: string | undefined,
    @Query('quotaType') quotaType: string | undefined,
    @Req() req: any,
  ) {
    return this.service.calculateFee(sessionId, classId, this.userId(req), {
      type: manualDiscountType,
      scope: manualDiscountScope,
      value: manualDiscountValue ? Number(manualDiscountValue) : 0,
      reason: manualDiscountReason,
    }, quotaType);
  }

  @Get(':sessionId')
  @ApiOperation({ summary: 'Get admission settings by session' })
  @RequirePermissions(
    PERMISSIONS.ADMISSION.SETTINGS.VIEW,
    PERMISSIONS.ADMISSION.SETTINGS.ALL,
    PERMISSIONS.ADMISSION.ALL,
  )
  getBySession(@Param('sessionId') sessionId: string, @Req() req: any) {
    return this.service.getBySession(sessionId, this.userId(req));
  }

  @Put(':sessionId')
  @ApiOperation({ summary: 'Update admission settings' })
  @RequirePermissions(
    PERMISSIONS.ADMISSION.SETTINGS.EDIT,
    PERMISSIONS.ADMISSION.SETTINGS.ALL,
    PERMISSIONS.ADMISSION.ALL,
  )
  update(
    @Param('sessionId') sessionId: string,
    @Body() dto: UpsertAdmissionSettingsDto,
    @Req() req: any,
  ) {
    return this.service.update(sessionId, dto, this.userId(req));
  }

  @Get(':sessionId/fields')
  @ApiOperation({ summary: 'Get admission fields by session' })
  @RequirePermissions(
    PERMISSIONS.ADMISSION.SETTINGS.VIEW,
    PERMISSIONS.ADMISSION.SETTINGS.ALL,
    PERMISSIONS.ADMISSION.ALL,
  )
  getFields(@Param('sessionId') sessionId: string, @Req() req: any) {
    return this.service.getFields(sessionId, this.userId(req));
  }

  @Put(':sessionId/fields')
  @ApiOperation({ summary: 'Update admission fields by session' })
  @RequirePermissions(
    PERMISSIONS.ADMISSION.SETTINGS.EDIT,
    PERMISSIONS.ADMISSION.SETTINGS.ALL,
    PERMISSIONS.ADMISSION.ALL,
  )
  updateFields(
    @Param('sessionId') sessionId: string,
    @Body() dto: UpdateAdmissionFieldsDto,
    @Req() req: any,
  ) {
    return this.service.updateFields(sessionId, dto.fields, this.userId(req));
  }

  @Post(':sessionId/fields/custom')
  @ApiOperation({ summary: 'Create custom admission field' })
  @RequirePermissions(
    PERMISSIONS.ADMISSION.SETTINGS.EDIT,
    PERMISSIONS.ADMISSION.SETTINGS.ALL,
    PERMISSIONS.ADMISSION.ALL,
  )
  createCustomField(
    @Param('sessionId') sessionId: string,
    @Body() dto: AdmissionFieldConfigDto,
    @Req() req: any,
  ) {
    return this.service.createCustomField(sessionId, dto, this.userId(req));
  }

  @Delete('fields/:fieldId')
  @ApiOperation({ summary: 'Delete custom admission field' })
  @RequirePermissions(
    PERMISSIONS.ADMISSION.SETTINGS.EDIT,
    PERMISSIONS.ADMISSION.SETTINGS.ALL,
    PERMISSIONS.ADMISSION.ALL,
  )
  removeField(@Param('fieldId') fieldId: string, @Req() req: any) {
    return this.service.removeField(fieldId, this.userId(req));
  }

  @Get(':sessionId/fee-heads')
  @ApiOperation({ summary: 'Get admission fee heads by session' })
  @RequirePermissions(
    PERMISSIONS.ADMISSION.SETTINGS.VIEW,
    PERMISSIONS.ADMISSION.SETTINGS.ALL,
    PERMISSIONS.ADMISSION.ALL,
  )
  getFeeHeads(@Param('sessionId') sessionId: string, @Req() req: any) {
    return this.service.getFeeHeads(sessionId, this.userId(req));
  }

  @Post(':sessionId/fee-heads')
  @ApiOperation({ summary: 'Create admission fee head' })
  @RequirePermissions(
    PERMISSIONS.ADMISSION.SETTINGS.EDIT,
    PERMISSIONS.ADMISSION.SETTINGS.ALL,
    PERMISSIONS.ADMISSION.ALL,
  )
  createFeeHead(
    @Param('sessionId') sessionId: string,
    @Body() dto: AdmissionFeeHeadDto,
    @Req() req: any,
  ) {
    return this.service.createFeeHead(sessionId, dto, this.userId(req));
  }

  @Post(':sessionId/fee-heads/copy-previous')
  @ApiOperation({ summary: 'Copy admission fee heads from previous session' })
  @RequirePermissions(
    PERMISSIONS.ADMISSION.SETTINGS.EDIT,
    PERMISSIONS.ADMISSION.SETTINGS.ALL,
    PERMISSIONS.ADMISSION.ALL,
  )
  copyFeeHeadsFromPrevious(
    @Param('sessionId') sessionId: string,
    @Req() req: any,
  ) {
    return this.service.copyFeeHeadsFromPreviousSession(
      sessionId,
      this.userId(req),
    );
  }

  @Patch('fee-heads/:feeHeadId')
  @ApiOperation({ summary: 'Update admission fee head' })
  @RequirePermissions(
    PERMISSIONS.ADMISSION.SETTINGS.EDIT,
    PERMISSIONS.ADMISSION.SETTINGS.ALL,
    PERMISSIONS.ADMISSION.ALL,
  )
  updateFeeHead(
    @Param('feeHeadId') feeHeadId: string,
    @Body() dto: AdmissionFeeHeadDto,
    @Req() req: any,
  ) {
    return this.service.updateFeeHead(feeHeadId, dto, this.userId(req));
  }

  @Delete('fee-heads/:feeHeadId')
  @ApiOperation({ summary: 'Delete admission fee head' })
  @RequirePermissions(
    PERMISSIONS.ADMISSION.SETTINGS.EDIT,
    PERMISSIONS.ADMISSION.SETTINGS.ALL,
    PERMISSIONS.ADMISSION.ALL,
  )
  removeFeeHead(@Param('feeHeadId') feeHeadId: string, @Req() req: any) {
    return this.service.removeFeeHead(feeHeadId, this.userId(req));
  }

}
