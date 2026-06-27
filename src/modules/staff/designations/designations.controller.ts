import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PERMISSIONS } from 'src/common/constants/permissions';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/modules/auth/guards/permissions.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { DesignationsService } from './designations.service';
import { CreateDesignationDto, UpdateDesignationDto } from './dto/designation.dto';

@Controller('designations')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class DesignationsController {
  constructor(private readonly designationsService: DesignationsService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.STAFF.DESIGNATIONS.CREATE, PERMISSIONS.STAFF.DESIGNATIONS.ALL)
  create(@Body() dto: CreateDesignationDto) {
    return this.designationsService.create(dto);
  }

  @Get('active-list')
  @RequirePermissions(PERMISSIONS.STAFF.DESIGNATIONS.VIEW, PERMISSIONS.STAFF.DESIGNATIONS.ALL)
  findActiveList() {
    return this.designationsService.findActiveList();
  }

  @Get()
  @RequirePermissions(PERMISSIONS.STAFF.DESIGNATIONS.VIEW, PERMISSIONS.STAFF.DESIGNATIONS.ALL)
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.designationsService.findAll({ page, limit, search, category, isActive });
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.STAFF.DESIGNATIONS.VIEW, PERMISSIONS.STAFF.DESIGNATIONS.ALL)
  findOne(@Param('id') id: string) {
    return this.designationsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.STAFF.DESIGNATIONS.EDIT, PERMISSIONS.STAFF.DESIGNATIONS.ALL)
  update(@Param('id') id: string, @Body() dto: UpdateDesignationDto) {
    return this.designationsService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.STAFF.DESIGNATIONS.DELETE, PERMISSIONS.STAFF.DESIGNATIONS.ALL)
  remove(@Param('id') id: string) {
    return this.designationsService.remove(id);
  }
}
