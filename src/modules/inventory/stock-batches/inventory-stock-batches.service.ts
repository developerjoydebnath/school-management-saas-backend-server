import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService, TenantConnectionService } from 'src/cores/prisma.service';
import { CreateInventoryStockBatchDto, UpdateInventoryStockBatchDto } from './dto/inventory-stock-batch.dto';

@Injectable()
export class InventoryStockBatchesService {
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
      return { unit: 'day' as const, start: this.addDays(-6), end: this.endOfDay(today) };
    }
    if (period === 'yearly') {
      return { unit: 'month' as const, start: this.addMonths(today, -11), end: this.endOfDay(today) };
    }
    if (period === 'custom' && (query?.chartFrom || query?.chartTo)) {
      const start = query.chartFrom ? this.startOfDay(this.parseDate(query.chartFrom) as Date) : this.addDays(-29);
      const end = query.chartTo ? this.endOfDay(this.parseDate(query.chartTo) as Date) : this.endOfDay(today);
      const daySpan = Math.max(Math.ceil((end.getTime() - start.getTime()) / 86_400_000), 1);
      return { unit: daySpan > 62 ? ('month' as const) : ('day' as const), start, end };
    }
    return { unit: 'day' as const, start: this.addDays(-29), end: this.endOfDay(today) };
  }

  private buildTrendBuckets(start: Date, end: Date, unit: 'day' | 'month') {
    const buckets: { key: string; label: string; count: number }[] = [];
    const cursor = this.startOfDay(start);
    if (unit === 'month') cursor.setDate(1);
    while (cursor <= end) {
      const key = unit === 'month'
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
    const rows = await this.prisma().inventoryStockBatch.findMany({
      where: {
        ...where,
        createdAt: {
          ...existingDateFilter,
          gte: existingDateFilter.gte && existingDateFilter.gte > range.start ? existingDateFilter.gte : range.start,
          lte: existingDateFilter.lte && existingDateFilter.lte < range.end ? existingDateFilter.lte : range.end,
        },
      },
      select: { createdAt: true },
    });
    const buckets = this.buildTrendBuckets(range.start, range.end, range.unit);
    const bucketMap = new Map(buckets.map((b) => [b.key, b]));
    rows.forEach((row: any) => {
      const key = this.trendKey(new Date(row.createdAt), range.unit);
      const bucket = bucketMap.get(key);
      if (bucket) bucket.count += 1;
    });
    return buckets;
  }

  private toNumber(value: any) {
    return Number(value ?? 0);
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
      throw new BadRequestException('Good + Damaged + Disposed cannot exceed Total');
    }
    return { total, good, damaged, disposed };
  }

  private calculateWarrantyExpires(
    purchaseDate: Date | null,
    warrantyPeriod?: number,
    warrantyPeriodUnit?: string | null,
  ) {
    if (!purchaseDate || !warrantyPeriod || !warrantyPeriodUnit) return null;
    const expiry = new Date(purchaseDate);
    if (warrantyPeriodUnit === 'YEAR') expiry.setFullYear(expiry.getFullYear() + warrantyPeriod);
    else if (warrantyPeriodUnit === 'MONTH') expiry.setMonth(expiry.getMonth() + warrantyPeriod);
    else if (warrantyPeriodUnit === 'DAY') expiry.setDate(expiry.getDate() + warrantyPeriod);
    return expiry;
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
          entityType: 'STOCK_BATCH',
          entityId: data.entityId || null,
          summary: this.nullable(data.summary),
          beforeData: data.beforeData ?? undefined,
          afterData: data.afterData ?? undefined,
          createdBy: data.userId,
        },
      });
    } catch {
      // Audit logging failure must not break main action.
    }
  }

  private async findItem(id: string) {
    const item = await this.prisma().inventoryItem.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
    if (!item) throw new NotFoundException('Inventory item not found');
    return item;
  }

  private async findLocation(id: string) {
    const location = await this.prisma().inventoryLocation.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
    if (!location) throw new NotFoundException('Inventory location not found');
    return location;
  }

  async create(dto: CreateInventoryStockBatchDto, userId?: string) {
    const quantities = this.validateQuantities(dto);
    await Promise.all([this.findItem(dto.itemId), this.findLocation(dto.locationId)]);
    const purchaseDate = this.parseDate(dto.purchaseDate);
    const batch = await this.prisma().inventoryStockBatch.create({
      data: {
        itemId: dto.itemId,
        locationId: dto.locationId,
        quantityTotal: quantities.total,
        quantityGood: quantities.good,
        quantityDamaged: quantities.damaged,
        quantityDisposed: quantities.disposed,
        purchaseDate,
        purchasePrice: dto.purchasePrice,
        totalCost: dto.purchasePrice !== undefined ? dto.purchasePrice * quantities.total : undefined,
        supplier: this.nullable(dto.supplier),
        invoiceNo: this.nullable(dto.invoiceNo),
        hasWarranty: dto.hasWarranty ?? false,
        warrantyPeriod: dto.warrantyPeriod,
        warrantyPeriodUnit: this.nullable(dto.warrantyPeriodUnit),
        warrantyExpires: this.calculateWarrantyExpires(purchaseDate, dto.warrantyPeriod, dto.warrantyPeriodUnit),
        warrantyNotes: this.nullable(dto.warrantyNotes),
        invoiceImageUrl: this.nullable(dto.invoiceImageUrl),
        invoicePlaceholder: this.nullable(dto.invoicePlaceholder),
        notes: this.nullable(dto.notes),
        createdBy: userId,
      },
    });
    await this.logAction({
      action: 'PURCHASE',
      entityId: batch.id,
      summary: `Stock batch created with ${batch.quantityTotal} item(s)`,
      afterData: batch,
      userId,
    });
    return batch;
  }

  async findAll(query: any = {}) {
    const prisma = this.prisma();
    const { page, limit, skip } = this.pagination(query);
    const where: any = {
      deletedAt: null,
      ...this.buildDateFilter(query, 'createdAt'),
    };
    if (query.itemId) where.itemId = query.itemId;
    if (query.locationId) where.locationId = query.locationId;
    if (query.search) {
      where.OR = [
        { supplier: { contains: query.search, mode: 'insensitive' } },
        { invoiceNo: { contains: query.search, mode: 'insensitive' } },
        { item: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }
    const [items, total, stockTotals] = await Promise.all([
      prisma.inventoryStockBatch.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          quantityTotal: true,
          quantityGood: true,
          quantityDamaged: true,
          quantityDisposed: true,
          purchaseDate: true,
          purchasePrice: true,
          totalCost: true,
          supplier: true,
          invoiceNo: true,
          warrantyExpires: true,
          hasWarranty: true,
          createdAt: true,
          item: { select: { id: true, name: true, code: true, unit: true } },
          location: { select: { id: true, name: true, locationType: true } },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      prisma.inventoryStockBatch.count({ where }),
      prisma.inventoryStockBatch.aggregate({
        where,
        _sum: {
          quantityTotal: true,
          quantityGood: true,
          quantityDamaged: true,
          quantityDisposed: true,
          totalCost: true,
        },
      }),
    ]);
    const trend = await this.buildTrend(where, query);
    return this.paginatedResponse(
      'Inventory stock batches retrieved successfully',
      items,
      total,
      page,
      limit,
      {
        total,
        totalQuantity: this.toNumber(stockTotals._sum.quantityTotal),
        goodQuantity: this.toNumber(stockTotals._sum.quantityGood),
        damagedQuantity: this.toNumber(stockTotals._sum.quantityDamaged),
        disposedQuantity: this.toNumber(stockTotals._sum.quantityDisposed),
        totalValue: this.toNumber(stockTotals._sum.totalCost),
        trend,
      },
    );
  }

  async findOne(id: string) {
    const batch = await this.prisma().inventoryStockBatch.findFirst({
      where: { id, deletedAt: null },
      include: {
        item: { include: { category: true } },
        location: true,
        movements: true,
      },
    });
    if (!batch) throw new NotFoundException('Inventory stock batch not found');
    return batch;
  }

  async getOptions() {
    const batches = await this.prisma().inventoryStockBatch.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        invoiceNo: true,
        quantityGood: true,
        item: { select: { name: true, code: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 500,
    });

    return {
      success: true,
      statusCode: 200,
      message: 'Stock batch options retrieved successfully',
      data: batches.map((batch: any) => ({
        value: batch.id,
        label: [
          batch.item?.name || 'Stock batch',
          batch.item?.code ? `(${batch.item.code})` : '',
          batch.invoiceNo ? `- ${batch.invoiceNo}` : '',
          `- ${batch.quantityGood ?? 0} available`,
        ]
          .filter(Boolean)
          .join(' '),
        quantityGood: batch.quantityGood,
      })),
      meta: null,
    };
  }

  async update(id: string, dto: UpdateInventoryStockBatchDto, userId?: string) {
    const current = await this.findOne(id);
    const quantities = this.validateQuantities({
      quantityTotal: dto.quantityTotal ?? current.quantityTotal,
      quantityGood: dto.quantityGood ?? current.quantityGood,
      quantityDamaged: dto.quantityDamaged ?? current.quantityDamaged,
      quantityDisposed: dto.quantityDisposed ?? current.quantityDisposed,
    });
    const purchaseDate = dto.purchaseDate !== undefined ? this.parseDate(dto.purchaseDate) : current.purchaseDate;
    const updated = await this.prisma().inventoryStockBatch.update({
      where: { id },
      data: {
        ...(dto.itemId !== undefined ? { itemId: dto.itemId } : {}),
        ...(dto.locationId !== undefined ? { locationId: dto.locationId } : {}),
        quantityTotal: quantities.total,
        quantityGood: quantities.good,
        quantityDamaged: quantities.damaged,
        quantityDisposed: quantities.disposed,
        ...(dto.purchaseDate !== undefined ? { purchaseDate } : {}),
        ...(dto.purchasePrice !== undefined ? { purchasePrice: dto.purchasePrice, totalCost: dto.purchasePrice * quantities.total } : {}),
        ...(dto.supplier !== undefined ? { supplier: this.nullable(dto.supplier) } : {}),
        ...(dto.invoiceNo !== undefined ? { invoiceNo: this.nullable(dto.invoiceNo) } : {}),
        ...(dto.hasWarranty !== undefined ? { hasWarranty: dto.hasWarranty } : {}),
        ...(dto.warrantyPeriod !== undefined ? { warrantyPeriod: dto.warrantyPeriod } : {}),
        ...(dto.warrantyPeriodUnit !== undefined ? { warrantyPeriodUnit: this.nullable(dto.warrantyPeriodUnit) } : {}),
        warrantyExpires: this.calculateWarrantyExpires(
          purchaseDate,
          dto.warrantyPeriod ?? current.warrantyPeriod,
          dto.warrantyPeriodUnit ?? current.warrantyPeriodUnit,
        ),
        ...(dto.warrantyNotes !== undefined ? { warrantyNotes: this.nullable(dto.warrantyNotes) } : {}),
        ...(dto.invoiceImageUrl !== undefined ? { invoiceImageUrl: this.nullable(dto.invoiceImageUrl) } : {}),
        ...(dto.invoicePlaceholder !== undefined ? { invoicePlaceholder: this.nullable(dto.invoicePlaceholder) } : {}),
        ...(dto.notes !== undefined ? { notes: this.nullable(dto.notes) } : {}),
        updatedBy: userId,
      },
    });
    await this.logAction({
      action: 'UPDATE',
      entityId: updated.id,
      summary: `Stock batch updated`,
      beforeData: current,
      afterData: updated,
      userId,
    });
    return updated;
  }

  async remove(id: string, userId?: string) {
    const current = await this.findOne(id);
    const deleted = await this.prisma().inventoryStockBatch.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId },
    });
    await this.logAction({
      action: 'DELETE',
      entityId: deleted.id,
      summary: `Stock batch deleted`,
      beforeData: current,
      afterData: deleted,
      userId,
    });
    return deleted;
  }
}
