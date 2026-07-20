import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from 'src/common/constants/permissions';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/modules/auth/guards/permissions.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import {
  TestMailConfigDto,
  UpdateMailConfigDto,
  UpdateMailStatusDto,
} from '../mail-settings/dto/mail-settings.dto';
import { MailSettingsService } from '../mail-settings/mail-settings.service';

@ApiTags('settings-school-mail')
@Controller('settings/school-mail')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class SchoolMailController {
  constructor(private readonly service: MailSettingsService) {}

  private userId(req: any) {
    return req.user?.userId || req.user?.id;
  }

  @Get()
  @ApiOperation({ summary: 'Get school mail settings' })
  @RequirePermissions(
    PERMISSIONS.SETTINGS.MAIL_SETTINGS.VIEW,
    PERMISSIONS.SETTINGS.MAIL_SETTINGS.ALL,
    PERMISSIONS.SETTINGS.ALL,
  )
  get() {
    return this.service.getSchool();
  }

  @Patch()
  @ApiOperation({ summary: 'Update school mail settings' })
  @RequirePermissions(
    PERMISSIONS.SETTINGS.MAIL_SETTINGS.EDIT,
    PERMISSIONS.SETTINGS.MAIL_SETTINGS.ALL,
    PERMISSIONS.SETTINGS.ALL,
  )
  update(@Body() dto: UpdateMailConfigDto, @Req() req: any) {
    return this.service.updateSchool(dto, this.userId(req));
  }

  @Patch('status')
  @ApiOperation({ summary: 'Enable or disable school own mail settings' })
  @RequirePermissions(
    PERMISSIONS.SETTINGS.MAIL_SETTINGS.EDIT,
    PERMISSIONS.SETTINGS.MAIL_SETTINGS.ALL,
    PERMISSIONS.SETTINGS.ALL,
  )
  updateStatus(@Body() dto: UpdateMailStatusDto, @Req() req: any) {
    return this.service.updateSchoolStatus(dto.isActive, this.userId(req));
  }

  @Post('test')
  @ApiOperation({ summary: 'Send school mail settings test email' })
  @RequirePermissions(
    PERMISSIONS.SETTINGS.MAIL_SETTINGS.EDIT,
    PERMISSIONS.SETTINGS.MAIL_SETTINGS.ALL,
    PERMISSIONS.SETTINGS.ALL,
  )
  test(@Body() dto: TestMailConfigDto, @Req() req: any) {
    return this.service.testSchool(dto, this.userId(req));
  }
}
