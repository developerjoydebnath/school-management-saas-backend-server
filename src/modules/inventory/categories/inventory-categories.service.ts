import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PrismaService,
  TenantConnectionService,
} from 'src/cores/prisma.service';
import {
  CreateInventoryCategoryDto,
  UpdateInventoryCategoryDto,
} from './dto/inventory-category.dto';

@Injectable()
export class InventoryCategoriesService {
  constructor(
    private readonly tenantConnection: TenantConnectionService,
    private readonly prismaService: PrismaService,
  ) {}

  private prisma(): any {
    return this.tenantConnection.getTenantClient();
  }

  private pagination(query: any) {
    const page = Math.max(Number(query?.page) || 1, 1);
    const limit = Math.max(Number(query?.limit) || 10, 1);
    return { page, limit, skip: (page - 1) * limit };
  }

  private paginatedResponse(
    message: string,
    items: any[],
    total: number,
    page: number,
    limit: number,
    summary?: Record<string, any>,
  ) {
    const totalPages = Math.ceil(total / limit);
    return {
      success: true,
      statusCode: 200,
      message,
      data: {
        items,
        meta: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
          ...(summary ? { summary } : {}),
        },
      },
      meta: null,
    };
  }

  private nullable(value: any) {
    return value === undefined || value === '' ? null : value;
  }

  private slugify(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  private parseDate(value?: string | Date | null) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date value');
    }
    return date;
  }

  private buildDateFilter(query: any, field = 'createdAt') {
    if (!query?.dateFrom && !query?.dateTo) return {};
    return {
      [field]: {
        ...(query.dateFrom ? { gte: this.parseDate(query.dateFrom) } : {}),
        ...(query.dateTo ? { lte: this.parseDate(query.dateTo) } : {}),
      },
    };
  }

  private startOfDay(date: Date) {
    const next = new Date(date);
    next.setHours(0, 0, 0, 0);
    return next;
  }

  private endOfDay(date: Date) {
    const next = new Date(date);
    next.setHours(23, 59, 59, 999);
    return next;
  }

  private addDays(days: number) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }

  private addMonths(date: Date, months: number) {
    const next = new Date(date);
    next.setMonth(next.getMonth() + months);
    return next;
  }

  private formatTrendLabel(date: Date, unit: 'day' | 'month') {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      ...(unit === 'day' ? { day: 'numeric' } : { year: '2-digit' }),
    });
  }

  private getTrendRange(query: any) {
    const period = query?.chartPeriod || 'monthly';
    const today = this.startOfDay(new Date());
    if (period === 'weekly') {
      return {
        unit: 'day' as const,
        start: this.addDays(-6),
        end: this.endOfDay(today),
      };
    }
    if (period === 'yearly') {
      return {
        unit: 'month' as const,
        start: this.addMonths(today, -11),
        end: this.endOfDay(today),
      };
    }
    if (period === 'custom' && (query?.chartFrom || query?.chartTo)) {
      const start = query.chartFrom
        ? this.startOfDay(this.parseDate(query.chartFrom) as Date)
        : this.addDays(-29);
      const end = query.chartTo
        ? this.endOfDay(this.parseDate(query.chartTo) as Date)
        : this.endOfDay(today);
      const daySpan = Math.max(
        Math.ceil((end.getTime() - start.getTime()) / 86_400_000),
        1,
      );
      return {
        unit: daySpan > 62 ? ('month' as const) : ('day' as const),
        start,
        end,
      };
    }
    return {
      unit: 'day' as const,
      start: this.addDays(-29),
      end: this.endOfDay(today),
    };
  }

  private buildTrendBuckets(start: Date, end: Date, unit: 'day' | 'month') {
    const buckets: { key: string; label: string; count: number }[] = [];
    const cursor = this.startOfDay(start);
    if (unit === 'month') cursor.setDate(1);
    while (cursor <= end) {
      const key =
        unit === 'month'
          ? `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`
          : cursor.toISOString().slice(0, 10);
      buckets.push({ key, label: this.formatTrendLabel(cursor, unit), count: 0 });
      if (unit === 'month') cursor.setMonth(cursor.getMonth() + 1);
      else cursor.setDate(cursor.getDate() + 1);
    }
    return buckets;
  }

  private trendKey(date: Date, unit: 'day' | 'month') {
    return unit === 'month'
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      : date.toISOString().slice(0, 10);
  }

  private async buildTrend(where: any, query: any) {
    const range = this.getTrendRange(query);
    const existingDateFilter = where?.createdAt || {};
    const rows = await this.prisma().inventoryCategory.findMany({
      where: {
        ...where,
        createdAt: {
          ...existingDateFilter,
          gte:
            existingDateFilter.gte && existingDateFilter.gte > range.start
              ? existingDateFilter.gte
              : range.start,
          lte:
            existingDateFilter.lte && existingDateFilter.lte < range.end
              ? existingDateFilter.lte
              : range.end,
        },
      },
      select: { createdAt: true },
    });
    const buckets = this.buildTrendBuckets(range.start, range.end, range.unit);
    const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));
    rows.forEach((row: any) => {
      const key = this.trendKey(new Date(row.createdAt), range.unit);
      const bucket = bucketMap.get(key);
      if (bucket) bucket.count += 1;
    });
    return buckets;
  }

  private async logAction(data: {
    action: string;
    entityId?: string | null;
    summary?: string;
    beforeData?: any;
    afterData?: any;
    userId?: string;
  }) {
    try {
      await this.prisma().inventoryAuditLog.create({
        data: {
          action: data.action,
          entityType: 'CATEGORY',
          entityId: data.entityId || null,
          summary: this.nullable(data.summary),
          beforeData: data.beforeData ?? undefined,
          afterData: data.afterData ?? undefined,
          createdBy: data.userId,
        },
      });
    } catch {
      // Category actions must not fail because audit logging failed.
    }
  }

  async create(dto: CreateInventoryCategoryDto, userId?: string) {
    const prisma = this.prisma();
    const slug = dto.slug ? this.slugify(dto.slug) : this.slugify(dto.name);
    const existing = await prisma.inventoryCategory.findFirst({
      where: { slug, deletedAt: null },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Inventory category already exists');
    }

    const category = await prisma.inventoryCategory.create({
      data: {
        name: dto.name,
        nameBn: this.nullable(dto.nameBn),
        slug,
        description: this.nullable(dto.description),
        iconName: this.nullable(dto.iconName),
        colorCode: this.nullable(dto.colorCode),
        isActive: dto.isActive ?? true,
        createdBy: userId,
      },
    });
    await this.logAction({
      action: 'CREATE',
      entityId: category.id,
      summary: `Category "${category.name}" created`,
      afterData: category,
      userId,
    });
    return category;
  }

  async findAll(query: any = {}) {
    const prisma = this.prisma();
    const { page, limit, skip } = this.pagination(query);
    const where: any = {
      deletedAt: null,
      ...this.buildDateFilter(query, 'createdAt'),
    };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { nameBn: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.isActive !== undefined) {
      where.isActive = query.isActive === 'true';
    }
    if (query.isSystem !== undefined) {
      where.isSystem = query.isSystem === 'true';
    }

    const [items, total, active, system] = await Promise.all([
      prisma.inventoryCategory.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          nameBn: true,
          slug: true,
          iconName: true,
          colorCode: true,
          isSystem: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }, { id: 'desc' }],
      }),
      prisma.inventoryCategory.count({ where }),
      prisma.inventoryCategory.count({ where: { ...where, isActive: true } }),
      prisma.inventoryCategory.count({ where: { ...where, isSystem: true } }),
    ]);
    const trend = await this.buildTrend(where, query);
    return this.paginatedResponse(
      'Inventory categories retrieved successfully',
      items,
      total,
      page,
      limit,
      {
        total,
        active,
        inactive: total - active,
        system,
        custom: total - system,
        trend,
      },
    );
  }

  async getOptions() {
    const categories = await this.prisma().inventoryCategory.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, name: true, nameBn: true },
      orderBy: { name: 'asc' },
    });
    return {
      success: true,
      statusCode: 200,
      message: 'Category options retrieved successfully',
      data: categories.map((cat: any) => ({
        value: cat.id,
        label: cat.name,
      })),
      meta: null,
    };
  }

  async findOne(id: string) {
    const category = await this.prisma().inventoryCategory.findFirst({
      where: { id, deletedAt: null },
      include: { _count: { select: { items: true } } },
    });
    if (!category) throw new NotFoundException('Inventory category not found');
    return category;
  }

  async update(
    id: string,
    dto: UpdateInventoryCategoryDto,
    userId?: string,
  ) {
    const current = await this.findOne(id);
    const data: any = {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.nameBn !== undefined
        ? { nameBn: this.nullable(dto.nameBn) }
        : {}),
      ...(dto.slug !== undefined ? { slug: this.slugify(dto.slug) } : {}),
      ...(dto.description !== undefined
        ? { description: this.nullable(dto.description) }
        : {}),
      ...(dto.iconName !== undefined
        ? { iconName: this.nullable(dto.iconName) }
        : {}),
      ...(dto.colorCode !== undefined
        ? { colorCode: this.nullable(dto.colorCode) }
        : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      updatedBy: userId,
    };
    const category = await this.prisma().inventoryCategory.update({
      where: { id },
      data,
    });
    await this.logAction({
      action: 'UPDATE',
      entityId: category.id,
      summary: `Category "${category.name}" updated`,
      beforeData: current,
      afterData: category,
      userId,
    });
    return category;
  }

  async remove(id: string, userId?: string) {
    const category = await this.findOne(id);
    if (category.isSystem) {
      throw new BadRequestException('System categories cannot be deleted');
    }
    if (category._count.items > 0) {
      throw new BadRequestException('Category has inventory items');
    }
    const deleted = await this.prisma().inventoryCategory.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId },
    });
    await this.logAction({
      action: 'DELETE',
      entityId: deleted.id,
      summary: `Category "${deleted.name}" deleted`,
      beforeData: category,
      afterData: deleted,
      userId,
    });
    return deleted;
  }
}
