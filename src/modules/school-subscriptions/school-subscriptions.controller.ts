import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role, SubscriptionStatus } from '@prisma/client';
import { PERMISSIONS } from '../../common/constants/permissions';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateSchoolSubscriptionDto } from './dto/create-school-subscription.dto';
import { UpdateSchoolSubscriptionDto } from './dto/update-school-subscription.dto';
import { SchoolSubscriptionsService } from './school-subscriptions.service';

@ApiTags('school-subscriptions')
@ApiBearerAuth()
@Roles(Role.SUPER_ADMIN, Role.DEVELOPER, Role.SCHOOL_ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('superadmin/school-subscriptions')
export class SchoolSubscriptionsController {
  constructor(
    private readonly schoolSubscriptionsService: SchoolSubscriptionsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new school subscription' })
  @RequirePermissions(
    PERMISSIONS.SCHOOLS_MANAGEMENT.SCHOOL_SUBSCRIPTIONS.CREATE,
    PERMISSIONS.SCHOOLS_MANAGEMENT.SCHOOL_SUBSCRIPTIONS.ALL,
    PERMISSIONS.SCHOOLS_MANAGEMENT.ALL,
  )
  create(
    @Body() createSchoolSubscriptionDto: CreateSchoolSubscriptionDto,
    @Request() req: any,
  ) {
    return this.schoolSubscriptionsService.create(
      createSchoolSubscriptionDto,
      req.user?.userId,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List all school subscriptions' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'status', required: false, example: 'active,trial' })
  @ApiQuery({ name: 'schoolId', required: false })
  @ApiQuery({ name: 'planId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'createdFrom', required: false, example: '2026-06-01' })
  @ApiQuery({ name: 'createdTo', required: false, example: '2026-06-30' })
  @ApiQuery({ name: 'isDeleted', required: false, example: 'false' })
  @RequirePermissions(
    PERMISSIONS.SCHOOLS_MANAGEMENT.SCHOOL_SUBSCRIPTIONS.VIEW,
    PERMISSIONS.SCHOOLS_MANAGEMENT.SCHOOL_SUBSCRIPTIONS.ALL,
    PERMISSIONS.SCHOOLS_MANAGEMENT.ALL,
  )
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('schoolId') schoolId?: string,
    @Query('planId') planId?: string,
    @Query('search') search?: string,
    @Query('createdFrom') createdFrom?: string,
    @Query('createdTo') createdTo?: string,
    @Query('isDeleted') isDeleted?: string,
  ) {
    return this.schoolSubscriptionsService.findAll({
      page,
      limit,
      status,
      schoolId,
      planId,
      search,
      createdFrom,
      createdTo,
      isDeleted,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a school subscription by ID' })
  @RequirePermissions(
    PERMISSIONS.SCHOOLS_MANAGEMENT.SCHOOL_SUBSCRIPTIONS.VIEW,
    PERMISSIONS.SCHOOLS_MANAGEMENT.SCHOOL_SUBSCRIPTIONS.ALL,
    PERMISSIONS.SCHOOLS_MANAGEMENT.ALL,
  )
  findOne(@Param('id') id: string) {
    return this.schoolSubscriptionsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a school subscription' })
  @RequirePermissions(
    PERMISSIONS.SCHOOLS_MANAGEMENT.SCHOOL_SUBSCRIPTIONS.EDIT,
    PERMISSIONS.SCHOOLS_MANAGEMENT.SCHOOL_SUBSCRIPTIONS.ALL,
    PERMISSIONS.SCHOOLS_MANAGEMENT.ALL,
  )
  update(
    @Param('id') id: string,
    @Body() updateSchoolSubscriptionDto: UpdateSchoolSubscriptionDto,
  ) {
    return this.schoolSubscriptionsService.update(
      id,
      updateSchoolSubscriptionDto,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a school subscription' })
  @RequirePermissions(
    PERMISSIONS.SCHOOLS_MANAGEMENT.SCHOOL_SUBSCRIPTIONS.DELETE,
    PERMISSIONS.SCHOOLS_MANAGEMENT.SCHOOL_SUBSCRIPTIONS.ALL,
    PERMISSIONS.SCHOOLS_MANAGEMENT.ALL,
  )
  remove(@Param('id') id: string, @Request() req: any) {
    return this.schoolSubscriptionsService.remove(id, req.user?.userId);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update status of a school subscription' })
  @RequirePermissions(
    PERMISSIONS.SCHOOLS_MANAGEMENT.SCHOOL_SUBSCRIPTIONS.EDIT,
    PERMISSIONS.SCHOOLS_MANAGEMENT.SCHOOL_SUBSCRIPTIONS.ALL,
    PERMISSIONS.SCHOOLS_MANAGEMENT.ALL,
  )
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: SubscriptionStatus,
    @Request() req: any,
  ) {
    return this.schoolSubscriptionsService.updateStatus(
      id,
      status,
      req.user?.userId,
    );
  }
}
