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
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';
import { SubscriptionPlansService } from './subscription-plans.service';

@ApiTags('subscription-plans')
@Roles(Role.SUPER_ADMIN, Role.DEVELOPER)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('superadmin/subscription-plans')
export class SubscriptionPlansController {
  constructor(
    private readonly subscriptionPlansService: SubscriptionPlansService,
  ) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new subscription plan' })
  create(@Body() createSubscriptionPlanDto: CreateSubscriptionPlanDto) {
    return this.subscriptionPlansService.create(createSubscriptionPlanDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all subscription plans' })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('isPublic') isPublic?: string,
    @Query('isActive') isActive?: string,
    @Query('billingCycle') billingCycle?: string,
    @Query('createdFrom') createdFrom?: string,
    @Query('createdTo') createdTo?: string,
    @Query('isDeleted') isDeleted?: string,
  ) {
    return this.subscriptionPlansService.findAll({
      page,
      limit,
      isPublic,
      isActive,
      billingCycle,
      createdFrom,
      createdTo,
      isDeleted,
    });
  }

  @Get('list')
  @ApiOperation({ summary: 'Get a lightweight list of active public subscription plans' })
  getList() {
    return this.subscriptionPlansService.getList();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a subscription plan by ID' })
  findOne(@Param('id') id: string) {
    return this.subscriptionPlansService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a subscription plan' })
  update(
    @Param('id') id: string,
    @Body() updateSubscriptionPlanDto: UpdateSubscriptionPlanDto,
  ) {
    return this.subscriptionPlansService.update(id, updateSubscriptionPlanDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a subscription plan' })
  remove(@Param('id') id: string, @Request() req: any) {
    return this.subscriptionPlansService.remove(id, req.user?.userId);
  }

  @Patch(':id/is-public')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update isPublic status of a subscription plan' })
  updateIsPublic(@Param('id') id: string, @Body('isPublic') isPublic: boolean) {
    return this.subscriptionPlansService.updateIsPublic(id, isPublic);
  }

  @Patch(':id/is-active')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update isActive status of a subscription plan' })
  updateIsActive(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.subscriptionPlansService.updateIsActive(id, isActive);
  }
}
