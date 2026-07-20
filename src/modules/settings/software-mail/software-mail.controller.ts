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
} from '../mail-settings/dto/mail-settings.dto';
import { MailSettingsService } from '../mail-settings/mail-settings.service';

@ApiTags('settings-software-mail')
@Controller('settings/software-mail')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(Role.SUPER_ADMIN, Role.DEVELOPER)
export class SoftwareMailController {
  constructor(private readonly service: MailSettingsService) {}

  private userId(req: any) {
    return req.user?.userId || req.user?.id;
  }

  @Get()
  @ApiOperation({ summary: 'Get software mail settings' })
  @RequirePermissions(
    PERMISSIONS.SETTINGS.MAIL_SETTINGS.VIEW,
    PERMISSIONS.SETTINGS.MAIL_SETTINGS.ALL,
    PERMISSIONS.SETTINGS.ALL,
  )
  get() {
    return this.service.getPlatform();
  }

  @Patch()
  @ApiOperation({ summary: 'Update software mail settings' })
  @RequirePermissions(
    PERMISSIONS.SETTINGS.MAIL_SETTINGS.EDIT,
    PERMISSIONS.SETTINGS.MAIL_SETTINGS.ALL,
    PERMISSIONS.SETTINGS.ALL,
  )
  update(@Body() dto: UpdateMailConfigDto, @Req() req: any) {
    return this.service.updatePlatform(dto, this.userId(req));
  }

  @Post('test')
  @ApiOperation({ summary: 'Send software mail settings test email' })
  @RequirePermissions(
    PERMISSIONS.SETTINGS.MAIL_SETTINGS.EDIT,
    PERMISSIONS.SETTINGS.MAIL_SETTINGS.ALL,
    PERMISSIONS.SETTINGS.ALL,
  )
  test(@Body() dto: TestMailConfigDto, @Req() req: any) {
    return this.service.testPlatform(dto, this.userId(req));
  }
}
