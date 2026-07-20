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
import { CreateSectionDto, UpdateSectionDto } from './dto/section.dto';
import { SectionsService } from './sections.service';

@Controller('sections')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class SectionsController {
  constructor(private readonly sectionsService: SectionsService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.CLASSES.CREATE, PERMISSIONS.CLASSES.ALL)
  create(@Body() dto: CreateSectionDto) {
    return this.sectionsService.create(dto);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.CLASSES.VIEW, PERMISSIONS.CLASSES.ALL)
  findAll(@Query() query: any) {
    return this.sectionsService.findAll(query);
  }

  @Get('active-list')
  @RequirePermissions(PERMISSIONS.CLASSES.VIEW, PERMISSIONS.CLASSES.ALL)
  findActiveList() {
    return this.sectionsService.findActiveList();
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.CLASSES.VIEW, PERMISSIONS.CLASSES.ALL)
  findOne(@Param('id') id: string) {
    return this.sectionsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.CLASSES.EDIT, PERMISSIONS.CLASSES.ALL)
  update(@Param('id') id: string, @Body() dto: UpdateSectionDto) {
    return this.sectionsService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.CLASSES.DELETE, PERMISSIONS.CLASSES.ALL)
  remove(@Param('id') id: string) {
    return this.sectionsService.remove(id);
  }
}
