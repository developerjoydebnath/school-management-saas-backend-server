import { Injectable, NotFoundException } from '@nestjs/common';
import { SubscriptionStatus } from '@prisma/client';
import { softDelete } from '../../common/utils/soft-delete.extension';
import { PrismaService } from '../../cores/prisma.service';
import { CreateSchoolSubscriptionDto } from './dto/create-school-subscription.dto';
import { UpdateSchoolSubscriptionDto } from './dto/update-school-subscription.dto';

@Injectable()
export class SchoolSubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateSchoolSubscriptionDto, adminId?: string) {
    const subscription = await this.prisma.schoolSubscription.create({
      data: {
        ...createDto,
        activatedBy: adminId || null,
      },
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
    const subscription = await this.prisma.schoolSubscription.findUnique({
      where: { id },
    });
    if (!subscription) {
      throw new NotFoundException(`SchoolSubscription with ID ${id} not found`);
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

    const updated = await this.prisma.schoolSubscription.update({
      where: { id },
      data: updateDto,
    });

    return {
      success: true,
      statusCode: 200,
      message: 'School subscription updated successfully',
      data: updated,
      meta: null,
    };
  }

  async remove(id: string) {
    await this.findOne(id);
    await softDelete(this.prisma.raw.schoolSubscription, id);
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
    });

    return {
      success: true,
      statusCode: 200,
      message: 'School subscription status updated successfully',
      data: updated,
      meta: null,
    };
  }
}
