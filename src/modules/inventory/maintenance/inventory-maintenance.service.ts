import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  PrismaService,
  TenantConnectionService,
} from 'src/cores/prisma.service';
import {
  CreateInventoryMaintenanceDto,
  UpdateInventoryMaintenanceDto,
} from './dto/inventory-maintenance.dto';

@Injectable()
export class InventoryMaintenanceService {
  constructor(
    private readonly tenantConnection: TenantConnectionService,
    private readonly prismaService: PrismaService,
  ) {}

  

  // ─── Prisma client helpers ─────────────────────────────────────────────────

  private prisma(): any {
    return this.tenantConnection.getTenantClient();
  }

  private nullable(value: any) {
    return value === undefined || value === '' ? null : value;
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

  private toNumber(value: any) {
    if (value === null || value === undefined) return 0;
    return Number(value);
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

  // ─── Trend helpers ─────────────────────────────────────────────────────────

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
        period,
        unit: 'day' as const,
        start: this.addDays(-6),
        end: this.endOfDay(today),
      };
    }
    if (period === 'yearly') {
      return {
        period,
        unit: 'month' as const,
        start: this.addMonths(today, -11),
        end: this.endOfDay(today),
      };
    }
    if (period === 'custom' && (query?.chartFrom || query?.chartTo)) {
      const customStart = this.parseDate(query.chartFrom);
      const customEnd = this.parseDate(query.chartTo);
      const start = query.chartFrom
        ? this.startOfDay(customStart as Date)
        : this.addDays(-29);
      const end = query.chartTo
        ? this.endOfDay(customEnd as Date)
        : this.endOfDay(today);
      const daySpan = Math.max(
        Math.ceil((end.getTime() - start.getTime()) / 86_400_000),
        1,
      );
      return {
        period,
        unit: daySpan > 62 ? ('month' as const) : ('day' as const),
        start,
        end,
      };
    }
    return {
      period: 'monthly',
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
    delegate: any,
    where: any,
    dateField: string,
    query: any,
  ) {
    const range = this.getTrendRange(query);
    const existingDateFilter = where?.[dateField] || {};
    const trendWhere = {
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
    };
    const rows = await delegate.findMany({
      where: trendWhere,
      select: { [dateField]: true },
    });
    const buckets = this.buildTrendBuckets(range.start, range.end, range.unit);
    const bucketMap = new Map(buckets.map((b) => [b.key, b]));
    rows.forEach((row: any) => {
      const rawDate = row?.[dateField];
      if (!rawDate) return;
      const key = this.trendKey(new Date(rawDate), range.unit);
      const bucket = bucketMap.get(key);
      if (bucket) bucket.count += 1;
    });
    return buckets;
  }

  
  // 📝 Audit logging 📝
  private async logAction(data: {
    action: string;
    entityType: string;
    entityId: string;
    summary: string;
    beforeData?: any;
    afterData?: any;
    userId?: string;
  }) {
    try {
      await this.prisma().inventoryAuditLog.create({
        data: {
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
          summary: data.summary,
          beforeData: data.beforeData ? JSON.stringify(data.beforeData) : null,
          afterData: data.afterData ? JSON.stringify(data.afterData) : null,
          userId: data.userId,
        },
      });
    } catch (e) {
      // Audit failures must not break the main action.
    }
  }

  async createMaintenance(dto: CreateInventoryMaintenanceDto, userId?: string) {
    const item = await this.prisma().inventoryItem.findFirst({
      where: { id: dto.itemId, deletedAt: null },
    });
    if (!item) throw new NotFoundException('Inventory item not found');

    const maintenance = await this.prisma().inventoryMaintenance.create({
      data: {
        itemId: dto.itemId,
        assetId: this.nullable(dto.assetId),
        stockBatchId: this.nullable(dto.stockBatchId),
        locationId: this.nullable(dto.locationId),
        issueTitle: dto.issueTitle,
        issueDescription: this.nullable(dto.issueDescription),
        status: dto.status || 'OPEN',
        priority: dto.priority || 'MEDIUM',
        serviceProvider: this.nullable(dto.serviceProvider),
        cost: dto.cost,
        notes: this.nullable(dto.notes),
        createdBy: userId,
      },
    });

    await this.logAction({
      action: 'CREATE',
      entityType: 'MAINTENANCE',
      entityId: maintenance.id,
      summary: `Maintenance "${maintenance.issueTitle}" created`,
      afterData: maintenance,
      userId,
    });

    return maintenance;
  }

