import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PrismaService,
  TenantConnectionService,
} from 'src/cores/prisma.service';
import { CreateInventoryMovementDto, MovementType } from './dto/inventory-movement.dto';

@Injectable()
export class InventoryMovementsService {
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

  // ─── Audit logging ─────────────────────────────────────────────────────────

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
      // Audit failures must not break the main action.
    }
  }

  // ─── Feature methods ───────────────────────────────────────────────────────

  async create(dto: CreateInventoryMovementDto, userId?: string) {
    const prisma = this.prisma();
    let movement: any;

    if (
      dto.movementType === MovementType.TRANSFER &&
      dto.stockBatchId
    ) {
      // ── Stock batch transfer: split quantity to destination batch ─────────
      movement = await prisma.$transaction(async (tx: any) => {
        const batch = await tx.inventoryStockBatch.findFirst({
          where: { id: dto.stockBatchId, deletedAt: null },
        });
        if (!batch) throw new NotFoundException('Inventory stock batch not found');
        if (!dto.toLocationId)
          throw new BadRequestException('Destination location is required');
        if (batch.quantityGood < dto.quantity) {
          throw new BadRequestException(
            'Transfer quantity exceeds available good quantity',
          );
        }

        await tx.inventoryStockBatch.update({
          where: { id: batch.id },
          data: {
            quantityTotal: batch.quantityTotal - dto.quantity,
            quantityGood: batch.quantityGood - dto.quantity,
          },
        });
        await tx.inventoryStockBatch.create({
          data: {
            itemId: batch.itemId,
            locationId: dto.toLocationId,
            quantityTotal: dto.quantity,
            quantityGood: dto.quantity,
            purchaseDate: batch.purchaseDate,
            purchasePrice: batch.purchasePrice,
            totalCost: batch.purchasePrice
              ? Number(batch.purchasePrice) * dto.quantity
              : null,
            supplier: batch.supplier,
            invoiceNo: batch.invoiceNo,
            hasWarranty: batch.hasWarranty,
            warrantyPeriod: batch.warrantyPeriod,
            warrantyPeriodUnit: batch.warrantyPeriodUnit,
            warrantyExpires: batch.warrantyExpires,
            warrantyNotes: batch.warrantyNotes,
            createdBy: userId,
          },
        });
        return tx.inventoryMovement.create({
          data: {
            itemId: batch.itemId,
            stockBatchId: batch.id,
            fromLocationId: batch.locationId,
            toLocationId: dto.toLocationId,
            movementType: dto.movementType,
            quantity: dto.quantity,
            referenceNo: this.nullable(dto.referenceNo),
            notes: this.nullable(dto.notes),
            createdBy: userId,
          },
        });
      });
    } else if (
      dto.movementType === MovementType.TRANSFER &&
      dto.assetId &&
      dto.toLocationId
    ) {
      // ── Asset transfer: update asset location ─────────────────────────────
      movement = await prisma.$transaction(async (tx: any) => {
        const asset = await tx.inventoryAsset.findFirst({
          where: { id: dto.assetId, deletedAt: null },
        });
        if (!asset) throw new NotFoundException('Inventory asset not found');

        await tx.inventoryAsset.update({
          where: { id: asset.id },
          data: {
            locationId: dto.toLocationId,
            status: 'IN_USE',
            updatedBy: userId,
          },
        });
        return tx.inventoryMovement.create({
          data: {
            itemId: asset.itemId,
            assetId: asset.id,
            fromLocationId: asset.locationId,
            toLocationId: dto.toLocationId,
            movementType: dto.movementType,
            quantity: 1,
            referenceNo: this.nullable(dto.referenceNo),
            notes: this.nullable(dto.notes),
            createdBy: userId,
          },
        });
      });
    } else {
      // ── General movement record ───────────────────────────────────────────
      movement = await prisma.inventoryMovement.create({
        data: {
          itemId: dto.itemId,
          assetId: this.nullable(dto.assetId),
          stockBatchId: this.nullable(dto.stockBatchId),
          fromLocationId: this.nullable(dto.fromLocationId),
          toLocationId: this.nullable(dto.toLocationId),
          movementType: dto.movementType,
          quantity: dto.quantity,
          referenceNo: this.nullable(dto.referenceNo),
          notes: this.nullable(dto.notes),
          createdBy: userId,
        },
      });
    }

    await this.logAction({
      action: dto.movementType,
      entityType: 'MOVEMENT',
      entityId: movement.id,
      summary: `${dto.movementType} movement recorded for ${movement.quantity} item(s)`,
      afterData: movement,
      userId,
    });

    return movement;
  }

  async findAll(query: any = {}) {
    const prisma = this.prisma();
    const { page, limit, skip } = this.pagination(query);
    const where: any = { ...this.buildDateFilter(query, 'createdAt') };

    if (query.itemId) where.itemId = query.itemId;
    if (query.movementType)
      where.movementType = { in: String(query.movementType).split(',') };

    const [items, total, movementTotals, byType] = await Promise.all([
      prisma.inventoryMovement.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          movementType: true,
          quantity: true,
          referenceNo: true,
          notes: true,
          createdAt: true,
          item: { select: { id: true, name: true, code: true } },
          fromLocation: {
            select: {
              id: true,
              name: true,
              classRoom: {
                select: { id: true, name: true, roomNo: true, building: true, floor: true },
              },
            },
          },
          toLocation: {
            select: {
              id: true,
              name: true,
              classRoom: {
                select: { id: true, name: true, roomNo: true, building: true, floor: true },
              },
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      prisma.inventoryMovement.count({ where }),
      prisma.inventoryMovement.aggregate({
        where,
        _sum: { quantity: true },
      }),
      prisma.inventoryMovement.groupBy({
        by: ['movementType'],
        where,
        _count: { _all: true },
      }),
    ]);

    const typeSummary = Object.fromEntries(
      (byType as any[]).map((item: any) => [item.movementType, item._count._all]),
    );
    const trend = await this.buildTrend(
      prisma.inventoryMovement,
      where,
      'createdAt',
      query,
    );

    return this.paginatedResponse(
      'Inventory movements retrieved successfully',
      items,
      total,
      page,
      limit,
      {
        total,
        quantity: this.toNumber(movementTotals._sum.quantity),
        purchase: typeSummary.PURCHASE || 0,
        transfer: typeSummary.TRANSFER || 0,
        issue: typeSummary.ISSUE || 0,
        return: typeSummary.RETURN || 0,
        trend,
      },
    );
  }

  async findOne(id: string) {
    const movement = await this.prisma().inventoryMovement.findFirst({
      where: { id },
      include: {
        item: true,
        asset: true,
        stockBatch: true,
        fromLocation: { include: { classRoom: true } },
        toLocation: { include: { classRoom: true } },
      },
    });
    if (!movement) throw new NotFoundException('Inventory movement not found');
    return movement;
  }
}
