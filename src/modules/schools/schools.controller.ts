import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateSchoolAdminDto } from './dto/create-school-admin.dto';
import { RejectSchoolDto } from './dto/update-school-status.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { SchoolsService } from './schools.service';

/**
 * Superadmin-only controller.
 * All routes require JWT auth with role = 'super_admin'.
 */
@ApiTags('superadmin/schools')
@ApiBearerAuth()
@Roles(Role.SUPER_ADMIN, Role.DEVELOPER)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('superadmin/schools')
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  // ─── Guard helper ─────────────────────────────────────────────────────────────

  private assertSuperAdmin(req: any): void {
    if (
      req.user?.role !== Role.SUPER_ADMIN &&
      req.user?.role !== Role.DEVELOPER
    ) {
      throw new ForbiddenException('Access denied. Super admin role required.');
    }
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────────

  /**
   * GET /superadmin/schools
   * List all schools, filterable by status, district, type.
   */
  @Get()
  @ApiOperation({ summary: 'List all school requests (filterable)' })
  @ApiQuery({ name: 'status', required: false, example: 'pending' })
  @ApiQuery({ name: 'divisionId', required: false, example: '3' })
  @ApiQuery({ name: 'districtId', required: false, example: '47' })
  @ApiQuery({ name: 'upazilaId', required: false, example: '10' })
  @ApiQuery({ name: 'schoolType', required: false, example: 'school,college' })
  @ApiQuery({ name: 'affiliationBoard', required: false, example: 'dhaka_board' })
  @ApiQuery({ name: 'medium', required: false, example: 'bangla,english' })
  @ApiQuery({ name: 'shift', required: false, example: 'day,morning' })
  @ApiQuery({ name: 'createdFrom', required: false, example: '2026-06-01' })
  @ApiQuery({ name: 'createdTo', required: false, example: '2026-06-30' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async findAll(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('divisionId') divisionId?: string,
    @Query('districtId') districtId?: string,
    @Query('upazilaId') upazilaId?: string,
    @Query('schoolType') schoolType?: string,
    @Query('affiliationBoard') affiliationBoard?: string,
    @Query('medium') medium?: string,
    @Query('shift') shift?: string,
    @Query('createdFrom') createdFrom?: string,
    @Query('createdTo') createdTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    this.assertSuperAdmin(req);
    return this.schoolsService.findAll({
      status,
      divisionId,
      districtId,
      upazilaId,
      schoolType,
      affiliationBoard,
      medium,
      shift,
      createdFrom,
      createdTo,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  /**
   * GET /superadmin/schools/:id
   * Get a single school request by ID.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a single school request by ID' })
  async findOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    this.assertSuperAdmin(req);
    return this.schoolsService.findOne(id);
  }

  /**
   * POST /superadmin/schools
   * Super admin creates a school directly (skips pending, activates immediately).
   */
  @Post()
  @ApiOperation({
    summary: 'Super admin creates a school directly (instantly activated)',
  })
  async createByAdmin(@Request() req: any, @Body() dto: CreateSchoolAdminDto) {
    this.assertSuperAdmin(req);
    return this.schoolsService.createByAdmin(dto, req.user.userId);
  }

  /**
   * PATCH /superadmin/schools/:id
   * Generic update of a school's details.
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update school details' })
  async update(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSchoolDto,
  ) {
    this.assertSuperAdmin(req);
    return this.schoolsService.updateSchool(id, dto);
  }

  // ─── Status transitions ───────────────────────────────────────────────────────

  /**
   * PATCH /superadmin/schools/:id/approve
   * Approve a pending school request → runs full activation pipeline.
   */
  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve a pending school request' })
  async approve(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    this.assertSuperAdmin(req);
    return this.schoolsService.approveSchool(id, req.user.userId);
  }

  /**
   * PATCH /superadmin/schools/:id/reject
   * Reject a pending school request with optional reason.
   */
  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject a pending school request' })
  async reject(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectSchoolDto,
  ) {
    this.assertSuperAdmin(req);
    return this.schoolsService.rejectSchool(id, req.user.userId, dto.reason);
  }

  /**
   * PATCH /superadmin/schools/:id/suspend
   * Suspend an active school — deactivates all users, preserves schema and data.
   */
  @Patch(':id/suspend')
  @ApiOperation({
    summary: 'Suspend an active school (disables all user logins)',
  })
  async suspend(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    this.assertSuperAdmin(req);
    return this.schoolsService.suspendSchool(id);
  }

  /**
   * PATCH /superadmin/schools/:id/activate
   * Reactivate a suspended school — re-enables all users.
   */
  @Patch(':id/activate')
  @ApiOperation({ summary: 'Reactivate a suspended school' })
  async reactivate(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    this.assertSuperAdmin(req);
    return this.schoolsService.reactivateSchool(id, req.user.userId);
  }

  /**
   * DELETE /superadmin/schools/:id
   * Soft delete a school.
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a school' })
  async remove(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    this.assertSuperAdmin(req);
    return this.schoolsService.remove(id);
  }
}
