import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SubscriptionStatus } from '@prisma/client';
import { softDelete } from '../../common/utils/soft-delete.extension';
import { PrismaService } from '../../cores/prisma.service';
import { CreateSchoolSubscriptionDto } from './dto/create-school-subscription.dto';
import { UpdateSchoolSubscriptionDto } from './dto/update-school-subscription.dto';

const RELATIONS = {
  school: {
    select: {
      id: true,
      schoolName: true,
      schoolNameBn: true,
      contactEmail: true,
      contactPhone: true,
      status: true,
    },
  },
  plan: true,
  payments: true,
  discounts: {
    include: {
      voucher: true,
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

function toDate(value?: string | Date | null): Date | undefined {
  if (!value) return undefined;
  return value instanceof Date ? value : new Date(value);
}

function parseDateFilter(value?: string, endOfDay = false) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`Invalid created date filter: ${value}`);
  }
  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  }
  return date;
}

@Injectable()
export class SchoolSubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateSchoolSubscriptionDto, adminId?: string) {
    const data = await this.buildSubscriptionData(createDto, adminId);

    const subscription = await this.prisma.schoolSubscription.create({
      data: data as any,
      include: RELATIONS,
    });

    return {
      success: true,
      statusCode: 201,
      message: 'School subscription created successfully',
      data: subscription,
      meta: null,
    };
  }

  async findAll(query: any = {}) {
    const page = query.page ? parseInt(query.page) : 1;
    const limit = Math.min(query.limit ? parseInt(query.limit) : 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    const statuses = parseCsv(query.status).map((status) => {
      if (!Object.values(SubscriptionStatus).includes(status as SubscriptionStatus)) {
        throw new BadRequestException(`Invalid subscription status filter: ${status}`);
      }
      return status as SubscriptionStatus;
    });
    if (statuses.length === 1) {
      where.status = statuses[0];
    }
    if (statuses.length > 1) {
      where.status = { in: statuses };
    }
    if (query.schoolId) {
      where.schoolId = query.schoolId;
    }
    if (query.planId) {
      where.planId = query.planId;
    }
    const createdFrom = parseDateFilter(query.createdFrom);
    const createdTo = parseDateFilter(query.createdTo, true);
    if (createdFrom || createdTo) {
      where.createdAt = {
        ...(createdFrom ? { gte: createdFrom } : {}),
        ...(createdTo ? { lte: createdTo } : {}),
      };
    }
    if (query.search) {
      where.OR = [
        { school: { schoolName: { contains: query.search, mode: 'insensitive' } } },
        { plan: { name: { contains: query.search, mode: 'insensitive' } } },
        { notes: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.isDeleted === 'true' || query.isDeleted === true) {
      where.deletedAt = { not: null };
    } else {
      where.deletedAt = null;
    }

    const [items, total] = await Promise.all([
      this.prisma.schoolSubscription.findMany({
        where,
        include: RELATIONS,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.schoolSubscription.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      statusCode: 200,
      message: 'School subscriptions retrieved successfully',
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
    this.ensureValidSubscriptionId(id);

    const subscription = await this.prisma.schoolSubscription.findFirst({
      where: { id, deletedAt: null },
      include: RELATIONS,
    });
    if (!subscription) {
      throw new NotFoundException('School subscription not found');
    }
    return {
      success: true,
      statusCode: 200,
      message: 'School subscription retrieved successfully',
      data: subscription,
      meta: null,
    };
  }

  async update(id: string, updateDto: UpdateSchoolSubscriptionDto) {
    await this.findOne(id);
    const data = await this.buildSubscriptionData(updateDto);

    const updated = await this.prisma.schoolSubscription.update({
      where: { id },
      data: data as any,
      include: RELATIONS,
    });

    return {
      success: true,
      statusCode: 200,
      message: 'School subscription updated successfully',
      data: updated,
      meta: null,
    };
  }

  async remove(id: string, adminId?: string) {
    await this.findOne(id);
    await softDelete(this.prisma.raw.schoolSubscription, id, adminId);
    return {
      success: true,
      statusCode: 200,
      message: 'School subscription deleted successfully',
      data: null,
      meta: null,
    };
  }

  async updateStatus(id: string, status: SubscriptionStatus, adminId?: string) {
    await this.findOne(id);

    const updateData: any = { status };

    if (status === SubscriptionStatus.cancelled) {
      updateData.cancelledAt = new Date();
      updateData.cancelledBy = adminId || null;
    }

    const updated = await this.prisma.schoolSubscription.update({
      where: { id },
      data: updateData,
      include: RELATIONS,
    });

    return {
      success: true,
      statusCode: 200,
      message: 'School subscription status updated successfully',
      data: updated,
      meta: null,
    };
  }

  private ensureValidSubscriptionId(id: string) {
    if (!isUuid(id)) {
      throw new NotFoundException('School subscription not found');
    }
  }

  private async buildSubscriptionData(
    dto: Partial<CreateSchoolSubscriptionDto>,
    adminId?: string,
  ) {
    const plan = dto.planId
      ? await this.prisma.subscriptionPlan.findFirst({
          where: { id: dto.planId, deletedAt: null },
        })
      : null;

    if (dto.planId && !plan) {
      throw new NotFoundException('Subscription plan not found');
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

    const data: any = {
      ...dto,
      ...(adminId !== undefined ? { activatedBy: adminId || null } : {}),
    };

    data.startsAt = toDate(dto.startsAt);
    data.expiresAt = toDate(dto.expiresAt);
    data.trialEndsAt = toDate(dto.trialEndsAt);

    if (plan) {
      data.gracePeriodDays = dto.gracePeriodDays ?? plan.gracePeriodDays;
      data.maxStudents = dto.maxStudents ?? plan.maxStudents;
      data.maxTeachers = dto.maxTeachers ?? plan.maxTeachers;
      data.maxStaff = dto.maxStaff ?? plan.maxStaff;
      data.maxClasses = dto.maxClasses ?? plan.maxClasses;
      data.maxSubjects = dto.maxSubjects ?? plan.maxSubjects;
      data.maxBranches = dto.maxBranches ?? plan.maxBranches;
      data.storageGb = dto.storageGb ?? plan.storageGb;
      data.freeStudentLimit = dto.freeStudentLimit ?? plan.freeStudentLimit;
      data.hasSmsNotifications =
        dto.hasSmsNotifications ?? plan.hasSmsNotifications;
      data.hasEmailNotifications =
        dto.hasEmailNotifications ?? plan.hasEmailNotifications;
      data.hasParentPortal = dto.hasParentPortal ?? plan.hasParentPortal;
      data.hasOnlineAdmission =
        dto.hasOnlineAdmission ?? plan.hasOnlineAdmission;
      data.hasOnlineFeePayment =
        dto.hasOnlineFeePayment ?? plan.hasOnlineFeePayment;
      data.hasResultPublishing =
        dto.hasResultPublishing ?? plan.hasResultPublishing;
      data.hasCustomDomain = dto.hasCustomDomain ?? plan.hasCustomDomain;
      data.hasApiAccess = dto.hasApiAccess ?? plan.hasApiAccess;
      data.hasAdvancedReports =
        dto.hasAdvancedReports ?? plan.hasAdvancedReports;
      data.hasPrioritySupport =
        dto.hasPrioritySupport ?? plan.hasPrioritySupport;
      data.hasDedicatedAccountManager =
        dto.hasDedicatedAccountManager ?? plan.hasDedicatedAccountManager;
      data.priceBdt = dto.priceBdt ?? plan.priceBdt;
      data.billingCycle = dto.billingCycle ?? plan.billingCycle;
      data.setupFeeBdt = dto.setupFeeBdt ?? plan.setupFeeBdt;
    }

    return Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined),
    );
  }
}
