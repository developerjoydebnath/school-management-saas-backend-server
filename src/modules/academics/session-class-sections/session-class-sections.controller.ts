import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PERMISSIONS } from 'src/common/constants/permissions';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/modules/auth/guards/permissions.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { UpsertSessionClassSetupDto } from './dto/session-class-section.dto';
import { SessionClassSectionsService } from './session-class-sections.service';

@Controller('session-class-sections')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class SessionClassSectionsController {
  constructor(private readonly service: SessionClassSectionsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.CLASSES.VIEW, PERMISSIONS.CLASSES.ALL)
  findAll(@Query() query: any) {
    return this.service.findAll(query);
  }

  @Get('setup')
  @RequirePermissions(PERMISSIONS.CLASSES.VIEW, PERMISSIONS.CLASSES.ALL)
  findSetup(@Query() query: any) {
    return this.service.findSetup(query);
  }

  @Put('setup')
  @RequirePermissions(PERMISSIONS.CLASSES.EDIT, PERMISSIONS.CLASSES.ALL)
  upsertSetup(@Body() dto: UpsertSessionClassSetupDto) {
    return this.service.upsertSetup(dto);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.CLASSES.VIEW, PERMISSIONS.CLASSES.ALL)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.CLASSES.DELETE, PERMISSIONS.CLASSES.ALL)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
