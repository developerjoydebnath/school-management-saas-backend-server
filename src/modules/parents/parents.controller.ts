import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { PERMISSIONS } from 'src/common/constants/permissions';
import { ParentsService } from './parents.service';

@Controller('parents')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class ParentsController {
  constructor(private readonly parentsService: ParentsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PARENTS.DIRECTORY.VIEW)
  findAll(@Query() query: any) {
    return this.parentsService.findAll(query);
  }

  @Get('summary')
  @RequirePermissions(PERMISSIONS.PARENTS.DIRECTORY.VIEW)
  summary(@Query() query: any) {
    return this.parentsService.summary(query);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.PARENTS.DIRECTORY.VIEW)
  findOne(@Param('id') id: string, @Query() query: any) {
    return this.parentsService.findOne(id, query);
  }

  @Patch(':id/portal-access')
  @RequirePermissions(PERMISSIONS.PARENTS.PORTAL.EDIT)
  updatePortalAccess(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.parentsService.updatePortalAccess(id, isActive);
  }
}
