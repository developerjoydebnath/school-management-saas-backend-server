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
import { CreateSchoolSubscriptionDiscountDto } from './dto/create-school-subscription-discount.dto';
import { UpdateSchoolSubscriptionDiscountDto } from './dto/update-school-subscription-discount.dto';
import { SchoolSubscriptionDiscountsService } from './school-subscription-discounts.service';

@ApiTags('school-subscription-discounts')
@Roles(Role.SUPER_ADMIN, Role.DEVELOPER)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('school-subscription-discounts')
export class SchoolSubscriptionDiscountsController {
  constructor(
    private readonly schoolSubscriptionDiscountsService: SchoolSubscriptionDiscountsService,
  ) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new school subscription discount' })
  create(
    @Body()
    createSchoolSubscriptionDiscountDto: CreateSchoolSubscriptionDiscountDto,
    @Request() req: any,
  ) {
    return this.schoolSubscriptionDiscountsService.create(
      createSchoolSubscriptionDiscountDto,
      req.user?.id,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List all school subscription discounts' })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('subscriptionId') subscriptionId?: string,
    @Query('voucherId') voucherId?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.schoolSubscriptionDiscountsService.findAll({
      page,
      limit,
      subscriptionId,
      voucherId,
      isActive,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a school subscription discount by ID' })
  findOne(@Param('id') id: string) {
    return this.schoolSubscriptionDiscountsService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a school subscription discount' })
  update(
    @Param('id') id: string,
    @Body()
    updateSchoolSubscriptionDiscountDto: UpdateSchoolSubscriptionDiscountDto,
  ) {
    return this.schoolSubscriptionDiscountsService.update(
      id,
      updateSchoolSubscriptionDiscountDto,
    );
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a school subscription discount' })
  remove(@Param('id') id: string) {
    return this.schoolSubscriptionDiscountsService.remove(id);
  }

  @Patch(':id/is-active')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update isActive status of a school subscription discount',
  })
  updateIsActive(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
    @Request() req: any,
  ) {
    return this.schoolSubscriptionDiscountsService.updateIsActive(
      id,
      isActive,
      req.user?.id,
    );
  }
}
