import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  CreateDistrictDto,
  CreateDivisionDto,
  CreateUnionDto,
  CreateUpazilaDto,
  UpdateDistrictDto,
  UpdateDivisionDto,
  UpdateUnionDto,
  UpdateUpazilaDto,
} from './dto/locations.dto';
import { LocationsService } from './locations.service';

@ApiTags('locations')
@Controller('public/locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  // ==========================
  // DIVISIONS
  // ==========================

  @Get('divisions')
  @ApiOperation({ summary: 'Get all divisions' })
  getDivisions() {
    return this.locationsService.getDivisions();
  }

  @Post('divisions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.DEVELOPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new division (Admin only)' })
  createDivision(@Body() data: CreateDivisionDto) {
    return this.locationsService.createDivision(data);
  }

  @Patch('divisions/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.DEVELOPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a division (Admin only)' })
  updateDivision(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateDivisionDto,
  ) {
    return this.locationsService.updateDivision(id, data);
  }

  @Delete('divisions/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.DEVELOPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a division (Admin only)' })
  deleteDivision(@Param('id', ParseIntPipe) id: number) {
    return this.locationsService.deleteDivision(id);
  }

  // ==========================
  // DISTRICTS
  // ==========================

  @Get('districts/:divisionId')
  @ApiOperation({ summary: 'Get districts by division ID' })
  getDistricts(@Param('divisionId', ParseIntPipe) divisionId: number) {
    return this.locationsService.getDistricts(divisionId);
  }

  @Post('districts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.DEVELOPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new district (Admin only)' })
  createDistrict(@Body() data: CreateDistrictDto) {
    return this.locationsService.createDistrict(data);
  }

  @Patch('districts/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.DEVELOPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a district (Admin only)' })
  updateDistrict(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateDistrictDto,
  ) {
    return this.locationsService.updateDistrict(id, data);
  }

  @Delete('districts/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.DEVELOPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a district (Admin only)' })
  deleteDistrict(@Param('id', ParseIntPipe) id: number) {
    return this.locationsService.deleteDistrict(id);
  }

  // ==========================
  // UPAZILAS
  // ==========================

  @Get('upazilas/:districtId')
  @ApiOperation({ summary: 'Get upazilas by district ID' })
  getUpazilas(@Param('districtId', ParseIntPipe) districtId: number) {
    return this.locationsService.getUpazilas(districtId);
  }

  @Post('upazilas')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.DEVELOPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new upazila (Admin only)' })
  createUpazila(@Body() data: CreateUpazilaDto) {
    return this.locationsService.createUpazila(data);
  }

  @Patch('upazilas/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.DEVELOPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an upazila (Admin only)' })
  updateUpazila(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateUpazilaDto,
  ) {
    return this.locationsService.updateUpazila(id, data);
  }

  @Delete('upazilas/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.DEVELOPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an upazila (Admin only)' })
  deleteUpazila(@Param('id', ParseIntPipe) id: number) {
    return this.locationsService.deleteUpazila(id);
  }

  // ==========================
  // UNIONS
  // ==========================

  @Get('unions/:upazilaId')
  @ApiOperation({ summary: 'Get unions by upazila ID' })
  getUnions(@Param('upazilaId', ParseIntPipe) upazilaId: number) {
    return this.locationsService.getUnions(upazilaId);
  }

  @Post('unions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.DEVELOPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new union (Admin only)' })
  createUnion(@Body() data: CreateUnionDto) {
    return this.locationsService.createUnion(data);
  }

  @Patch('unions/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.DEVELOPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a union (Admin only)' })
  updateUnion(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateUnionDto,
  ) {
    return this.locationsService.updateUnion(id, data);
  }

  @Delete('unions/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.DEVELOPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a union (Admin only)' })
  deleteUnion(@Param('id', ParseIntPipe) id: number) {
    return this.locationsService.deleteUnion(id);
  }
}
