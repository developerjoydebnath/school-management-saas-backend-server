import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PERMISSIONS } from 'src/common/constants/permissions';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/modules/auth/guards/permissions.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { CreateSessionDto, UpdateSessionDto } from './dto/session.dto';
import { SessionsService } from './sessions.service';

@Controller('sessions')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.SESSIONS.CREATE, PERMISSIONS.SESSIONS.ALL)
  create(@Body() createSessionDto: CreateSessionDto) {
    return this.sessionsService.create(createSessionDto);
  }

  @Get('active-list')
  @RequirePermissions(PERMISSIONS.SESSIONS.VIEW, PERMISSIONS.SESSIONS.ALL)
  findActiveList() {
    return this.sessionsService.findActiveList();
  }

  @Get()
  @RequirePermissions(PERMISSIONS.SESSIONS.VIEW, PERMISSIONS.SESSIONS.ALL)
  findAll() {
    return this.sessionsService.findAll();
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.SESSIONS.VIEW, PERMISSIONS.SESSIONS.ALL)
  findOne(@Param('id') id: string) {
    return this.sessionsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.SESSIONS.EDIT, PERMISSIONS.SESSIONS.ALL)
  update(@Param('id') id: string, @Body() updateSessionDto: UpdateSessionDto) {
    return this.sessionsService.update(id, updateSessionDto);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.SESSIONS.DELETE, PERMISSIONS.SESSIONS.ALL)
  remove(@Param('id') id: string) {
    return this.sessionsService.remove(id);
  }
}
