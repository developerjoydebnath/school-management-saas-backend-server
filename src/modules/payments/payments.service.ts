import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../cores/prisma.service';
import { SchoolsActivationService } from '../schools/schools.activation.service';
import { PdfService } from './pdf.service';
import { getInvoiceTemplate } from './templates/invoice.template';

import {
  CreatePaymentDto,
  PurchasePlanDto,
  UpdatePaymentDto,
  VerifyVoucherDto,
} from './dto/payments.dto';

const PAYMENT_RELATIONS = {
  school: {
    select: {
      id: true,
      schoolName: true,
      contactEmail: true,
      contactPhone: true,
      address: true,
    },
  },
  subscription: {
    include: {
      plan: true,
    },
  },
} as const;

function parseCsv(value?: string): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function parseDateFilter(value?: string, endOfDay = false) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`Invalid payment date filter: ${value}`);
  }
  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  }
  return date;
}

function toMoney(value: any): number {
  return Number(value ?? 0);
}

function calculateDiscountAmount(discount: any, originalAmount: number): number {
  const storedAmount = toMoney(discount.discountAmountBdt);
  if (storedAmount > 0) {
    return Math.min(storedAmount, originalAmount);
  }

  const discountValue = toMoney(discount.discountValue);
  if (discount.discountType === 'percentage') {
    return Math.min((originalAmount * discountValue) / 100, originalAmount);
  }

  return Math.min(discountValue, originalAmount);
}

function calculateVoucherDiscountAmount(voucher: any, originalAmount: number): number {
  const discountValue = toMoney(voucher.discountValue);
  if (voucher.discountType === 'percentage') {
    return Math.min((originalAmount * discountValue) / 100, originalAmount);
  }

  return Math.min(discountValue, originalAmount);
}

function normalizeVoucherCode(value?: string | null): string | null {
  if (!value || value === 'none') return null;
  const code = value.trim();
  return code ? code : null;
}

