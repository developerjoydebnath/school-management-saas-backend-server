import { Injectable, NotFoundException } from '@nestjs/common';
import { softDelete } from '../../common/utils/soft-delete.extension';
import { PrismaService } from '../../cores/prisma.service';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';

@Injectable()
export class SubscriptionPlansService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateSubscriptionPlanDto) {
    const slug = await this.generateUniqueSlug(createDto.name);

    const plan = await this.prisma.subscriptionPlan.create({
      data: {
        ...createDto,
        slug,
      },
    });

    return {
      success: true,
      statusCode: 201,
      message: 'Subscription plan created successfully',
      data: plan,
      meta: null,
    };
  }

  async findAll(query: any = {}) {
    const page = query.page ? parseInt(query.page) : 1;
    const limit = query.limit ? parseInt(query.limit) : 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.isPublic !== undefined) {
      where.isPublic = query.isPublic === 'true' || query.isPublic === true;
    }
    if (query.isActive !== undefined) {
      where.isActive = query.isActive === 'true' || query.isActive === true;
    }

    const [items, total] = await Promise.all([
      this.prisma.subscriptionPlan.findMany({
        where,
        orderBy: { sortOrder: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.subscriptionPlan.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      statusCode: 200,
      message: 'Subscription plans retrieved successfully',
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
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id },
    });
    if (!plan) {
      throw new NotFoundException(`Subscription plan with ID ${id} not found`);
    }
    return {
      success: true,
      statusCode: 200,
      message: 'Subscription plan retrieved successfully',
      data: plan,
      meta: null,
    };
  }

  async update(id: string, updateDto: UpdateSubscriptionPlanDto) {
    await this.findOne(id); // Ensure it exists

    let slug;
    if (updateDto.name) {
      slug = await this.generateUniqueSlug(updateDto.name, id);
    }

    const updated = await this.prisma.subscriptionPlan.update({
      where: { id },
      data: {
        ...updateDto,
        ...(slug ? { slug } : {}),
      },
    });

    return {
      success: true,
      statusCode: 200,
      message: 'Subscription plan updated successfully',
      data: updated,
      meta: null,
    };
  }

  async remove(id: string) {
    await this.findOne(id);
    await softDelete(this.prisma.raw.subscriptionPlan, id);
    return {
      success: true,
      statusCode: 200,
      message: 'Subscription plan deleted successfully',
      data: null,
      meta: null,
    };
  }

  async updateIsPublic(id: string, isPublic: boolean) {
    await this.findOne(id);
    const updated = await this.prisma.subscriptionPlan.update({
      where: { id },
      data: { isPublic },
    });

    return {
      success: true,
      statusCode: 200,
      message: 'Subscription plan visibility updated successfully',
      data: updated,
      meta: null,
    };
  }

  async updateIsActive(id: string, isActive: boolean) {
    await this.findOne(id);
    const updated = await this.prisma.subscriptionPlan.update({
      where: { id },
      data: { isActive },
    });

    return {
      success: true,
      statusCode: 200,
      message: 'Subscription plan status updated successfully',
      data: updated,
      meta: null,
    };
  }

  private async generateUniqueSlug(
    name: string,
    excludeId?: string,
  ): Promise<string> {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 45);

    let slug = base;
    let counter = 1;

    while (true) {
      const exists = await this.prisma.subscriptionPlan.findFirst({
        where: {
          slug,
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
      });
      if (!exists) return slug;
      slug = `${base}-${counter}`;
      counter++;
    }
  }
}
