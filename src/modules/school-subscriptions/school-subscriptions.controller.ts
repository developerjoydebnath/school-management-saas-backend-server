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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role, SubscriptionStatus } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateSchoolSubscriptionDto } from './dto/create-school-subscription.dto';
import { UpdateSchoolSubscriptionDto } from './dto/update-school-subscription.dto';
import { SchoolSubscriptionsService } from './school-subscriptions.service';

@ApiTags('school-subscriptions')
@Roles(Role.SUPER_ADMIN, Role.DEVELOPER)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('school-subscriptions')
export class SchoolSubscriptionsController {
  constructor(
    private readonly schoolSubscriptionsService: SchoolSubscriptionsService,
  ) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new school subscription' })
  create(
    @Body() createSchoolSubscriptionDto: CreateSchoolSubscriptionDto,
    @Request() req: any,
  ) {
    return this.schoolSubscriptionsService.create(
      createSchoolSubscriptionDto,
      req.user?.id,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List all school subscriptions' })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: SubscriptionStatus,
    @Query('schoolId') schoolId?: string,
    @Query('planId') planId?: string,
  ) {
    return this.schoolSubscriptionsService.findAll({
      page,
      limit,
      status,
      schoolId,
      planId,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a school subscription by ID' })
  findOne(@Param('id') id: string) {
    return this.schoolSubscriptionsService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a school subscription' })
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a school subscription' })
  remove(@Param('id') id: string) {
    return this.schoolSubscriptionsService.remove(id);
  }

  @Patch(':id/status')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update status of a school subscription' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: SubscriptionStatus,
    @Request() req: any,
  ) {
    return this.schoolSubscriptionsService.updateStatus(
      id,
      status,
      req.user?.id,
    );
  }
}
