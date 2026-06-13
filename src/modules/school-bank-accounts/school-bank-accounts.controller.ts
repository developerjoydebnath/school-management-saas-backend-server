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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CreateSchoolBankAccountDto } from './dto/create-school-bank-account.dto';
import { UpdateSchoolBankAccountDto } from './dto/update-school-bank-account.dto';
import { SchoolBankAccountsService } from './school-bank-accounts.service';

@ApiTags('school-bank-accounts')
@Roles(Role.SUPER_ADMIN, Role.DEVELOPER)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('school-bank-accounts')
export class SchoolBankAccountsController {
  constructor(
    private readonly schoolBankAccountsService: SchoolBankAccountsService,
  ) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new school bank account' })
  create(@Body() createSchoolBankAccountDto: CreateSchoolBankAccountDto) {
    return this.schoolBankAccountsService.create(createSchoolBankAccountDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all school bank accounts' })
  findAll(@Query() query: any) {
    return this.schoolBankAccountsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a school bank account by ID' })
  findOne(@Param('id') id: string) {
    return this.schoolBankAccountsService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a school bank account' })
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a school bank account (soft delete)' })
  remove(@Param('id') id: string, @Request() req: any) {
    return this.schoolBankAccountsService.remove(id, req.user?.id);
  }

  @Patch(':id/is-active')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update isActive status of a school bank account' })
  updateIsActive(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.schoolBankAccountsService.updateIsActive(id, isActive);
  }

  @Patch(':id/is-primary')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update isPrimary status of a school bank account' })
  updateIsPrimary(
    @Param('id') id: string,
    @Body('isPrimary') isPrimary: boolean,
  ) {
    return this.schoolBankAccountsService.updateIsPrimary(id, isPrimary);
  }
}
