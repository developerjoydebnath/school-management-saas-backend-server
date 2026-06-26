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
import { ClassesService } from './classes.service';
import { CreateClassDto, UpdateClassDto } from './dto/class.dto';

@Controller('classes')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.CLASSES.CREATE, PERMISSIONS.CLASSES.ALL)
  create(@Body() createClassDto: CreateClassDto) {
    return this.classesService.create(createClassDto);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.CLASSES.VIEW, PERMISSIONS.CLASSES.ALL)
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('shiftId') shiftId?: string,
    @Query('classRoomId') classRoomId?: string,
  ) {
    return this.classesService.findAll({ page, limit, search, status, shiftId, classRoomId });
  }

  @Get('active-list')
  @RequirePermissions(PERMISSIONS.CLASSES.VIEW, PERMISSIONS.CLASSES.ALL)
  findActiveList() {
    return this.classesService.findActiveList();
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.CLASSES.VIEW, PERMISSIONS.CLASSES.ALL)
  findOne(@Param('id') id: string) {
    return this.classesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.CLASSES.EDIT, PERMISSIONS.CLASSES.ALL)
  update(@Param('id') id: string, @Body() updateClassDto: UpdateClassDto) {
    return this.classesService.update(id, updateClassDto);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.CLASSES.DELETE, PERMISSIONS.CLASSES.ALL)
  remove(@Param('id') id: string) {
    return this.classesService.remove(id);
  }
}
