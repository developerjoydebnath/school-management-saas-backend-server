import { Injectable, NotFoundException } from '@nestjs/common';
import { softDelete } from '../../common/utils/soft-delete.extension';
import { PrismaService } from '../../cores/prisma.service';
import { CreateSchoolSubscriptionDiscountDto } from './dto/create-school-subscription-discount.dto';
import { UpdateSchoolSubscriptionDiscountDto } from './dto/update-school-subscription-discount.dto';

@Injectable()
export class SchoolSubscriptionDiscountsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createDto: CreateSchoolSubscriptionDiscountDto,
    adminId?: string,
  ) {
    const discount = await this.prisma.schoolSubscriptionDiscount.create({
      data: {
        ...createDto,
        appliedBy: adminId || null,
      },
    });

    return {
      success: true,
      statusCode: 201,
      message: 'School subscription discount created successfully',
      data: discount,
      meta: null,
    };
  }

  async findAll(query: any = {}) {
    const page = query.page ? parseInt(query.page) : 1;
    const limit = query.limit ? parseInt(query.limit) : 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.subscriptionId) {
      where.subscriptionId = query.subscriptionId;
    }
    if (query.isActive !== undefined) {
      where.isActive = query.isActive === 'true' || query.isActive === true;
    }
    if (query.voucherId) {
      where.voucherId = query.voucherId;
    }

    const [items, total] = await Promise.all([
      this.prisma.schoolSubscriptionDiscount.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.schoolSubscriptionDiscount.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      statusCode: 200,
      message: 'School subscription discounts retrieved successfully',
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
    const discount = await this.prisma.schoolSubscriptionDiscount.findUnique({
      where: { id },
    });
    if (!discount) {
      throw new NotFoundException(
        `SchoolSubscriptionDiscount with ID ${id} not found`,
      );
    }
    return {
      success: true,
      statusCode: 200,
      message: 'School subscription discount retrieved successfully',
      data: discount,
      meta: null,
    };
  }

  async update(id: string, updateDto: UpdateSchoolSubscriptionDiscountDto) {
    await this.findOne(id);

    const updated = await this.prisma.schoolSubscriptionDiscount.update({
      where: { id },
      data: updateDto,
    });

    return {
      success: true,
      statusCode: 200,
      message: 'School subscription discount updated successfully',
      data: updated,
      meta: null,
    };
  }

  async remove(id: string) {
    await this.findOne(id);
    await softDelete(this.prisma.raw.schoolSubscriptionDiscount, id);
    return {
      success: true,
      statusCode: 200,
      message: 'School subscription discount deleted successfully',
      data: null,
      meta: null,
    };
  }

  async updateIsActive(id: string, isActive: boolean, adminId?: string) {
    await this.findOne(id);

    const updateData: any = { isActive };

    if (!isActive) {
      updateData.revokedAt = new Date();
      updateData.revokedBy = adminId || null;
    }

    const updated = await this.prisma.schoolSubscriptionDiscount.update({
      where: { id },
      data: updateData,
    });

    return {
      success: true,
      statusCode: 200,
      message: 'School subscription discount status updated successfully',
      data: updated,
      meta: null,
    };
  }
}
