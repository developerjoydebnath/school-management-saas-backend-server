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
import { ClassRoomsService } from './class-rooms.service';
import { CreateClassRoomDto, UpdateClassRoomDto } from './dto/class-room.dto';

@Controller('class-rooms')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class ClassRoomsController {
  constructor(private readonly classRoomsService: ClassRoomsService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.CLASS_ROOMS.CREATE, PERMISSIONS.CLASS_ROOMS.ALL)
  create(@Body() dto: CreateClassRoomDto) {
    return this.classRoomsService.create(dto);
  }

  @Get('active-list')
  @RequirePermissions(PERMISSIONS.CLASS_ROOMS.VIEW, PERMISSIONS.CLASS_ROOMS.ALL)
  findActiveList() {
    return this.classRoomsService.findActiveList();
  }

  @Get()
  @RequirePermissions(PERMISSIONS.CLASS_ROOMS.VIEW, PERMISSIONS.CLASS_ROOMS.ALL)
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.classRoomsService.findAll({ page, limit, search, status });
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.CLASS_ROOMS.VIEW, PERMISSIONS.CLASS_ROOMS.ALL)
  findOne(@Param('id') id: string) {
    return this.classRoomsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.CLASS_ROOMS.EDIT, PERMISSIONS.CLASS_ROOMS.ALL)
  update(@Param('id') id: string, @Body() dto: UpdateClassRoomDto) {
    return this.classRoomsService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.CLASS_ROOMS.DELETE, PERMISSIONS.CLASS_ROOMS.ALL)
  remove(@Param('id') id: string) {
    return this.classRoomsService.remove(id);
  }
}
