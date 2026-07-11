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
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
} from './dto/inventory-item.dto';

@Injectable()
export class InventoryItemsService {
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

  private parseDate(value?: string | Date | null) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date value');
    }
    return date;
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

  private async buildTrend(
    model: any,
    where: any,
    dateField: string,
    query: any,
  ) {
    const range = this.getTrendRange(query);
    const existingDateFilter = where?.[dateField] || {};
    const rows = await model.findMany({
      where: {
        ...where,
        [dateField]: {
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
      select: { [dateField]: true },
    });
    const buckets = this.buildTrendBuckets(range.start, range.end, range.unit);
    const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));
    rows.forEach((row: any) => {
      const key = this.trendKey(new Date(row[dateField]), range.unit);
      const bucket = bucketMap.get(key);
      if (bucket) bucket.count += 1;
    });
    return buckets;
  }

  private async logAction(data: {
    action: string;
    entityType: string;
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
          entityType: data.entityType,
          entityId: data.entityId || null,
          summary: this.nullable(data.summary),
          beforeData: data.beforeData ?? undefined,
          afterData: data.afterData ?? undefined,
          createdBy: data.userId,
        },
      });
    } catch {
      // Actions must not fail because audit logging failed.
    }
  }

  private itemData(
    dto: CreateInventoryItemDto | UpdateInventoryItemDto,
    userId?: string,
  ) {
    return {
      ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.nameBn !== undefined
        ? { nameBn: this.nullable(dto.nameBn) }
        : {}),
      ...(dto.code !== undefined ? { code: this.nullable(dto.code) } : {}),
      ...(dto.brand !== undefined ? { brand: this.nullable(dto.brand) } : {}),
      ...(dto.model !== undefined ? { model: this.nullable(dto.model) } : {}),
      ...(dto.description !== undefined
        ? { description: this.nullable(dto.description) }
        : {}),
      ...(dto.trackingType !== undefined
        ? { trackingType: dto.trackingType as any }
        : {}),
      ...(dto.unit !== undefined ? { unit: dto.unit || 'piece' } : {}),
      ...(dto.material !== undefined
        ? { material: this.nullable(dto.material) }
        : {}),
      ...(dto.length !== undefined ? { length: dto.length } : {}),
      ...(dto.width !== undefined ? { width: dto.width } : {}),
      ...(dto.height !== undefined ? { height: dto.height } : {}),
      ...(dto.depth !== undefined ? { depth: dto.depth } : {}),
      ...(dto.dimensionUnit !== undefined
        ? { dimensionUnit: this.nullable(dto.dimensionUnit) }
        : {}),
      ...(dto.weight !== undefined ? { weight: dto.weight } : {}),
      ...(dto.weightUnit !== undefined
        ? { weightUnit: this.nullable(dto.weightUnit) }
        : {}),
      ...(dto.seatingCapacity !== undefined
        ? { seatingCapacity: dto.seatingCapacity }
        : {}),
      ...(dto.isSeatingItem !== undefined
        ? { isSeatingItem: dto.isSeatingItem }
        : {}),
      ...(dto.isDepreciable !== undefined
        ? { isDepreciable: dto.isDepreciable }
        : {}),
      ...(dto.depreciationRate !== undefined
        ? { depreciationRate: dto.depreciationRate }
        : {}),
      ...(dto.usefulLifeYears !== undefined
        ? { usefulLifeYears: dto.usefulLifeYears }
        : {}),
      ...(dto.minimumStock !== undefined
        ? { minimumStock: dto.minimumStock }
        : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      ...(userId ? { updatedBy: userId } : {}),
    };
  }

  private async findCategory(id: string) {
    const category = await this.prisma().inventoryCategory.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!category) throw new NotFoundException('Inventory category not found');
    return category;
  }

  async create(dto: CreateInventoryItemDto, userId?: string) {
    await this.findCategory(dto.categoryId);
    if (dto.code) {
      const existing = await this.prisma().inventoryItem.findFirst({
        where: { code: dto.code, deletedAt: null },
        select: { id: true },
      });
      if (existing)
        throw new ConflictException('Inventory item code already exists');
    }
    const item = await this.prisma().inventoryItem.create({
      data: { ...this.itemData(dto), createdBy: userId },
    });
    await this.logAction({
      action: 'CREATE',
      entityType: 'ITEM',
      entityId: item.id,
      summary: `Item "${item.name}" created`,
      afterData: item,
      userId,
    });
    return item;
  }

  async findAll(query: any = {}) {
    const prisma = this.prisma();
    const { page, limit, skip } = this.pagination(query);
    const where: any = { deletedAt: null };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        { brand: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.trackingType)
      where.trackingType = { in: String(query.trackingType).split(',') };
    if (query.isSeatingItem !== undefined)
      where.isSeatingItem = query.isSeatingItem === 'true';
    if (query.isActive !== undefined)
      where.isActive = query.isActive === 'true';

    const [items, total, summaryItems] = await Promise.all([
      prisma.inventoryItem.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          code: true,
          trackingType: true,
          unit: true,
          minimumStock: true,
          seatingCapacity: true,
          isSeatingItem: true,
          isActive: true,
          createdAt: true,
          category: { select: { id: true, name: true } },
          stockBatches: {
            where: { deletedAt: null },
            select: { quantityGood: true },
          },
          _count: {
            select: {
              assets: { where: { deletedAt: null } },
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      prisma.inventoryItem.count({ where }),
      prisma.inventoryItem.findMany({
        where,
        select: {
          isActive: true,
          minimumStock: true,
          stockBatches: {
            where: { deletedAt: null },
            select: { quantityGood: true },
          },
          _count: {
            select: {
              assets: { where: { deletedAt: null } },
            },
          },
        },
      }),
    ]);
    const rows = items.map(({ stockBatches, _count, ...item }: any) => ({
      ...item,
      currentStock: stockBatches.reduce(
        (total: number, batch: any) => total + batch.quantityGood,
        0,
      ),
      assetCount: _count.assets,
    }));
    const summaryRows = summaryItems.map(({ stockBatches, _count, ...item }: any) => ({
      ...item,
      currentStock: stockBatches.reduce(
        (total: number, batch: any) => total + batch.quantityGood,
        0,
      ),
      assetCount: _count.assets,
    }));
    const totalStock = summaryRows.reduce(
      (sum: number, item: any) => sum + item.currentStock,
      0,
    );
    const totalAssets = summaryRows.reduce(
      (sum: number, item: any) => sum + item.assetCount,
      0,
    );
    const lowStock = summaryRows.filter(
      (item: any) =>
        item.minimumStock > 0 && item.currentStock <= item.minimumStock,
    ).length;
    const active = summaryRows.filter((item: any) => item.isActive).length;
    const trend = await this.buildTrend(
      prisma.inventoryItem,
      where,
      'createdAt',
      query,
    );
    return this.paginatedResponse(
      'Inventory items retrieved successfully',
      rows,
      total,
      page,
      limit,
      {
        total,
        active,
        inactive: total - active,
        lowStock,
        totalStock,
        totalAssets,
        trend,
      },
    );
  }

  async getOptions() {
    const items = await this.prisma().inventoryItem.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, name: true, code: true, trackingType: true },
      orderBy: { name: 'asc' },
    });
    return {
      success: true,
      statusCode: 200,
      message: 'Item options retrieved successfully',
      data: items.map((item: any) => ({
        value: item.id,
        label: `${item.name}${item.code ? ` (${item.code})` : ''}`,
        trackingType: item.trackingType,
      })),
      meta: null,
    };
  }

  async findOne(id: string) {
    const item = await this.prisma().inventoryItem.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: true,
        _count: {
          select: { stockBatches: true, assets: true, movements: true },
        },
      },
    });
    if (!item) throw new NotFoundException('Inventory item not found');
    return item;
  }

  async update(id: string, dto: UpdateInventoryItemDto, userId?: string) {
    const current = await this.findOne(id);
    if (dto.categoryId) await this.findCategory(dto.categoryId);
    const item = await this.prisma().inventoryItem.update({
      where: { id },
      data: this.itemData(dto, userId),
    });
    await this.logAction({
      action: 'UPDATE',
      entityType: 'ITEM',
      entityId: item.id,
      summary: `Item "${item.name}" updated`,
      beforeData: current,
      afterData: item,
      userId,
    });
    return item;
  }

  async remove(id: string, userId?: string) {
    const item = await this.findOne(id);
    const used =
      item._count.stockBatches + item._count.assets + item._count.movements;
    if (used > 0)
      throw new BadRequestException('Inventory item is already in use');
    const deleted = await this.prisma().inventoryItem.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId },
    });
    await this.logAction({
      action: 'DELETE',
      entityType: 'ITEM',
      entityId: deleted.id,
      summary: `Item "${deleted.name}" deleted`,
      beforeData: item,
      afterData: deleted,
      userId,
    });
    return deleted;
  }
}
