import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService, TenantConnectionService } from 'src/cores/prisma.service';
import { CreateInventoryAssetDto, UpdateInventoryAssetDto } from './dto/inventory-asset.dto';
import { Role } from '@prisma/client';

@Injectable()
export class InventoryAssetsService {
  constructor(
    private readonly tenantConnection: TenantConnectionService,
    private readonly prismaService: PrismaService,
  ) {}

  private prisma(): any {
    return this.tenantConnection.getTenantClient();
  }

  private nullable<T>(value: T | undefined | null): T | null {
    if (value === undefined) return undefined as any;
    return value === null || value === '' ? null : value;
  }

  private parseDate(dateString?: string): Date | null {
    if (!dateString) return null;
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  }

  private getUserDisplayName(user: any): string | null {
    if (!user) return null;
    if (user.profile?.firstName) {
      return `${user.profile.firstName} ${user.profile.lastName || ''}`.trim();
    }
    return user.email || user.phone || null;
  }

  private getAssignableSchemaNames(role?: Role, schemaName?: string): string[] | undefined {
    if (role === Role.SUPER_ADMIN) return undefined;
    if (schemaName) return [schemaName, 'public'];
    return undefined;
  }

  private async findAssignableUser(id: string, role?: Role, schemaName?: string) {
    return this.prismaService.client.user.findFirst({
      where: {
        id,
        deletedAt: null,
        schemaName: { in: this.getAssignableSchemaNames(role, schemaName) },
      },
      include: { profile: true },
    });
  }

