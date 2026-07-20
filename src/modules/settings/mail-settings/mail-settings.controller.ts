import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { PERMISSIONS } from 'src/common/constants/permissions';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/modules/auth/guards/permissions.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import {
  TestMailConfigDto,
  UpdateMailConfigDto,
  UpdateMailStatusDto,
} from './dto/mail-settings.dto';
import { MailSettingsService } from './mail-settings.service';

@ApiTags('settings-mail')
@Controller('settings/mail')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class MailSettingsController {
  constructor(private readonly service: MailSettingsService) {}

  private userId(req: any) {
    return req.user?.userId || req.user?.id;
  }

  @Get('school')
  @ApiOperation({ summary: 'Get school mail settings' })
  @RequirePermissions(
    PERMISSIONS.SETTINGS.MAIL_SETTINGS.VIEW,
    PERMISSIONS.SETTINGS.MAIL_SETTINGS.ALL,
    PERMISSIONS.SETTINGS.ALL,
  )
  getSchool() {
    return this.service.getSchool();
  }

  @Patch('school')
  @ApiOperation({ summary: 'Update school mail settings' })
  @RequirePermissions(
    PERMISSIONS.SETTINGS.MAIL_SETTINGS.EDIT,
    PERMISSIONS.SETTINGS.MAIL_SETTINGS.ALL,
    PERMISSIONS.SETTINGS.ALL,
  )
  updateSchool(@Body() dto: UpdateMailConfigDto, @Req() req: any) {
    return this.service.updateSchool(dto, this.userId(req));
  }

  @Patch('school/status')
  @ApiOperation({ summary: 'Enable or disable school mail settings' })
  @RequirePermissions(
    PERMISSIONS.SETTINGS.MAIL_SETTINGS.EDIT,
    PERMISSIONS.SETTINGS.MAIL_SETTINGS.ALL,
    PERMISSIONS.SETTINGS.ALL,
  )
  updateSchoolStatus(@Body() dto: UpdateMailStatusDto, @Req() req: any) {
    return this.service.updateSchoolStatus(dto.isActive, this.userId(req));
  }

  @Post('school/test')
  @ApiOperation({ summary: 'Send school mail settings test email' })
  @RequirePermissions(
    PERMISSIONS.SETTINGS.MAIL_SETTINGS.EDIT,
    PERMISSIONS.SETTINGS.MAIL_SETTINGS.ALL,
    PERMISSIONS.SETTINGS.ALL,
  )
  testSchool(@Body() dto: TestMailConfigDto, @Req() req: any) {
    return this.service.testSchool(dto, this.userId(req));
  }

  @Get('platform')
  @ApiOperation({ summary: 'Get platform mail settings' })
  @Roles(Role.SUPER_ADMIN, Role.DEVELOPER)
  @RequirePermissions(
    PERMISSIONS.SETTINGS.MAIL_SETTINGS.VIEW,
    PERMISSIONS.SETTINGS.MAIL_SETTINGS.ALL,
    PERMISSIONS.SETTINGS.ALL,
  )
  getPlatform() {
    return this.service.getPlatform();
  }

  @Patch('platform')
  @ApiOperation({ summary: 'Update platform mail settings' })
  @Roles(Role.SUPER_ADMIN, Role.DEVELOPER)
  @RequirePermissions(
    PERMISSIONS.SETTINGS.MAIL_SETTINGS.EDIT,
    PERMISSIONS.SETTINGS.MAIL_SETTINGS.ALL,
    PERMISSIONS.SETTINGS.ALL,
  )
  updatePlatform(@Body() dto: UpdateMailConfigDto, @Req() req: any) {
    return this.service.updatePlatform(dto, this.userId(req));
  }

  @Post('platform/test')
  @ApiOperation({ summary: 'Send platform mail settings test email' })
  @Roles(Role.SUPER_ADMIN, Role.DEVELOPER)
  @RequirePermissions(
    PERMISSIONS.SETTINGS.MAIL_SETTINGS.EDIT,
    PERMISSIONS.SETTINGS.MAIL_SETTINGS.ALL,
    PERMISSIONS.SETTINGS.ALL,
  )
  testPlatform(@Body() dto: TestMailConfigDto, @Req() req: any) {
    return this.service.testPlatform(dto, this.userId(req));
  }
}
