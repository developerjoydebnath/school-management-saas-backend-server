import { Injectable, NotFoundException } from '@nestjs/common';
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
    return this.prisma.schoolSubscriptionDiscount.create({
      data: {
        ...createDto,
        appliedBy: adminId || null,
      },
    });
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
    const discount = await this.prisma.schoolSubscriptionDiscount.findUnique({
      where: { id },
    });
    if (!discount) {
      throw new NotFoundException(
        `SchoolSubscriptionDiscount with ID ${id} not found`,
      );
    }
    return discount;
  }

  async update(id: string, updateDto: UpdateSchoolSubscriptionDiscountDto) {
    await this.findOne(id);

    return this.prisma.schoolSubscriptionDiscount.update({
      where: { id },
      data: updateDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.schoolSubscriptionDiscount.delete({
      where: { id },
    });
  }

  async updateIsActive(id: string, isActive: boolean, adminId?: string) {
    await this.findOne(id);

    const updateData: any = { isActive };

    if (!isActive) {
      updateData.revokedAt = new Date();
      updateData.revokedBy = adminId || null;
    }

    return this.prisma.schoolSubscriptionDiscount.update({
      where: { id },
      data: updateData,
    });
  }
}