  async findMaintenances(query: any = {}) {
    const prisma = this.prisma();
    const { page, limit, skip } = this.pagination(query);

    const where: any = {
      deletedAt: null,
      ...this.buildDateFilter(query, 'reportedAt'),
    };

    if (query.search) {
      where.OR = [
        { issueTitle: { contains: query.search, mode: 'insensitive' } },
        { issueDescription: { contains: query.search, mode: 'insensitive' } },
        { serviceProvider: { contains: query.search, mode: 'insensitive' } },
        { notes: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    
    if (query.status) where.status = { in: String(query.status).split(',') };
    if (query.priority)
      where.priority = { in: String(query.priority).split(',') };
    if (query.itemId) where.itemId = query.itemId;

    const [items, total, byStatus, byPriority, costTotals] = await Promise.all([
      prisma.inventoryMaintenance.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          issueTitle: true,
          status: true,
          priority: true,
          cost: true,
          reportedAt: true,
          resolvedAt: true,
          item: { select: { id: true, name: true, code: true } },
          location: { select: { id: true, name: true } },
        },
        orderBy: [{ reportedAt: 'desc' }, { id: 'desc' }],
      }),
      prisma.inventoryMaintenance.count({ where }),
      prisma.inventoryMaintenance.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
      }),
      prisma.inventoryMaintenance.groupBy({
        by: ['priority'],
        where,
        _count: { _all: true },
      }),
      prisma.inventoryMaintenance.aggregate({
        where,
        _sum: { cost: true },
      }),
    ]);

    const statusSummary = Object.fromEntries(
      (byStatus as any[]).map((item: any) => [item.status, item._count._all]),
    );
    const prioritySummary = Object.fromEntries(
      (byPriority as any[]).map((item: any) => [item.priority, item._count._all]),
    );

    const trend = await this.buildTrend(
      prisma.inventoryMaintenance,
      where,
      'reportedAt',
      query,
    );

    return this.paginatedResponse(
      'Inventory maintenances retrieved successfully',
      items,
      total,
      page,
      limit,
      {
        total,
        open: statusSummary.OPEN || 0,
        inProgress: statusSummary.IN_PROGRESS || 0,
        resolved: statusSummary.RESOLVED || 0,
        highPriority: prioritySummary.HIGH || 0,
        totalCost: this.toNumber(costTotals._sum.cost),
        trend,
      },
    );
  }

  async findMaintenance(id: string) {
    const maintenance = await this.prisma().inventoryMaintenance.findFirst({
      where: { id, deletedAt: null },
      include: { item: true, asset: true, stockBatch: true, location: true },
    });
    if (!maintenance)
      throw new NotFoundException('Inventory maintenance not found');
    return maintenance;
  }

  async updateMaintenance(
    id: string,
    dto: UpdateInventoryMaintenanceDto,
    userId?: string,
  ) {
    const current = await this.findMaintenance(id);
    const maintenance = await this.prisma().inventoryMaintenance.update({
      where: { id },
      data: {
        ...(dto.itemId !== undefined ? { itemId: dto.itemId } : {}),
        ...(dto.assetId !== undefined
          ? { assetId: this.nullable(dto.assetId) }
          : {}),
        ...(dto.stockBatchId !== undefined
          ? { stockBatchId: this.nullable(dto.stockBatchId) }
          : {}),
        ...(dto.locationId !== undefined
          ? { locationId: this.nullable(dto.locationId) }
          : {}),
        ...(dto.issueTitle !== undefined ? { issueTitle: dto.issueTitle } : {}),
        ...(dto.issueDescription !== undefined
          ? { issueDescription: this.nullable(dto.issueDescription) }
          : {}),
        ...(dto.status !== undefined
          ? {
              status: dto.status,
              resolvedAt: dto.status === 'RESOLVED' ? new Date() : null,
            }
          : {}),
        ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
        ...(dto.serviceProvider !== undefined
          ? { serviceProvider: this.nullable(dto.serviceProvider) }
          : {}),
        ...(dto.cost !== undefined ? { cost: dto.cost } : {}),
        ...(dto.notes !== undefined ? { notes: this.nullable(dto.notes) } : {}),
        updatedBy: userId,
      },
    });

    await this.logAction({
      action: 'UPDATE',
      entityType: 'MAINTENANCE',
      entityId: maintenance.id,
      summary: `Maintenance "${maintenance.issueTitle}" updated`,
      beforeData: current,
      afterData: maintenance,
      userId,
    });

    return maintenance;
  }

  async deleteMaintenance(id: string, userId?: string) {
    const current = await this.findMaintenance(id);
    const deleted = await this.prisma().inventoryMaintenance.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId },
    });

    await this.logAction({
      action: 'DELETE',
      entityType: 'MAINTENANCE',
      entityId: deleted.id,
      summary: `Maintenance "${deleted.issueTitle}" deleted`,
      beforeData: current,
      afterData: deleted,
      userId,
    });

    return deleted;
  }
}
