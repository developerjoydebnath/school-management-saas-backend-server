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
import { Role } from '@prisma/client';
import { PERMISSIONS } from '../../common/constants/permissions';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateSchoolBankAccountDto } from './dto/create-school-bank-account.dto';
import { UpdateSchoolBankAccountDto } from './dto/update-school-bank-account.dto';
import { SchoolBankAccountsService } from './school-bank-accounts.service';

@ApiTags('school-bank-accounts')
@ApiBearerAuth()
@Roles(Role.SUPER_ADMIN, Role.DEVELOPER, Role.SCHOOL_ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('superadmin/school-bank-accounts')
export class SchoolBankAccountsController {
  constructor(
    private readonly schoolBankAccountsService: SchoolBankAccountsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new school bank account' })
  @RequirePermissions(
    PERMISSIONS.SCHOOLS_MANAGEMENT.BANK_ACCOUNTS.CREATE,
    PERMISSIONS.SCHOOLS_MANAGEMENT.BANK_ACCOUNTS.ALL,
    PERMISSIONS.SCHOOLS_MANAGEMENT.ALL,
  )
  create(@Body() createSchoolBankAccountDto: CreateSchoolBankAccountDto) {
    return this.schoolBankAccountsService.create(createSchoolBankAccountDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all school bank accounts' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'schoolId', required: false })
  @ApiQuery({ name: 'accountPurpose', required: false, example: 'fees,general' })
  @ApiQuery({ name: 'isActive', required: false, example: 'true' })
  @ApiQuery({ name: 'isPrimary', required: false, example: 'false' })
  @ApiQuery({ name: 'createdFrom', required: false, example: '2026-06-01' })
  @ApiQuery({ name: 'createdTo', required: false, example: '2026-06-30' })
  @RequirePermissions(
    PERMISSIONS.SCHOOLS_MANAGEMENT.BANK_ACCOUNTS.VIEW,
    PERMISSIONS.SCHOOLS_MANAGEMENT.BANK_ACCOUNTS.ALL,
    PERMISSIONS.SCHOOLS_MANAGEMENT.ALL,
  )
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('schoolId') schoolId?: string,
    @Query('accountPurpose') accountPurpose?: string,
    @Query('isActive') isActive?: string,
    @Query('isPrimary') isPrimary?: string,
    @Query('createdFrom') createdFrom?: string,
    @Query('createdTo') createdTo?: string,
  ) {
    return this.schoolBankAccountsService.findAll({
      page,
      limit,
      search,
      schoolId,
      accountPurpose,
      isActive,
      isPrimary,
      createdFrom,
      createdTo,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a school bank account by ID' })
  @RequirePermissions(
    PERMISSIONS.SCHOOLS_MANAGEMENT.BANK_ACCOUNTS.VIEW,
    PERMISSIONS.SCHOOLS_MANAGEMENT.BANK_ACCOUNTS.ALL,
    PERMISSIONS.SCHOOLS_MANAGEMENT.ALL,
  )
  findOne(@Param('id') id: string) {
    return this.schoolBankAccountsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a school bank account' })
  @RequirePermissions(
    PERMISSIONS.SCHOOLS_MANAGEMENT.BANK_ACCOUNTS.EDIT,
    PERMISSIONS.SCHOOLS_MANAGEMENT.BANK_ACCOUNTS.ALL,
    PERMISSIONS.SCHOOLS_MANAGEMENT.ALL,
  )
  update(
    @Param('id') id: string,
    @Body() updateSchoolBankAccountDto: UpdateSchoolBankAccountDto,
  ) {
    return this.schoolBankAccountsService.update(
      id,
      updateSchoolBankAccountDto,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a school bank account (soft delete)' })
  @RequirePermissions(
    PERMISSIONS.SCHOOLS_MANAGEMENT.BANK_ACCOUNTS.DELETE,
    PERMISSIONS.SCHOOLS_MANAGEMENT.BANK_ACCOUNTS.ALL,
    PERMISSIONS.SCHOOLS_MANAGEMENT.ALL,
  )
  remove(@Param('id') id: string, @Request() req: any) {
    return this.schoolBankAccountsService.remove(id, req.user?.userId);
  }

  @Patch(':id/is-active')
  @ApiOperation({ summary: 'Update isActive status of a school bank account' })
  @RequirePermissions(
    PERMISSIONS.SCHOOLS_MANAGEMENT.BANK_ACCOUNTS.EDIT,
    PERMISSIONS.SCHOOLS_MANAGEMENT.BANK_ACCOUNTS.ALL,
    PERMISSIONS.SCHOOLS_MANAGEMENT.ALL,
  )
  updateIsActive(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.schoolBankAccountsService.updateIsActive(id, isActive);
  }

  @Patch(':id/is-primary')
  @ApiOperation({ summary: 'Update isPrimary status of a school bank account' })
  @RequirePermissions(
    PERMISSIONS.SCHOOLS_MANAGEMENT.BANK_ACCOUNTS.EDIT,
    PERMISSIONS.SCHOOLS_MANAGEMENT.BANK_ACCOUNTS.ALL,
    PERMISSIONS.SCHOOLS_MANAGEMENT.ALL,
  )
  updateIsPrimary(
    @Param('id') id: string,
    @Body('isPrimary') isPrimary: boolean,
  ) {
    return this.schoolBankAccountsService.updateIsPrimary(id, isPrimary);
  }
}
