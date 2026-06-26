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
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import { VouchersService } from './vouchers.service';

@ApiTags('vouchers')
@Roles(Role.SUPER_ADMIN, Role.DEVELOPER)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('vouchers')
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new voucher' })
  create(@Body() createVoucherDto: CreateVoucherDto, @Request() req: any) {
    return this.vouchersService.create(createVoucherDto, req.user?.id);
  }

  @Get()
  @ApiOperation({ summary: 'List all vouchers' })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
    @Query('discountType') discountType?: string,
    @Query('createdFrom') createdFrom?: string,
    @Query('createdTo') createdTo?: string,
  ) {
    return this.vouchersService.findAll({
      page,
      limit,
      isActive,
      search,
      discountType,
      createdFrom,
      createdTo,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a voucher by ID' })
  findOne(@Param('id') id: string) {
    return this.vouchersService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a voucher' })
  update(@Param('id') id: string, @Body() updateVoucherDto: UpdateVoucherDto) {
    return this.vouchersService.update(id, updateVoucherDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a voucher' })
  remove(@Param('id') id: string) {
    return this.vouchersService.remove(id);
  }

  @Patch(':id/is-active')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update isActive status of a voucher' })
  updateIsActive(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.vouchersService.updateIsActive(id, isActive);
  }
}
