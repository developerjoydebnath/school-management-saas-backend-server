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
  CreateInventoryLocationDto,
  UpdateInventoryLocationDto,
} from './dto/inventory-location.dto';

@Injectable()
export class InventoryLocationsService {
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

  private normalizeStatus(status?: string) {
    return status?.toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
  }

  async create(dto: CreateInventoryLocationDto, userId?: string) {
    if (dto.classRoomId) {
      const classRoom = await this.prisma().classRoom.findFirst({
        where: { id: dto.classRoomId, deletedAt: null },
        select: { id: true },
      });
      if (!classRoom) throw new NotFoundException('Class room not found');
    }
    const location = await this.prisma().inventoryLocation.create({
      data: {
        locationType: dto.locationType,
        name: dto.name,
        code: this.nullable(dto.code),
        classRoomId: this.nullable(dto.classRoomId),
        description: this.nullable(dto.description),
        status: this.normalizeStatus(dto.status),
        createdBy: userId,
      },
    });
    await this.logAction({
      action: 'CREATE',
      entityType: 'LOCATION',
      entityId: location.id,
      summary: `Location "${location.name}" created`,
      afterData: location,
      userId,
    });
    return location;
  }

  async findAll(query: any = {}) {
    const prisma = this.prisma();
    const { page, limit, skip } = this.pagination(query);
    const where: any = { deletedAt: null };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        {
          classRoom: {
            is: {
              roomNo: { contains: query.search, mode: 'insensitive' },
            },
          },
        },
        {
          classRoom: {
            is: {
              building: { contains: query.search, mode: 'insensitive' },
            },
          },
        },
      ];
    }
    if (query.locationType)
      where.locationType = { in: String(query.locationType).split(',') };
    if (query.status)
      where.status = {
        in: String(query.status)
          .split(',')
          .map((s) => s.toUpperCase()),
      };
    const [items, total, active, withRoom] = await Promise.all([
      prisma.inventoryLocation.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          locationType: true,
          name: true,
          code: true,
          classRoomId: true,
          classRoom: {
            select: {
              id: true,
              name: true,
              roomNo: true,
              building: true,
              floor: true,
            },
          },
          status: true,
          createdAt: true,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      prisma.inventoryLocation.count({ where }),
      prisma.inventoryLocation.count({ where: { ...where, status: 'ACTIVE' } }),
      prisma.inventoryLocation.count({
        where: { ...where, classRoomId: { not: null } },
      }),
    ]);
    const trend = await this.buildTrend(
      prisma.inventoryLocation,
      where,
      'createdAt',
      query,
    );
    return this.paginatedResponse(
      'Inventory locations retrieved successfully',
      items,
      total,
      page,
      limit,
      {
        total,
        active,
        inactive: total - active,
        withRoom,
        withoutRoom: total - withRoom,
        trend,
      },
    );
  }

  async findOne(id: string) {
    const location = await this.prisma().inventoryLocation.findFirst({
      where: { id, deletedAt: null },
      include: {
        classRoom: true,
        _count: { select: { stockBatches: true, assets: true } },
      },
    });
    if (!location) throw new NotFoundException('Inventory location not found');
    return location;
  }

  async getOptions() {
    const locations = await this.prisma().inventoryLocation.findMany({
      where: { deletedAt: null, status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        code: true,
        locationType: true,
        classRoom: { select: { roomNo: true, building: true, floor: true } },
      },
      orderBy: { name: 'asc' },
    });

    return {
      success: true,
      statusCode: 200,
      message: 'Location options retrieved successfully',
      data: locations.map((location: any) => {
        const room = location.classRoom;
        const roomInfo = room
          ? [room.roomNo, room.building, room.floor].filter(Boolean).join(' - ')
          : '';
        return {
          value: location.id,
          label: [
            location.code ? `${location.code} - ${location.name}` : location.name,
            roomInfo,
          ]
            .filter(Boolean)
            .join(' (') + (roomInfo ? ')' : ''),
          locationType: location.locationType,
        };
      }),
      meta: null,
    };
  }

  async update(
    id: string,
    dto: UpdateInventoryLocationDto,
    userId?: string,
  ) {
    await this.findOne(id);
    if (dto.classRoomId) {
      const classRoom = await this.prisma().classRoom.findFirst({
        where: { id: dto.classRoomId, deletedAt: null },
        select: { id: true },
      });
      if (!classRoom) throw new NotFoundException('Class room not found');
    }
    const location = await this.prisma().inventoryLocation.update({
      where: { id },
      data: {
        ...(dto.locationType !== undefined
          ? { locationType: dto.locationType }
          : {}),
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.code !== undefined ? { code: this.nullable(dto.code) } : {}),
        ...(dto.classRoomId !== undefined
          ? { classRoomId: this.nullable(dto.classRoomId) }
          : {}),
        ...(dto.description !== undefined
          ? { description: this.nullable(dto.description) }
          : {}),
        ...(dto.status !== undefined
          ? { status: this.normalizeStatus(dto.status) }
          : {}),
        updatedBy: userId,
      },
    });
    await this.logAction({
      action: 'UPDATE',
      entityType: 'LOCATION',
      entityId: location.id,
      summary: `Location "${location.name}" updated`,
      afterData: location,
      userId,
    });
    return location;
  }

  async remove(id: string, userId?: string) {
    const location = await this.findOne(id);
    if (location._count.stockBatches + location._count.assets > 0) {
      throw new BadRequestException('Inventory location has stock or assets');
    }
    const deleted = await this.prisma().inventoryLocation.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId },
    });
    await this.logAction({
      action: 'DELETE',
      entityType: 'LOCATION',
      entityId: deleted.id,
      summary: `Location "${deleted.name}" deleted`,
      beforeData: location,
      afterData: deleted,
      userId,
    });
    return deleted;
  }
}
