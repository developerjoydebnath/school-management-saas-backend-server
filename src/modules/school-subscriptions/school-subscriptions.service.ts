import { Injectable, NotFoundException } from '@nestjs/common';
import { SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../../cores/prisma.service';
import { CreateSchoolSubscriptionDto } from './dto/create-school-subscription.dto';
import { UpdateSchoolSubscriptionDto } from './dto/update-school-subscription.dto';

@Injectable()
export class SchoolSubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateSchoolSubscriptionDto, adminId?: string) {
    return this.prisma.schoolSubscription.create({
      data: {
        ...createDto,
        activatedBy: adminId || null,
      },
    });
  }

  async findAll(query: any = {}) {
    const page = query.page ? parseInt(query.page) : 1;
    const limit = query.limit ? parseInt(query.limit) : 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) {
      where.status = query.status;
    }
    if (query.schoolId) {
      where.schoolId = query.schoolId;
    }
    if (query.planId) {
      where.planId = query.planId;
    }

    const [items, total] = await Promise.all([
      this.prisma.schoolSubscription.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.schoolSubscription.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const subscription = await this.prisma.schoolSubscription.findUnique({
      where: { id },
    });
    if (!subscription) {
      throw new NotFoundException(`SchoolSubscription with ID ${id} not found`);
    }
    return subscription;
  }

  async update(id: string, updateDto: UpdateSchoolSubscriptionDto) {
    await this.findOne(id);

    return this.prisma.schoolSubscription.update({
      where: { id },
      data: updateDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.schoolSubscription.delete({
      where: { id },
    });
  }

  async updateStatus(id: string, status: SubscriptionStatus, adminId?: string) {
    await this.findOne(id);

    const updateData: any = { status };

    if (status === SubscriptionStatus.cancelled) {
      updateData.cancelledAt = new Date();
      updateData.cancelledBy = adminId || null;
    }

    return this.prisma.schoolSubscription.update({
      where: { id },
      data: updateData,
    });
  }
}