function parseBillingCycles(value?: string | number | null): number {
  const cycles = Number(value ?? 1);
  if (!Number.isInteger(cycles) || cycles < 1 || cycles > 60) {
    throw new BadRequestException('Billing cycles must be between 1 and 60');
  }
  return cycles;
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activationService: SchoolsActivationService,
    private readonly pdfService: PdfService,
  ) {}

  async create(dto: CreatePaymentDto, adminId?: string) {
    const { voucherCode, billingCycles, ...paymentDto } = dto;
    const cycles = parseBillingCycles(billingCycles);
    const quote = await this.resolvePaymentQuote(
      paymentDto.subscriptionId,
      voucherCode,
      cycles,
    );
    const submittedAmount = roundMoney(toMoney(paymentDto.amount));
    const calculatedAmount = roundMoney(quote.payableAmount);
    if (submittedAmount !== calculatedAmount) {
      throw new BadRequestException(
        `Payment amount mismatch. Expected ${calculatedAmount}, received ${submittedAmount}. Please refresh the quote and try again.`,
      );
    }

    const data = await this.buildPaymentData(paymentDto, true);

    data.amount = calculatedAmount;
    data.metadata = {
      billingCycles: cycles,
      originalAmount: quote.originalAmount,
      originalBillAmount: quote.originalBillAmount,
      discountAmount: quote.discountAmount,
      maxDiscountBdt: quote.maxDiscountBdt,
      consumedMaxDiscountAmount: quote.consumedMaxDiscountAmount,
      remainingMaxDiscountAmount: quote.remainingMaxDiscountAmount,
      isMaxDiscountApplied: quote.isMaxDiscountApplied,
      voucherAppliedCycles: quote.voucherAppliedCycles,
      discountedCycles: quote.discountedCycles,
      fullPriceCycles: quote.fullPriceCycles,
      voucherCode: quote.discount?.voucherCode || null,
    };

    const payment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: data as any,
        include: PAYMENT_RELATIONS,
      });

      await this.applyPaymentDiscountCycle(
        tx,
        quote,
        (created.status || PaymentStatus.pending) as PaymentStatus,
        adminId,
      );
      const paymentDate =
        data.paidAt instanceof Date
          ? data.paidAt
          : created.paidAt || new Date();
      await this.updateSubscriptionExpiry(
        tx,
        quote.subscription.id,
        paymentDate,
        cycles,
        (created.status || PaymentStatus.pending) as PaymentStatus,
      );

      return created;
    });

    return {
      success: true,
      statusCode: 201,
      message: 'Payment created successfully',
      data: payment,
      meta: null,
    };
  }

  async findAll(query: any = {}) {
    const page = query.page ? parseInt(query.page) : 1;
    const limit = Math.min(query.limit ? parseInt(query.limit) : 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.schoolId) {
      where.schoolId = query.schoolId;
    }
    if (query.subscriptionId) {
      where.subscriptionId = query.subscriptionId;
    }
    const paidFrom = parseDateFilter(query.paidFrom);
    const paidTo = parseDateFilter(query.paidTo, true);
    if (paidFrom || paidTo) {
      where.paidAt = {
        ...(paidFrom ? { gte: paidFrom } : {}),
        ...(paidTo ? { lte: paidTo } : {}),
      };
    }

    const statuses = parseCsv(query.status).map((status) => {
      if (!Object.values(PaymentStatus).includes(status as PaymentStatus)) {
        throw new BadRequestException(`Invalid payment status filter: ${status}`);
      }
      return status as PaymentStatus;
    });
    if (statuses.length === 1) {
      where.status = statuses[0];
    }
    if (statuses.length > 1) {
      where.status = { in: statuses };
    }

    const methods = parseCsv(query.method).map((method) => {
      if (!Object.values(PaymentMethod).includes(method as PaymentMethod)) {
        throw new BadRequestException(`Invalid payment method filter: ${method}`);
      }
      return method as PaymentMethod;
    });
    if (methods.length === 1) {
      where.method = methods[0];
    }
    if (methods.length > 1) {
      where.method = { in: methods };
    }

    if (query.search) {
      where.OR = [
        { transactionId: { contains: query.search, mode: 'insensitive' } },
        { invoiceId: { contains: query.search, mode: 'insensitive' } },
        { notes: { contains: query.search, mode: 'insensitive' } },
        { school: { schoolName: { contains: query.search, mode: 'insensitive' } } },
        {
          subscription: {
            plan: { name: { contains: query.search, mode: 'insensitive' } },
          },
        },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: PAYMENT_RELATIONS,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.payment.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      statusCode: 200,
      message: 'Payments retrieved successfully',
      data: {
        items,
        meta: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      },
      meta: null,
    };
  }

  async findOne(id: string) {
    if (!isUuid(id)) {
      throw new NotFoundException('Payment not found');
    }

    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: PAYMENT_RELATIONS,
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return {
      success: true,
      statusCode: 200,
      message: 'Payment retrieved successfully',
      data: payment,
      meta: null,
    };
  }

  async getPaymentQuote(
    subscriptionId: string,
    voucherCode?: string,
    billingCycles?: string | number,
  ) {
    const quote = await this.resolvePaymentQuote(
      subscriptionId,
      voucherCode,
      parseBillingCycles(billingCycles),
    );

    return {
      success: true,
      statusCode: 200,
      message: 'Payment quote retrieved successfully',
      data: this.toPaymentQuoteResponse(quote),
      meta: null,
    };
  }

  async update(id: string, dto: UpdatePaymentDto) {
    const existingPayment = await this.prisma.payment.findUnique({
      where: { id },
      select: {
        id: true,
        amount: true,
        currency: true,
        subscriptionId: true,
        metadata: true,
      },
    });
    if (!existingPayment) {
      throw new NotFoundException('Payment not found');
    }
    this.assertUpdateDoesNotMutateCalculatedMoney(dto, existingPayment);

    const data = await this.buildPaymentData(dto, false, id);

    const payment = await this.prisma.payment.update({
      where: { id },
      data: data as any,
      include: PAYMENT_RELATIONS,
    });

    return {
      success: true,
      statusCode: 200,
      message: 'Payment updated successfully',
      data: payment,
      meta: null,
    };
  }

  async verifyVoucher(dto: VerifyVoucherDto) {
    const { schoolId, planId, voucherCode } = dto;

    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });
    if (!school) throw new NotFoundException('School not found');

    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });
    if (!plan) throw new NotFoundException('Subscription plan not found');

    const voucher = await this.prisma.voucher.findUnique({
      where: { code: voucherCode },
    });
    if (!voucher) throw new NotFoundException('Voucher not found');

    if (!voucher.isActive)
      throw new BadRequestException('Voucher is no longer active');

    if (voucher.validFrom && voucher.validFrom > new Date()) {
      throw new BadRequestException('Voucher is not active yet');
    }

    if (voucher.expiresAt && voucher.expiresAt < new Date()) {
      throw new BadRequestException('Voucher has expired');
    }

    if (
      voucher.maxRedemptions &&
      voucher.currentRedemptions >= voucher.maxRedemptions
    ) {
      throw new BadRequestException('Voucher quota has been reached');
    }

    if (
      voucher.applicablePlanIds.length > 0 &&
      !voucher.applicablePlanIds.includes(planId)
    ) {
      throw new BadRequestException('Voucher is not applicable for this plan');
    }

    if (
      voucher.minimumBillBdt &&
      Number(plan.priceBdt) < Number(voucher.minimumBillBdt)
    ) {
      throw new BadRequestException(
        `Voucher requires a minimum bill of ৳${voucher.minimumBillBdt.toString()}`,
      );
    }

    if (voucher.onePerSchool) {
      const existingDiscount =
        await this.prisma.schoolSubscriptionDiscount.findFirst({
          where: {
            subscription: { schoolId },
            voucherId: voucher.id,
          },
        });
      if (existingDiscount) {
        throw new BadRequestException(
          'Voucher has already been used by this school',
        );
      }
    }

    // Calculate discount
    let discountAmount = 0;
    if (voucher.discountType === 'fixed_amount') {
      discountAmount = Number(voucher.discountValue);
    } else if (voucher.discountType === 'percentage') {
      discountAmount =
        (Number(plan.priceBdt) * Number(voucher.discountValue)) / 100;
      if (
        voucher.maxDiscountBdt &&
        discountAmount > Number(voucher.maxDiscountBdt)
      ) {
        discountAmount = Number(voucher.maxDiscountBdt);
      }
    }

    const finalPrice = Math.max(0, Number(plan.priceBdt) - discountAmount);

    return {
      success: true,
      statusCode: 200,
      message: 'Voucher is valid',
      data: {
        planPrice: Number(plan.priceBdt),
        discountAmount,
        finalPrice,
        voucherName: voucher.name,
      },
      meta: null,
    };
  }

  async purchasePlan(dto: PurchasePlanDto, adminId: string) {
    const { schoolId, planId, voucherCode, transactionId, method } = dto;

    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });
    if (!school) throw new NotFoundException('School not found');
    if (school.status !== 'pending') {
      throw new ConflictException(
        'School is already activated or not in pending status',
      );
    }

    if (transactionId) {
      const existingTx = await this.prisma.payment.findUnique({
        where: { transactionId },
      });
      if (existingTx) {
        throw new ConflictException(
          `Transaction ID "${transactionId}" has already been used.`,
        );
      }
    }

    let planPrice = 0;
    let discountAmount = 0;
    let finalPrice = 0;
    let voucherId: string | null = null;
    let voucherDiscountType: 'percentage' | 'fixed_amount' | null = null;
    let voucherDiscountValue = 0;
    let durationCycles: number | null = null;

    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });
    if (!plan) throw new NotFoundException('Plan not found');
    planPrice = Number(plan.priceBdt);

    if (voucherCode) {
      const verification = await this.verifyVoucher({
        schoolId,
        planId,
        voucherCode,
      });
      discountAmount = verification.data.discountAmount;
      finalPrice = verification.data.finalPrice;
      const voucher = await this.prisma.voucher.findUnique({
        where: { code: voucherCode },
      });
      voucherId = voucher!.id;
      voucherDiscountType = voucher!.discountType;
      voucherDiscountValue = Number(voucher!.discountValue);
      durationCycles = voucher!.durationCycles;
    } else {
      finalPrice = planPrice;
    }

    // Determine admin name
    let adminName = 'School Admin';
    try {
      if (school.notes) {
        const metadata = JSON.parse(school.notes);
        if (metadata.adminName) adminName = metadata.adminName;
      }
    } catch {
      // ignore JSON parsing errors
    }

    // Generate Invoice ID
    const invoiceId = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    await this.prisma.$transaction(
      async (tx) => {
        // Create Subscription
        const startsAt = new Date();
        let expiresAt: Date | null = null;
        if (plan.billingCycle === 'monthly') {
          expiresAt = new Date(startsAt);
          expiresAt.setMonth(expiresAt.getMonth() + 1);
        } else if (plan.billingCycle === 'annual') {
          expiresAt = new Date(startsAt);
          expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        }

        const subscription = await tx.schoolSubscription.create({
          data: {
            schoolId,
            planId,
            startsAt,
            expiresAt,
            status: 'active',
            priceBdt: planPrice,
            billingCycle: plan.billingCycle,
            setupFeeBdt: plan.setupFeeBdt,
            freeStudentLimit: plan.freeStudentLimit,
            maxStudents: plan.maxStudents,
            maxTeachers: plan.maxTeachers,
            maxStaff: plan.maxStaff,
            maxClasses: plan.maxClasses,
            maxSubjects: plan.maxSubjects,
            maxBranches: plan.maxBranches,
            storageGb: plan.storageGb,
            hasSmsNotifications: plan.hasSmsNotifications,
            hasEmailNotifications: plan.hasEmailNotifications,
            hasParentPortal: plan.hasParentPortal,
            hasOnlineAdmission: plan.hasOnlineAdmission,
            hasOnlineFeePayment: plan.hasOnlineFeePayment,
            hasResultPublishing: plan.hasResultPublishing,
            hasCustomDomain: plan.hasCustomDomain,
            hasApiAccess: plan.hasApiAccess,
            hasAdvancedReports: plan.hasAdvancedReports,
            hasPrioritySupport: plan.hasPrioritySupport,
            hasDedicatedAccountManager: plan.hasDedicatedAccountManager,
            activatedBy: adminId,
          },
        });

        await tx.payment.create({
          data: {
            schoolId,
            subscriptionId: subscription.id,
            transactionId,
            invoiceId,
            amount: finalPrice,
            currency: 'BDT',
            status: 'completed',
            method,
            paidAt: new Date(),
          },
        });

        // Update Voucher Usage
        if (voucherId) {
          await tx.voucher.update({
            where: { id: voucherId },
            data: {
              currentRedemptions: { increment: 1 },
            },
          });

          // Create Discount Record
          await tx.schoolSubscriptionDiscount.create({
            data: {
              subscriptionId: subscription.id,
              voucherId: voucherId,
              voucherCode,
              adjustmentType: 'voucher',
              discountType: voucherDiscountType!,
              discountValue: voucherDiscountValue,
              discountAmountBdt: discountAmount,
              durationCycles: durationCycles,
              appliedCyclesCount: 1,
              appliedBy: adminId,
              reason: `Voucher applied: ${voucherCode}`,
            },
          });
        }

        // Finally activate the school (creates schema, users, and marks school active)
        await this.activationService.activateSchool(
          school,
          adminId,
          adminName,
          tx,
        );

        return subscription;
      },
      { timeout: 30000 },
    );

    const activated = await this.prisma.school.findUnique({
      where: { id: school.id },
    });

    return {
      success: true,
      statusCode: 200,
      message: 'Plan purchased and school activated successfully',
      data: activated,
      meta: null,
    };
  }

  async generateInvoice(paymentId: string): Promise<Buffer> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        school: true,
        subscription: {
          include: { plan: true },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    const planName = payment.subscription?.plan?.name || 'Subscription Plan';
    
    const htmlContent = getInvoiceTemplate(
      payment.invoiceId || payment.id.substring(0, 8),
      payment.paidAt ? payment.paidAt.toLocaleDateString() : new Date().toLocaleDateString(),
      payment.method,
      payment.transactionId,
      payment.amount.toString(),
      payment.currency,
      payment.school.schoolName,
      payment.school.address || '',
      planName,
    );

    return this.pdfService.generatePdf(htmlContent);
  }

  private hasRemainingDiscountCycle(discount: any) {
    if (discount.durationCycles === null || discount.durationCycles === undefined) {
      return true;
    }

    return Number(discount.appliedCyclesCount ?? 0) < discount.durationCycles;
  }

  private findCurrentDiscount(discounts: any[]) {
    return discounts.find((discount) => this.hasRemainingDiscountCycle(discount));
  }

  private resolveOriginalAmount(subscription: any, discount?: any) {
    const subscriptionAmount = toMoney(subscription.priceBdt);
    const planAmount = toMoney(subscription.plan?.priceBdt);
    const storedDiscountAmount = discount ? toMoney(discount.discountAmountBdt) : 0;
    const looksLikeAlreadyDiscounted =
      discount &&
      planAmount > subscriptionAmount &&
      Math.abs(subscriptionAmount + storedDiscountAmount - planAmount) < 0.01;

    return looksLikeAlreadyDiscounted ? planAmount : subscriptionAmount;
  }

  private async loadSubscriptionForQuote(subscriptionId: string) {
    if (!subscriptionId || !isUuid(subscriptionId)) {
      throw new NotFoundException('School subscription not found');
    }

    const subscription = await this.prisma.schoolSubscription.findFirst({
      where: { id: subscriptionId, deletedAt: null },
      include: {
        school: { select: { id: true, schoolName: true } },
        plan: { select: { id: true, name: true, priceBdt: true } },
        discounts: {
          where: {
            deletedAt: null,
            isActive: true,
          },
          include: {
            voucher: {
              select: {
                id: true,
                name: true,
                code: true,
                discountType: true,
                discountValue: true,
                maxDiscountBdt: true,
                minimumBillBdt: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!subscription) {
      throw new NotFoundException('School subscription not found');
    }

    return subscription;
  }

  private async validateVoucherForSubscription(
    subscription: any,
    voucherCode: string,
    originalBillAmount: number,
  ) {
    const voucher = await this.prisma.voucher.findFirst({
      where: {
        code: voucherCode,
        deletedAt: null,
      },
    });

    if (!voucher) throw new NotFoundException('Voucher not found');
    if (!voucher.isActive) {
      throw new BadRequestException('Voucher is no longer active');
    }

    const now = new Date();
    if (voucher.validFrom && voucher.validFrom > now) {
      throw new BadRequestException('Voucher is not active yet');
    }
    if (voucher.expiresAt && voucher.expiresAt < now) {
      throw new BadRequestException('Voucher has expired');
    }

    if (
      voucher.maxRedemptions &&
      voucher.currentRedemptions >= voucher.maxRedemptions
    ) {
      throw new BadRequestException('Voucher quota has been reached');
    }

    if (
      voucher.applicablePlanIds.length > 0 &&
      !voucher.applicablePlanIds.includes(subscription.planId)
    ) {
      throw new BadRequestException('Voucher is not applicable for this plan');
    }

    if (
      voucher.minimumBillBdt &&
      originalBillAmount < Number(voucher.minimumBillBdt)
    ) {
      throw new BadRequestException(
        `Voucher requires a minimum bill of ৳${voucher.minimumBillBdt.toString()}`,
      );
    }

    if (voucher.onePerSchool) {
      const existingDiscount =
        await this.prisma.schoolSubscriptionDiscount.findFirst({
          where: {
            subscription: { schoolId: subscription.schoolId },
            voucherId: voucher.id,
            deletedAt: null,
          },
          select: { id: true },
        });

      if (existingDiscount) {
        throw new BadRequestException(
          'Voucher has already been used by this school',
        );
      }
    }

    return voucher;
  }

  private async getConsumedVoucherDiscountAmount(
    subscriptionId: string,
    voucherCode: string,
    selectedDiscount?: any,
  ): Promise<number> {
    const payments = await this.prisma.payment.findMany({
      where: {
        subscriptionId,
        status: PaymentStatus.completed,
      },
      select: {
        metadata: true,
      },
    });

    let consumedAmount = 0;
    for (const payment of payments) {
      const metadata = payment.metadata as any;
      if (
        metadata &&
        typeof metadata === 'object' &&
        metadata.voucherCode === voucherCode
      ) {
        consumedAmount += toMoney(metadata.discountAmount);
      }
    }

    if (consumedAmount > 0) {
      return consumedAmount;
    }

    if (!selectedDiscount) {
      return 0;
    }

    return (
      toMoney(selectedDiscount.discountAmountBdt) *
      Number(selectedDiscount.appliedCyclesCount ?? 0)
    );
  }

  private async resolvePaymentQuote(
    subscriptionId: string,
    voucherCode?: string,
    billingCycles = 1,
  ) {
    const subscription = await this.loadSubscriptionForQuote(subscriptionId);
    const cycles = parseBillingCycles(billingCycles);
    const selectedVoucherCode = normalizeVoucherCode(voucherCode);
    const currentDiscount = this.findCurrentDiscount(subscription.discounts);
    const existingSelectedDiscount = selectedVoucherCode
      ? subscription.discounts.find((discount) => {
          const code = discount.voucherCode || discount.voucher?.code;
          return code === selectedVoucherCode;
        })
      : null;

    if (existingSelectedDiscount && !this.hasRemainingDiscountCycle(existingSelectedDiscount)) {
      throw new BadRequestException('Voucher duration cycle has ended');
    }

    const originalAmount = this.resolveOriginalAmount(
      subscription,
      existingSelectedDiscount || currentDiscount,
    );
    const originalBillAmount = originalAmount * cycles;
    const newVoucher =
      selectedVoucherCode && !existingSelectedDiscount
        ? await this.validateVoucherForSubscription(
            subscription,
            selectedVoucherCode,
            originalBillAmount,
          )
        : null;
    const selectedDiscount =
      existingSelectedDiscount || (!selectedVoucherCode ? currentDiscount : null);
    if (
      selectedDiscount?.voucher?.minimumBillBdt &&
      originalBillAmount < Number(selectedDiscount.voucher.minimumBillBdt)
    ) {
      throw new BadRequestException(
        `Voucher requires a minimum bill of BDT ${selectedDiscount.voucher.minimumBillBdt.toString()}`,
      );
    }
    const perCycleDiscountAmount = newVoucher
      ? calculateVoucherDiscountAmount(newVoucher, originalAmount)
      : selectedDiscount
        ? calculateDiscountAmount(selectedDiscount, originalAmount)
        : 0;
    const durationCycles = newVoucher
      ? newVoucher.durationCycles
      : selectedDiscount?.durationCycles;
    const appliedCyclesCount = selectedDiscount
      ? Number(selectedDiscount.appliedCyclesCount ?? 0)
      : 0;
    const remainingCycles =
      durationCycles === null || durationCycles === undefined
        ? null
        : Math.max(durationCycles - appliedCyclesCount, 0);
    const eligibleDiscountedCycles =
      newVoucher || selectedDiscount
        ? remainingCycles === null
          ? cycles
          : Math.min(cycles, remainingCycles)
        : 0;
    const rawDiscountAmount = perCycleDiscountAmount * eligibleDiscountedCycles;
    const maxDiscountBdt =
      newVoucher?.maxDiscountBdt ?? selectedDiscount?.voucher?.maxDiscountBdt;
    const voucherCodeForDiscount =
      newVoucher?.code ||
      selectedDiscount?.voucherCode ||
      selectedDiscount?.voucher?.code ||
      null;
    const consumedMaxDiscountAmount =
      maxDiscountBdt && voucherCodeForDiscount
        ? await this.getConsumedVoucherDiscountAmount(
            subscription.id,
            voucherCodeForDiscount,
            selectedDiscount,
          )
        : 0;
    const remainingMaxDiscountAmount = maxDiscountBdt
      ? Math.max(toMoney(maxDiscountBdt) - consumedMaxDiscountAmount, 0)
      : null;
    const discountAmount =
      remainingMaxDiscountAmount === null
        ? rawDiscountAmount
        : Math.min(rawDiscountAmount, remainingMaxDiscountAmount);
    const voucherAppliedCycles = newVoucher || selectedDiscount
      ? eligibleDiscountedCycles
      : 0;
    const discountedCycles = discountAmount > 0 ? voucherAppliedCycles : 0;
    const fullPriceCycles = cycles - discountedCycles;
    const effectivePerCycleDiscountAmount =
      discountedCycles > 0 ? discountAmount / discountedCycles : 0;
    const discountedCycleAmount = Math.max(
      0,
      originalAmount - effectivePerCycleDiscountAmount,
    );
    const payableAmount = originalBillAmount - discountAmount;

    return {
      subscription,
      currentDiscount,
      selectedDiscount,
      newVoucher,
      billingCycles: cycles,
      voucherAppliedCycles,
      discountedCycles,
      fullPriceCycles,
      originalAmount,
      originalBillAmount,
      discountedCycleAmount,
      payableAmount,
      discountAmount,
      perCycleDiscountAmount: effectivePerCycleDiscountAmount,
      rawPerCycleDiscountAmount: perCycleDiscountAmount,
      maxDiscountBdt: maxDiscountBdt ? toMoney(maxDiscountBdt) : null,
      consumedMaxDiscountAmount,
      remainingMaxDiscountAmount,
      isMaxDiscountApplied:
        remainingMaxDiscountAmount !== null &&
        rawDiscountAmount > remainingMaxDiscountAmount,
      remainingCycles,
      discount: newVoucher || selectedDiscount ? {
        id: selectedDiscount?.id ?? null,
        voucherId: newVoucher?.id ?? selectedDiscount?.voucherId ?? null,
        voucherCode:
          newVoucher?.code ||
          selectedDiscount?.voucherCode ||
          selectedDiscount?.voucher?.code ||
          null,
        voucherName: newVoucher?.name || selectedDiscount?.voucher?.name || null,
        discountType: newVoucher?.discountType || selectedDiscount?.discountType,
        discountValue: toMoney(newVoucher?.discountValue ?? selectedDiscount?.discountValue),
        discountAmountBdt: effectivePerCycleDiscountAmount,
        durationCycles,
        remainingCycles:
          remainingCycles === null
            ? null
            : Math.max(remainingCycles - voucherAppliedCycles, 0),
      } : null,
    };
  }

  private toPaymentQuoteResponse(quote: any) {
    return {
      subscriptionId: quote.subscription.id,
      schoolId: quote.subscription.schoolId,
      planId: quote.subscription.planId,
      schoolName: quote.subscription.school?.schoolName ?? null,
      planName: quote.subscription.plan?.name ?? null,
      billingCycle: quote.subscription.billingCycle,
      billingCycles: quote.billingCycles,
      originalAmount: quote.originalAmount,
      originalBillAmount: quote.originalBillAmount,
      discountedCycleAmount: quote.discountedCycleAmount,
      payableAmount: quote.payableAmount,
      discountAmount: quote.discountAmount,
      perCycleDiscountAmount: quote.perCycleDiscountAmount,
      maxDiscountBdt: quote.maxDiscountBdt,
      consumedMaxDiscountAmount: quote.consumedMaxDiscountAmount,
      remainingMaxDiscountAmount: quote.remainingMaxDiscountAmount,
      isMaxDiscountApplied: quote.isMaxDiscountApplied,
      voucherAppliedCycles: quote.voucherAppliedCycles,
      discountedCycles: quote.discountedCycles,
      fullPriceCycles: quote.fullPriceCycles,
      discount: quote.discount,
    };
  }

  private async applyPaymentDiscountCycle(
    tx: any,
    quote: any,
    status: PaymentStatus,
    adminId?: string,
  ) {
    if (status !== PaymentStatus.completed || !quote.discount) {
      return;
    }

    if (quote.newVoucher) {
      const shouldReplaceCurrent =
        quote.currentDiscount &&
        quote.currentDiscount.id !== quote.selectedDiscount?.id;

      if (shouldReplaceCurrent) {
        if (
          quote.newVoucher.durationCycles === null ||
          quote.newVoucher.durationCycles === undefined ||
          quote.newVoucher.durationCycles > 1
        ) {
          await tx.schoolSubscriptionDiscount.update({
            where: { id: quote.currentDiscount.id },
            data: {
              isActive: false,
              revokedAt: new Date(),
              revokedBy: adminId || null,
              revokeReason: `Replaced by voucher ${quote.newVoucher.code}`,
            },
          });
        } else if (quote.currentDiscount.durationCycles !== null) {
          const nextCount =
            Number(quote.currentDiscount.appliedCyclesCount ?? 0) +
            quote.voucherAppliedCycles;
          await tx.schoolSubscriptionDiscount.update({
            where: { id: quote.currentDiscount.id },
            data: {
              appliedCyclesCount: nextCount,
              ...(nextCount >= quote.currentDiscount.durationCycles
                ? { isActive: false }
                : {}),
            },
          });
        }
      }

      await tx.voucher.update({
        where: { id: quote.newVoucher.id },
        data: { currentRedemptions: { increment: 1 } },
      });

      await tx.schoolSubscriptionDiscount.create({
        data: {
          subscriptionId: quote.subscription.id,
          voucherId: quote.newVoucher.id,
          voucherCode: quote.newVoucher.code,
          adjustmentType: 'voucher',
          discountType: quote.newVoucher.discountType,
          discountValue: quote.newVoucher.discountValue,
          discountAmountBdt: quote.perCycleDiscountAmount,
          durationCycles: quote.newVoucher.durationCycles,
          appliedCyclesCount: quote.voucherAppliedCycles,
          appliedBy: adminId || null,
          reason: `Voucher applied: ${quote.newVoucher.code}`,
        },
      });
      return;
    }

    if (quote.selectedDiscount) {
      const nextCount =
        Number(quote.selectedDiscount.appliedCyclesCount ?? 0) +
        quote.voucherAppliedCycles;
      await tx.schoolSubscriptionDiscount.update({
        where: { id: quote.selectedDiscount.id },
        data: {
          appliedCyclesCount: nextCount,
          ...(quote.selectedDiscount.durationCycles !== null &&
          nextCount >= quote.selectedDiscount.durationCycles
            ? { isActive: false }
            : {}),
        },
      });
    }
  }

  private async updateSubscriptionExpiry(
    tx: any,
    subscriptionId: string,
    paidAt: Date,
    billingCycles: number,
    status: PaymentStatus,
  ) {
    if (status !== PaymentStatus.completed) {
      return;
    }

    await tx.schoolSubscription.update({
      where: { id: subscriptionId },
      data: {
        expiresAt: addMonths(new Date(paidAt), billingCycles),
      },
    });
  }

  private assertUpdateDoesNotMutateCalculatedMoney(
    dto: UpdatePaymentDto,
    existingPayment: {
      amount: any;
      currency: string;
      subscriptionId: string | null;
      metadata: any;
    },
  ) {
    if (
      dto.amount !== undefined &&
      roundMoney(toMoney(dto.amount)) !== roundMoney(toMoney(existingPayment.amount))
    ) {
      throw new BadRequestException(
        'Payment amount is calculated by the backend and cannot be changed directly. Refresh the quote and create a corrected payment.',
      );
    }

    if (
      dto.currency !== undefined &&
      dto.currency.toUpperCase() !== existingPayment.currency.toUpperCase()
    ) {
      throw new BadRequestException(
        'Payment currency is part of the backend-calculated payment snapshot and cannot be changed directly.',
      );
    }

    if (
      dto.subscriptionId !== undefined &&
      dto.subscriptionId !== existingPayment.subscriptionId
    ) {
      throw new BadRequestException(
        'Payment subscription cannot be changed after payment calculation.',
      );
    }

    if (dto.metadata !== undefined) {
      throw new BadRequestException(
        'Payment calculation metadata is generated by the backend and cannot be changed directly.',
      );
    }
  }

  private async buildPaymentData(
    dto: Partial<CreatePaymentDto & UpdatePaymentDto>,
    requireSchool: boolean,
    currentPaymentId?: string,
  ) {
    if (requireSchool && !dto.schoolId) {
      throw new BadRequestException('School is required');
    }
    if (requireSchool && !dto.subscriptionId) {
      throw new BadRequestException('Subscription is required');
    }

    if (dto.schoolId) {
      const school = await this.prisma.school.findFirst({
        where: { id: dto.schoolId, deletedAt: null },
        select: { id: true },
      });

      if (!school) {
        throw new NotFoundException('School not found');
      }
    }

    if (dto.subscriptionId) {
      const currentPayment = currentPaymentId
        ? await this.prisma.payment.findUnique({
            where: { id: currentPaymentId },
            select: { schoolId: true },
          })
        : null;
      const subscription = await this.prisma.schoolSubscription.findFirst({
        where: { id: dto.subscriptionId, deletedAt: null },
        select: { id: true, schoolId: true },
      });

      if (!subscription) {
        throw new NotFoundException('School subscription not found');
      }

      const targetSchoolId = dto.schoolId || currentPayment?.schoolId;
      if (targetSchoolId && subscription.schoolId !== targetSchoolId) {
        throw new BadRequestException(
          'Selected subscription does not belong to selected school',
        );
      }
    }

    if (dto.transactionId) {
      const existingTransaction = await this.prisma.payment.findFirst({
        where: { transactionId: dto.transactionId },
        select: { id: true },
      });

      if (existingTransaction && existingTransaction.id !== currentPaymentId) {
        throw new ConflictException(
          `Transaction ID "${dto.transactionId}" has already been used.`,
        );
      }
    }

    if (dto.invoiceId) {
      const existingInvoice = await this.prisma.payment.findFirst({
        where: { invoiceId: dto.invoiceId },
        select: { id: true },
      });

      if (existingInvoice && existingInvoice.id !== currentPaymentId) {
        throw new ConflictException(
          `Invoice ID "${dto.invoiceId}" has already been used.`,
        );
      }
    }

    const data: any = {
      ...dto,
      ...(dto.currency ? { currency: dto.currency.toUpperCase() } : {}),
      ...(dto.status ? { status: dto.status } : {}),
      ...(dto.paidAt !== undefined
        ? { paidAt: dto.paidAt ? new Date(dto.paidAt) : null }
        : {}),
    };

    if (requireSchool && !data.invoiceId) {
      data.invoiceId = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }

    return Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined),
    );
  }
}
