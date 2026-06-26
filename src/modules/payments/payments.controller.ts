import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { PERMISSIONS } from '../../common/constants/permissions';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PaymentsService } from './payments.service';
import {
  CreatePaymentDto,
  PurchasePlanDto,
  UpdatePaymentDto,
  VerifyVoucherDto,
} from './dto/payments.dto';

@ApiTags('Payments')
@Controller('superadmin/payments')
@ApiBearerAuth()
@Roles(Role.SUPER_ADMIN, Role.DEVELOPER, Role.SCHOOL_ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a payment record' })
  @RequirePermissions(
    PERMISSIONS.SCHOOLS_MANAGEMENT.PAYMENTS.CREATE,
    PERMISSIONS.SCHOOLS_MANAGEMENT.PAYMENTS.ALL,
    PERMISSIONS.SCHOOLS_MANAGEMENT.ALL,
  )
  async create(@Body() dto: CreatePaymentDto, @Request() req: any) {
    return this.paymentsService.create(dto, req.user?.userId || req.user?.id);
  }

  @Get()
  @ApiOperation({ summary: 'List payment records' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'schoolId', required: false })
  @ApiQuery({ name: 'subscriptionId', required: false })
  @ApiQuery({ name: 'status', required: false, example: 'pending,completed' })
  @ApiQuery({ name: 'method', required: false, example: 'cash,bank_transfer' })
  @ApiQuery({ name: 'paidFrom', required: false, example: '2026-06-01' })
  @ApiQuery({ name: 'paidTo', required: false, example: '2026-06-30' })
  @RequirePermissions(
    PERMISSIONS.SCHOOLS_MANAGEMENT.PAYMENTS.VIEW,
    PERMISSIONS.SCHOOLS_MANAGEMENT.PAYMENTS.ALL,
    PERMISSIONS.SCHOOLS_MANAGEMENT.ALL,
  )
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('schoolId') schoolId?: string,
    @Query('subscriptionId') subscriptionId?: string,
    @Query('status') status?: string,
    @Query('method') method?: string,
    @Query('paidFrom') paidFrom?: string,
    @Query('paidTo') paidTo?: string,
  ) {
    return this.paymentsService.findAll({
      page,
      limit,
      search,
      schoolId,
      subscriptionId,
      status,
      method,
      paidFrom,
      paidTo,
    });
  }

  @Post('verify-voucher')
  @RequirePermissions(
    PERMISSIONS.SCHOOLS_MANAGEMENT.PAYMENTS.CREATE,
    PERMISSIONS.SCHOOLS_MANAGEMENT.PAYMENTS.ALL,
    PERMISSIONS.SCHOOLS_MANAGEMENT.ALL,
  )
  async verifyVoucher(@Body() dto: VerifyVoucherDto) {
    return this.paymentsService.verifyVoucher(dto);
  }

  @Post('purchase-plan')
  @RequirePermissions(
    PERMISSIONS.SCHOOLS_MANAGEMENT.PAYMENTS.CREATE,
    PERMISSIONS.SCHOOLS_MANAGEMENT.PAYMENTS.ALL,
    PERMISSIONS.SCHOOLS_MANAGEMENT.ALL,
  )
  async purchasePlan(@Body() dto: PurchasePlanDto, @Request() req: any) {
    const adminId = req.user.userId;
    return this.paymentsService.purchasePlan(dto, adminId);
  }

  @Get('quote')
  @ApiOperation({ summary: 'Get subscription payment quote' })
  @ApiQuery({ name: 'subscriptionId', required: true })
  @ApiQuery({ name: 'voucherCode', required: false })
  @ApiQuery({ name: 'billingCycles', required: false, example: 1 })
  @RequirePermissions(
    PERMISSIONS.SCHOOLS_MANAGEMENT.PAYMENTS.CREATE,
    PERMISSIONS.SCHOOLS_MANAGEMENT.PAYMENTS.VIEW,
    PERMISSIONS.SCHOOLS_MANAGEMENT.PAYMENTS.ALL,
    PERMISSIONS.SCHOOLS_MANAGEMENT.ALL,
  )
  async getQuote(
    @Query('subscriptionId') subscriptionId: string,
    @Query('voucherCode') voucherCode?: string,
    @Query('billingCycles') billingCycles?: string,
  ) {
    return this.paymentsService.getPaymentQuote(
      subscriptionId,
      voucherCode,
      billingCycles,
    );
  }

  @Get(':id/invoice')
  @RequirePermissions(
    PERMISSIONS.SCHOOLS_MANAGEMENT.PAYMENTS.VIEW,
    PERMISSIONS.SCHOOLS_MANAGEMENT.PAYMENTS.ALL,
    PERMISSIONS.SCHOOLS_MANAGEMENT.ALL,
  )
  async downloadInvoice(@Param('id') paymentId: string, @Res() res: Response) {
    const pdfBuffer = await this.paymentsService.generateInvoice(paymentId);
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=invoice-${paymentId}.pdf`,
      'Content-Length': pdfBuffer.length,
    });
    
    res.end(pdfBuffer);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment by ID' })
  @RequirePermissions(
    PERMISSIONS.SCHOOLS_MANAGEMENT.PAYMENTS.VIEW,
    PERMISSIONS.SCHOOLS_MANAGEMENT.PAYMENTS.ALL,
    PERMISSIONS.SCHOOLS_MANAGEMENT.ALL,
  )
  async findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a payment record' })
  @RequirePermissions(
    PERMISSIONS.SCHOOLS_MANAGEMENT.PAYMENTS.EDIT,
    PERMISSIONS.SCHOOLS_MANAGEMENT.PAYMENTS.ALL,
    PERMISSIONS.SCHOOLS_MANAGEMENT.ALL,
  )
  async update(@Param('id') id: string, @Body() dto: UpdatePaymentDto) {
    return this.paymentsService.update(id, dto);
  }
}
