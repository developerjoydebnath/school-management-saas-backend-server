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
import {
  CreatePaymentMethodSettingDto,
  UpdatePaymentMethodSettingDto,
  UpdatePaymentMethodStatusDto,
} from './dto/payment-method-setting.dto';
import { PaymentMethodSettingsService } from './payment-method-settings.service';

@ApiTags('settings-payment-methods')
@Controller('settings/payment-methods')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class PaymentMethodSettingsController {
  constructor(private readonly service: PaymentMethodSettingsService) {}

  private userId(req: any) {
    return req.user?.userId || req.user?.id;
  }

  @Get('providers')
  @ApiOperation({ summary: 'Get supported payment method providers' })
  @RequirePermissions(
    PERMISSIONS.SETTINGS.PAYMENT_METHODS.VIEW,
    PERMISSIONS.SETTINGS.PAYMENT_METHODS.ALL,
    PERMISSIONS.SETTINGS.ALL,
  )
  providers() {
    return this.service.providers();
  }

  @Get('active-options')
  @ApiOperation({ summary: 'Get active payment method options' })
  @RequirePermissions(
    PERMISSIONS.SETTINGS.PAYMENT_METHODS.VIEW,
    PERMISSIONS.SETTINGS.PAYMENT_METHODS.ALL,
    PERMISSIONS.SETTINGS.ALL,
  )
  activeOptions() {
    return this.service.activeOptions();
  }

  @Get()
  @ApiOperation({ summary: 'List configured payment methods' })
  @RequirePermissions(
    PERMISSIONS.SETTINGS.PAYMENT_METHODS.VIEW,
    PERMISSIONS.SETTINGS.PAYMENT_METHODS.ALL,
    PERMISSIONS.SETTINGS.ALL,
  )
  findAll(@Query() query: any) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get configured payment method details' })
  @RequirePermissions(
    PERMISSIONS.SETTINGS.PAYMENT_METHODS.VIEW,
    PERMISSIONS.SETTINGS.PAYMENT_METHODS.ALL,
    PERMISSIONS.SETTINGS.ALL,
  )
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create configured payment method' })
  @RequirePermissions(
    PERMISSIONS.SETTINGS.PAYMENT_METHODS.CREATE,
    PERMISSIONS.SETTINGS.PAYMENT_METHODS.ALL,
    PERMISSIONS.SETTINGS.ALL,
  )
  create(@Body() dto: CreatePaymentMethodSettingDto, @Req() req: any) {
    return this.service.create(dto, this.userId(req));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update configured payment method' })
  @RequirePermissions(
    PERMISSIONS.SETTINGS.PAYMENT_METHODS.EDIT,
    PERMISSIONS.SETTINGS.PAYMENT_METHODS.ALL,
    PERMISSIONS.SETTINGS.ALL,
  )
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentMethodSettingDto,
    @Req() req: any,
  ) {
    return this.service.update(id, dto, this.userId(req));
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update configured payment method status' })
  @RequirePermissions(
    PERMISSIONS.SETTINGS.PAYMENT_METHODS.EDIT,
    PERMISSIONS.SETTINGS.PAYMENT_METHODS.ALL,
    PERMISSIONS.SETTINGS.ALL,
  )
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentMethodStatusDto,
    @Req() req: any,
  ) {
    return this.service.updateStatus(id, dto.status, this.userId(req));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete configured payment method' })
  @RequirePermissions(
    PERMISSIONS.SETTINGS.PAYMENT_METHODS.DELETE,
    PERMISSIONS.SETTINGS.PAYMENT_METHODS.ALL,
    PERMISSIONS.SETTINGS.ALL,
  )
  remove(@Param('id') id: string, @Req() req: any) {
    return this.service.remove(id, this.userId(req));
  }
}