  async findAssignableUsers(userContext?: { role?: Role; schema?: string }) {
    const users = await this.prismaService.client.user.findMany({
      where: {
        deletedAt: null,
        schemaName: { in: this.getAssignableSchemaNames(userContext?.role, userContext?.schema) },
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
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    return {
      success: true,
      statusCode: 200,
      message: 'Assignable users retrieved successfully',
      data: users,
    };
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
    const rows = await this.prisma().inventoryAsset.findMany({
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
    action: 'CREATE' | 'UPDATE' | 'DELETE';
    entityType: 'ASSET';
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
          createdBy: data.userId,
        },
      });
    } catch (error) {
      console.error('Failed to create inventory audit log:', error);
    }
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
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
          ...(summary ? { summary } : {}),
        },
      },
    };
  }

  async create(
    dto: CreateInventoryAssetDto,
    userId?: string,
    userContext?: { role?: Role; schema?: string },
  ) {
    const existingAsset = await this.prisma().inventoryAsset.findFirst({
      where: {
        OR: [
          { assetTag: dto.assetTag },
          ...(dto.serialNo ? [{ serialNo: dto.serialNo }] : []),
        ],
      },
      select: { assetTag: true, serialNo: true },
    });

    if (existingAsset) {
      if (existingAsset.assetTag === dto.assetTag) {
        throw new ConflictException('Inventory asset tag already exists');
      }
      throw new ConflictException('Inventory asset serial number already exists');
    }

    const assignedUser = dto.assignedTo
      ? await this.findAssignableUser(
          dto.assignedTo,
          userContext?.role,
          userContext?.schema,
        )
      : null;

    if (dto.assignedTo && !assignedUser) {
      throw new NotFoundException('Assigned user not found');
    }

    const [item, location] = await Promise.all([
      this.prisma().inventoryItem.findFirst({ where: { id: dto.itemId, deletedAt: null } }),
      this.prisma().inventoryLocation.findFirst({ where: { id: dto.locationId, deletedAt: null } }),
    ]);

    if (!item) throw new NotFoundException('Inventory item not found');
    if (!location) throw new NotFoundException('Inventory location not found');

    const purchaseDate = this.parseDate(dto.purchaseDate);
    let asset: any;
    try {
      asset = await this.prisma().inventoryAsset.create({
        data: {
          itemId: dto.itemId,
          locationId: dto.locationId,
          assetTag: dto.assetTag,
          serialNo: this.nullable(dto.serialNo),
          macAddress: this.nullable(dto.macAddress),
          condition: dto.condition || 'GOOD',
          status: dto.status || 'IN_STORE',
          assignedTo: this.nullable(dto.assignedTo),
          assignedName: assignedUser
            ? this.getUserDisplayName(assignedUser)
            : null,
          assignedAt: dto.assignedTo ? new Date() : null,
          purchaseDate,
          purchasePrice: this.nullable(dto.purchasePrice),
          supplier: this.nullable(dto.supplier),
          invoiceNo: this.nullable(dto.invoiceNo),
          hasWarranty: dto.hasWarranty || false,
          warrantyPeriod: this.nullable(dto.warrantyPeriod),
          warrantyPeriodUnit: this.nullable(dto.warrantyPeriodUnit),
          imageUrl: this.nullable(dto.imageUrl),
          imagePlaceholder: this.nullable(dto.imagePlaceholder),
          notes: this.nullable(dto.notes),
          createdBy: userId,
        },
      });
    } catch (error) {
      throw new BadRequestException('Failed to create inventory asset');
    }

    await this.logAction({
      action: 'CREATE',
      entityType: 'ASSET',
      entityId: asset.id,
      summary: `Asset "${asset.assetTag}" created`,
      afterData: asset,
      userId,
    });
    return {
      success: true,
      statusCode: 201,
      message: 'Inventory asset created successfully',
      data: asset,
    };
  }

  async findAll(query: any) {
    const { page, limit, skip } = this.pagination(query);

    const where: any = { deletedAt: null };

    if (query.search) {
      where.OR = [
        { assetTag: { contains: query.search, mode: 'insensitive' } },
        { serialNo: { contains: query.search, mode: 'insensitive' } },
        { macAddress: { contains: query.search, mode: 'insensitive' } },
        { assignedName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.itemId) where.itemId = query.itemId;
    if (query.locationId) where.locationId = query.locationId;
    if (query.status) where.status = query.status;
    if (query.condition) where.condition = query.condition;
    if (query.assignedTo) where.assignedTo = query.assignedTo;
    if (query.hasWarranty !== undefined) where.hasWarranty = query.hasWarranty === 'true';

    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = this.startOfDay(new Date(query.dateFrom));
      if (query.dateTo) where.createdAt.lte = this.endOfDay(new Date(query.dateTo));
    }

    const [items, total] = await Promise.all([
      this.prisma().inventoryAsset.findMany({
        where,
        include: {
          item: { select: { id: true, name: true, code: true, trackingType: true } },
          location: { select: { id: true, name: true, code: true } },
        },
        skip,
        take: limit,
        orderBy: [{ createdAt: 'desc' }],
      }),
      this.prisma().inventoryAsset.count({ where }),
    ]);

    const activeAssets = await this.prisma().inventoryAsset.count({
      where: { ...where, status: 'IN_USE' },
    });
    const storeAssets = await this.prisma().inventoryAsset.count({
      where: { ...where, status: 'IN_STORE' },
    });
    const damagedAssets = await this.prisma().inventoryAsset.count({
      where: { ...where, condition: 'DAMAGED' },
    });
    const lostAssets = await this.prisma().inventoryAsset.count({
      where: { ...where, status: 'LOST' },
    });

    const trend = await this.buildTrend(where, query);

    const summary = {
      total,
      inUse: activeAssets,
      inStore: storeAssets,
      damaged: damagedAssets,
      lost: lostAssets,
      trend,
    };

    return this.paginatedResponse(
      'Inventory assets retrieved successfully',
      items,
      total,
      page,
      limit,
      summary,
    );
  }

  async findOne(id: string) {
    const asset = await this.prisma().inventoryAsset.findFirst({
      where: { id, deletedAt: null },
      include: {
        item: { include: { category: true } },
        location: { include: { classRoom: true } },
        _count: {
          select: { movements: true, maintenances: true },
        },
      },
    });

    if (!asset) throw new NotFoundException('Inventory asset not found');

    return {
      success: true,
      statusCode: 200,
      message: 'Inventory asset retrieved successfully',
      data: asset,
    };
  }

  async getOptions() {
    const assets = await this.prisma().inventoryAsset.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        assetTag: true,
        serialNo: true,
        status: true,
        item: { select: { name: true, code: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 500,
    });

    return {
      success: true,
      statusCode: 200,
      message: 'Asset options retrieved successfully',
      data: assets.map((asset: any) => ({
        value: asset.id,
        label: [
          asset.assetTag,
          asset.item?.name ? `- ${asset.item.name}` : '',
          asset.serialNo ? `(${asset.serialNo})` : '',
        ]
          .filter(Boolean)
          .join(' '),
        status: asset.status,
      })),
      meta: null,
    };
  }

  async update(
    id: string,
    dto: UpdateInventoryAssetDto,
    userId?: string,
    userContext?: { role?: Role; schema?: string },
  ) {
    const currentAsset = await this.prisma().inventoryAsset.findFirst({
      where: { id, deletedAt: null },
    });
    if (!currentAsset) throw new NotFoundException('Inventory asset not found');

    if (dto.assetTag && dto.assetTag !== currentAsset.assetTag) {
      const existing = await this.prisma().inventoryAsset.findFirst({
        where: { assetTag: dto.assetTag },
      });
      if (existing) throw new ConflictException('Inventory asset tag already exists');
    }

    if (dto.serialNo && dto.serialNo !== currentAsset.serialNo) {
      const existing = await this.prisma().inventoryAsset.findFirst({
        where: { serialNo: dto.serialNo },
      });
      if (existing) throw new ConflictException('Inventory asset serial number already exists');
    }

    const assignedUser =
      dto.assignedTo !== undefined && dto.assignedTo !== null
        ? await this.findAssignableUser(
            dto.assignedTo,
            userContext?.role,
            userContext?.schema,
          )
        : null;

    if (dto.assignedTo && !assignedUser) {
      throw new NotFoundException('Assigned user not found');
    }

    let purchaseDate = currentAsset.purchaseDate;
    if (dto.purchaseDate !== undefined) {
      purchaseDate = this.parseDate(dto.purchaseDate);
    }

    let asset: any;
    try {
      asset = await this.prisma().inventoryAsset.update({
        where: { id },
        data: {
          ...(dto.itemId !== undefined ? { itemId: dto.itemId } : {}),
          ...(dto.locationId !== undefined ? { locationId: dto.locationId } : {}),
          ...(dto.assetTag !== undefined ? { assetTag: dto.assetTag } : {}),
          ...(dto.serialNo !== undefined
            ? { serialNo: this.nullable(dto.serialNo) }
            : {}),
          ...(dto.macAddress !== undefined
            ? { macAddress: this.nullable(dto.macAddress) }
            : {}),
          ...(dto.condition !== undefined ? { condition: dto.condition } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.assignedTo !== undefined
            ? {
                assignedTo: this.nullable(dto.assignedTo),
                assignedName: assignedUser
                  ? this.getUserDisplayName(assignedUser)
                  : null,
                assignedAt: dto.assignedTo && dto.assignedTo !== currentAsset.assignedTo
                  ? new Date()
                  : currentAsset.assignedTo === dto.assignedTo
                  ? currentAsset.assignedAt
                  : null,
              }
            : {}),
          ...(dto.purchaseDate !== undefined ? { purchaseDate } : {}),
          ...(dto.purchasePrice !== undefined
            ? { purchasePrice: this.nullable(dto.purchasePrice) }
            : {}),
          ...(dto.supplier !== undefined ? { supplier: this.nullable(dto.supplier) } : {}),
          ...(dto.invoiceNo !== undefined ? { invoiceNo: this.nullable(dto.invoiceNo) } : {}),
          ...(dto.hasWarranty !== undefined ? { hasWarranty: dto.hasWarranty } : {}),
          ...(dto.warrantyPeriod !== undefined
            ? { warrantyPeriod: this.nullable(dto.warrantyPeriod) }
            : {}),
          ...(dto.warrantyPeriodUnit !== undefined
            ? { warrantyPeriodUnit: this.nullable(dto.warrantyPeriodUnit) }
            : {}),
          ...(dto.imageUrl !== undefined ? { imageUrl: this.nullable(dto.imageUrl) } : {}),
          ...(dto.imagePlaceholder !== undefined
            ? { imagePlaceholder: this.nullable(dto.imagePlaceholder) }
            : {}),
          ...(dto.notes !== undefined ? { notes: this.nullable(dto.notes) } : {}),
          updatedBy: userId,
        },
      });
    } catch (error) {
      throw new BadRequestException('Failed to update inventory asset');
    }

    await this.logAction({
      action: 'UPDATE',
      entityType: 'ASSET',
      entityId: asset.id,
      summary: `Asset "${asset.assetTag}" updated`,
      beforeData: currentAsset,
      afterData: asset,
      userId,
    });

    return {
      success: true,
      statusCode: 200,
      message: 'Inventory asset updated successfully',
      data: asset,
    };
  }

  async remove(id: string, userId?: string) {
    const current = await this.prisma().inventoryAsset.findFirst({
      where: { id, deletedAt: null }
    });
    if (!current) throw new NotFoundException('Inventory asset not found');
    const deleted = await this.prisma().inventoryAsset.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId },
    });
    await this.logAction({
      action: 'DELETE',
      entityType: 'ASSET',
      entityId: deleted.id,
      summary: `Asset "${deleted.assetTag}" deleted`,
      beforeData: current,
      afterData: deleted,
      userId,
    });
    return {
      success: true,
      statusCode: 200,
      message: 'Inventory asset deleted successfully',
      data: deleted,
    };
  }
}
