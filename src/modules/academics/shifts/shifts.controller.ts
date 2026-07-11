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
import { CreateShiftDto, UpdateShiftDto } from './dto/shift.dto';
import { ShiftsService } from './shifts.service';

@Controller('shifts')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.SHIFTS.CREATE, PERMISSIONS.SHIFTS.ALL)
  create(@Body() createShiftDto: CreateShiftDto) {
    return this.shiftsService.create(createShiftDto);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.SHIFTS.VIEW, PERMISSIONS.SHIFTS.ALL)
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.shiftsService.findAll(page, limit, search);
  }

  @Get('active-list')
  @RequirePermissions(PERMISSIONS.SHIFTS.VIEW, PERMISSIONS.SHIFTS.ALL)
  findActiveList() {
    return this.shiftsService.findActiveList();
  }

  @Get('options')
  @RequirePermissions(PERMISSIONS.SHIFTS.VIEW, PERMISSIONS.SHIFTS.ALL)
  findOptions() {
    return this.shiftsService.findOptions();
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.SHIFTS.VIEW, PERMISSIONS.SHIFTS.ALL)
  findOne(@Param('id') id: string) {
    return this.shiftsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.SHIFTS.EDIT, PERMISSIONS.SHIFTS.ALL)
  update(@Param('id') id: string, @Body() updateShiftDto: UpdateShiftDto) {
    return this.shiftsService.update(id, updateShiftDto);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.SHIFTS.DELETE, PERMISSIONS.SHIFTS.ALL)
  remove(@Param('id') id: string) {
    return this.shiftsService.remove(id);
  }
}
