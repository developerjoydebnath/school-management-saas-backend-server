import { Injectable, BadRequestException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService, TenantConnectionService } from 'src/cores/prisma.service';

@Injectable()
export class InventoryAuditLogsService {
  constructor(
    protected readonly tenantConnection: TenantConnectionService,
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

  private slugify(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  private nullable(value: any) {
    return value === undefined || value === '' ? null : value;
  }

  private getUserDisplayName(user: any) {
    const profileName =
      `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim();
    return profileName || user.email || user.phone || user.id;
  }

  private getAssignableSchemaNames(role?: Role, schemaName?: string) {
    const activeSchema = schemaName || this.tenantConnection.getTenantSchema();
    const schemaNames =
      role === Role.SUPER_ADMIN || role === Role.DEVELOPER
        ? [activeSchema, 'public']
        : [activeSchema];
    return [...new Set(schemaNames.filter(Boolean))];
  }

  private async findAssignableUser(
    userId: string,
    role?: Role,
    schemaName?: string,
  ) {
    return this.prismaService.client.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
        isActive: true,
        schemaName: { in: this.getAssignableSchemaNames(role, schemaName) },
      },
      select: {
        id: true,
        email: true,
        phone: true,
        schemaName: true,
        profile: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async findAssignableUsers(userContext?: { role?: Role; schema?: string }) {
    const users = await this.prismaService.client.user.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        schemaName: {
          in: this.getAssignableSchemaNames(
            userContext?.role,
            userContext?.schema,
          ),
        },
      },
      select: {
        id: true,
        email: true,
        phone: true,
        schemaName: true,
        role: true,
        profile: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    return {
      success: true,
      statusCode: 200,
      message: 'Assignable users retrieved successfully',
      data: users.map((user) => ({
        ...user,
        displayName: this.getUserDisplayName(user),
      })),
      meta: null,
    };
  }

  private normalizeStatus(status?: string) {
    return status?.toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
  }

  private parseDate(value?: string | Date | null) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date value');
    }
    return date;
  }

  private calculateWarrantyExpires(
    purchaseDate?: string | Date | null,
    warrantyPeriod?: number | null,
    warrantyPeriodUnit?: string | null,
  ) {
    const date = this.parseDate(purchaseDate);
    if (!date || !warrantyPeriod || !warrantyPeriodUnit) return null;

    const unit = warrantyPeriodUnit.toLowerCase();
    const expires = new Date(date);
    if (unit === 'day' || unit === 'days') {
      expires.setDate(expires.getDate() + warrantyPeriod);
    } else if (unit === 'month' || unit === 'months') {
      expires.setMonth(expires.getMonth() + warrantyPeriod);
    } else if (unit === 'year' || unit === 'years') {
      expires.setFullYear(expires.getFullYear() + warrantyPeriod);
    } else {
      throw new BadRequestException(
        'Warranty period unit must be day, month, or year',
      );
    }
    return expires;
  }

  private validateQuantities(dto: {
    quantityTotal?: number;
    quantityGood?: number;
    quantityDamaged?: number;
    quantityDisposed?: number;
  }) {
    const total = dto.quantityTotal ?? 0;
    const good = dto.quantityGood ?? total;
    const damaged = dto.quantityDamaged ?? 0;
    const disposed = dto.quantityDisposed ?? 0;
    if (good + damaged + disposed > total) {
      throw new BadRequestException(
        'Good, damaged, and disposed quantities cannot exceed total quantity',
      );
    }
    return { total, good, damaged, disposed };
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

  private addDays(days: number) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }

  private toNumber(value: any) {
    if (value === null || value === undefined) return 0;
    return Number(value);
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
    const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));
    rows.forEach((row: any) => {
      const rawDate = row?.[dateField];
      if (!rawDate) return;
      const key = this.trendKey(new Date(rawDate), range.unit);
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
      // Inventory actions must not fail because audit logging failed.
    }
  }

  
  async attachChangedByNames(items: any[]) {
    const userIds = [...new Set(items.map((item) => item.createdBy).filter(Boolean))];
    if (userIds.length === 0) return items.map((item) => ({ ...item, changedByName: null }));

    const users = await this.prismaService.client.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, phone: true, profile: { select: { firstName: true, lastName: true } } },
    });

    const userMap = new Map(users.map((u) => [u.id, u.profile ? `${u.profile.firstName} ${u.profile.lastName}` : u.email || u.phone || 'Unknown']));
    return items.map((item) => ({ ...item, changedByName: item.createdBy ? userMap.get(item.createdBy) : null }));
  }

  async findOne(id: string) {
    const log = await this.prisma().inventoryAuditLog.findUnique({ where: { id } });
    if (!log) throw new Error('Audit log not found');
    const withName = await this.attachChangedByNames([log]);
    return { success: true, message: 'Audit log retrieved successfully', data: withName[0] };
  }

  async findAuditLogs(query: any = {}) {
    const prisma = this.prisma();
    const { page, limit, skip } = this.pagination(query);
    const where: any = { ...this.buildDateFilter(query, 'createdAt') };
    if (query.action) where.action = { in: String(query.action).split(',') };
    if (query.entityType) where.entityType = { in: String(query.entityType).split(',') };
    if (query.search) { where.OR = [{ summary: { contains: query.search, mode: 'insensitive' } }, { action: { contains: query.search, mode: 'insensitive' } }, { entityType: { contains: query.search, mode: 'insensitive' } }]; }
    
    const [items, total, byAction] = await Promise.all([
      prisma.inventoryAuditLog.findMany({
        where, skip, take: limit,
        select: { id: true, action: true, entityType: true, entityId: true, summary: true, createdBy: true, createdAt: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      prisma.inventoryAuditLog.count({ where }),
      prisma.inventoryAuditLog.groupBy({ by: ['action'], where, _count: { _all: true } }),
    ]);
    
    const actionSummary = Object.fromEntries((byAction).map((item: any) => [item.action, item._count._all]));
    const trend = await this.buildTrend(prisma.inventoryAuditLog, where, 'createdAt', query);
    
    return this.paginatedResponse(
      'Inventory audit logs retrieved successfully',
      await this.attachChangedByNames(items),
      total, page, limit,
      { total, created: actionSummary.CREATE || 0, updated: actionSummary.UPDATE || 0, deleted: actionSummary.DELETE || 0, other: Math.max(total - (actionSummary.CREATE || 0) - (actionSummary.UPDATE || 0) - (actionSummary.DELETE || 0), 0), trend }
    );
  }
}
