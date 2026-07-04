import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import {
  PrismaService,
  TenantConnectionService,
} from 'src/cores/prisma.service';
import {
  CreateInventoryAssetDto,
  CreateInventoryCategoryDto,
  CreateInventoryItemDto,
  CreateInventoryLocationDto,
  CreateInventoryMaintenanceDto,
  CreateInventoryMovementDto,
  CreateInventoryStockBatchDto,
  InventoryMovementTypeDto,
  UpdateInventoryAssetDto,
  UpdateInventoryCategoryDto,
  UpdateInventoryItemDto,
  UpdateInventoryLocationDto,
  UpdateInventoryMaintenanceDto,
  UpdateInventoryStockBatchDto,
} from './dto/inventory.dto';
import { InventorySeedService } from './inventory-seed.service';

@Injectable()
export class InventoryService {
  constructor(
    private readonly tenantConnection: TenantConnectionService,
    private readonly prismaService: PrismaService,
    private readonly inventorySeedService: InventorySeedService,
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

  async seedCurrentTenant() {
    await this.inventorySeedService.seedTenantSchema(
      this.tenantConnection.getTenantSchema(),
    );
    return {
      success: true,
      statusCode: 200,
      message: 'Inventory seed completed successfully',
      data: null,
      meta: null,
    };
  }

  async overview() {
    const prisma = this.prisma();
    const [
      categoryCount,
      itemCount,
      assetCount,
      damagedBatchCount,
      maintenanceCount,
    ] = await Promise.all([
      prisma.inventoryCategory.count({ where: { deletedAt: null } }),
      prisma.inventoryItem.count({ where: { deletedAt: null } }),
      prisma.inventoryAsset.count({ where: { deletedAt: null } }),
      prisma.inventoryStockBatch.count({
        where: { deletedAt: null, quantityDamaged: { gt: 0 } },
      }),
      prisma.inventoryMaintenance.count({
        where: { deletedAt: null, status: { in: ['OPEN', 'IN_PROGRESS'] } },
      }),
    ]);

    return {
      success: true,
      statusCode: 200,
      message: 'Inventory overview retrieved successfully',
      data: {
        categoryCount,
        itemCount,
        assetCount,
        damagedBatchCount,
        maintenanceCount,
      },
      meta: null,
    };
  }

  async createCategory(dto: CreateInventoryCategoryDto, userId?: string) {
    const prisma = this.prisma();
    const slug = dto.slug ? this.slugify(dto.slug) : this.slugify(dto.name);
    const existing = await prisma.inventoryCategory.findFirst({
      where: { slug, deletedAt: null },
      select: { id: true },
    });
    if (existing)
      throw new ConflictException('Inventory category already exists');

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
      entityType: 'CATEGORY',
      entityId: category.id,
      summary: `Category "${category.name}" created`,
      afterData: category,
      userId,
    });
    return category;
  }

  async findCategories(query: any = {}) {
    const prisma = this.prisma();
    const { page, limit, skip } = this.pagination(query);
    const where: any = { deletedAt: null };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { nameBn: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.isActive !== undefined)
      where.isActive = query.isActive === 'true';

    const [items, total] = await Promise.all([
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
    ]);
    return this.paginatedResponse(
      'Inventory categories retrieved successfully',
      items,
      total,
      page,
      limit,
    );
  }

  async findCategory(id: string) {
    const category = await this.prisma().inventoryCategory.findFirst({
      where: { id, deletedAt: null },
      include: { _count: { select: { items: true } } },
    });
    if (!category) throw new NotFoundException('Inventory category not found');
    return category;
  }

  async updateCategory(
    id: string,
    dto: UpdateInventoryCategoryDto,
    userId?: string,
  ) {
    await this.findCategory(id);
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
      entityType: 'CATEGORY',
      entityId: category.id,
      summary: `Category "${category.name}" updated`,
      afterData: category,
      userId,
    });
    return category;
  }

  async deleteCategory(id: string, userId?: string) {
    const category = await this.findCategory(id);
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
      entityType: 'CATEGORY',
      entityId: deleted.id,
      summary: `Category "${deleted.name}" deleted`,
      beforeData: category,
      afterData: deleted,
      userId,
    });
    return deleted;
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
        ? { trackingType: dto.trackingType }
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

  async createItem(dto: CreateInventoryItemDto, userId?: string) {
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

  async findItems(query: any = {}) {
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

    const [items, total] = await Promise.all([
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
          seatingCapacity: true,
          isSeatingItem: true,
          isActive: true,
          createdAt: true,
          category: { select: { id: true, name: true } },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      prisma.inventoryItem.count({ where }),
    ]);
    return this.paginatedResponse(
      'Inventory items retrieved successfully',
      items,
      total,
      page,
      limit,
    );
  }

  async findItem(id: string) {
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

  async updateItem(id: string, dto: UpdateInventoryItemDto, userId?: string) {
    await this.findItem(id);
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
      afterData: item,
      userId,
    });
    return item;
  }

  async deleteItem(id: string, userId?: string) {
    const item = await this.findItem(id);
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

  async createLocation(dto: CreateInventoryLocationDto, userId?: string) {
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
        building: this.nullable(dto.building),
        floor: this.nullable(dto.floor),
        roomNo: this.nullable(dto.roomNo),
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

  async findLocations(query: any = {}) {
    const prisma = this.prisma();
    const { page, limit, skip } = this.pagination(query);
    const where: any = { deletedAt: null };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        { roomNo: { contains: query.search, mode: 'insensitive' } },
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
    const [items, total] = await Promise.all([
      prisma.inventoryLocation.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          locationType: true,
          name: true,
          code: true,
          building: true,
          floor: true,
          roomNo: true,
          status: true,
          createdAt: true,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      prisma.inventoryLocation.count({ where }),
    ]);
    return this.paginatedResponse(
      'Inventory locations retrieved successfully',
      items,
      total,
      page,
      limit,
    );
  }

  async findLocation(id: string) {
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

  async updateLocation(
    id: string,
    dto: UpdateInventoryLocationDto,
    userId?: string,
  ) {
    await this.findLocation(id);
    const location = await this.prisma().inventoryLocation.update({
      where: { id },
      data: {
        ...(dto.locationType !== undefined
          ? { locationType: dto.locationType }
          : {}),
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.code !== undefined ? { code: this.nullable(dto.code) } : {}),
        ...(dto.building !== undefined
          ? { building: this.nullable(dto.building) }
          : {}),
        ...(dto.floor !== undefined ? { floor: this.nullable(dto.floor) } : {}),
        ...(dto.roomNo !== undefined
          ? { roomNo: this.nullable(dto.roomNo) }
          : {}),
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

  async deleteLocation(id: string, userId?: string) {
    const location = await this.findLocation(id);
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

  async createStockBatch(dto: CreateInventoryStockBatchDto, userId?: string) {
    const quantities = this.validateQuantities(dto);
    await Promise.all([
      this.findItem(dto.itemId),
      this.findLocation(dto.locationId),
    ]);
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
        totalCost:
          dto.purchasePrice !== undefined
            ? dto.purchasePrice * quantities.total
            : undefined,
        supplier: this.nullable(dto.supplier),
        invoiceNo: this.nullable(dto.invoiceNo),
        hasWarranty: dto.hasWarranty ?? false,
        warrantyPeriod: dto.warrantyPeriod,
        warrantyPeriodUnit: this.nullable(dto.warrantyPeriodUnit),
        warrantyExpires: this.calculateWarrantyExpires(
          purchaseDate,
          dto.warrantyPeriod,
          dto.warrantyPeriodUnit,
        ),
        warrantyNotes: this.nullable(dto.warrantyNotes),
        invoiceImageUrl: this.nullable(dto.invoiceImageUrl),
        invoicePlaceholder: this.nullable(dto.invoicePlaceholder),
        notes: this.nullable(dto.notes),
        createdBy: userId,
      },
    });
    await this.logAction({
      action: 'PURCHASE',
      entityType: 'STOCK_BATCH',
      entityId: batch.id,
      summary: `Stock batch created with ${batch.quantityTotal} item(s)`,
      afterData: batch,
      userId,
    });
    return batch;
  }

  async findStockBatches(query: any = {}) {
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
    const [items, total] = await Promise.all([
      prisma.inventoryStockBatch.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          quantityTotal: true,
          quantityGood: true,
          quantityDamaged: true,
          purchaseDate: true,
          warrantyExpires: true,
          invoiceImageUrl: true,
          invoicePlaceholder: true,
          createdAt: true,
          item: { select: { id: true, name: true, code: true, unit: true } },
          location: { select: { id: true, name: true, locationType: true } },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      prisma.inventoryStockBatch.count({ where }),
    ]);
    return this.paginatedResponse(
      'Inventory stock batches retrieved successfully',
      items,
      total,
      page,
      limit,
    );
  }

  async findStockBatch(id: string) {
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

  async updateStockBatch(
    id: string,
    dto: UpdateInventoryStockBatchDto,
    userId?: string,
  ) {
    const current = await this.findStockBatch(id);
    const quantities = this.validateQuantities({
      quantityTotal: dto.quantityTotal ?? current.quantityTotal,
      quantityGood: dto.quantityGood ?? current.quantityGood,
      quantityDamaged: dto.quantityDamaged ?? current.quantityDamaged,
      quantityDisposed: dto.quantityDisposed ?? current.quantityDisposed,
    });
    const purchaseDate =
      dto.purchaseDate !== undefined
        ? this.parseDate(dto.purchaseDate)
        : current.purchaseDate;
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
        ...(dto.purchasePrice !== undefined
          ? {
              purchasePrice: dto.purchasePrice,
              totalCost: dto.purchasePrice * quantities.total,
            }
          : {}),
        ...(dto.supplier !== undefined
          ? { supplier: this.nullable(dto.supplier) }
          : {}),
        ...(dto.invoiceNo !== undefined
          ? { invoiceNo: this.nullable(dto.invoiceNo) }
          : {}),
        ...(dto.hasWarranty !== undefined
          ? { hasWarranty: dto.hasWarranty }
          : {}),
        ...(dto.warrantyPeriod !== undefined
          ? { warrantyPeriod: dto.warrantyPeriod }
          : {}),
        ...(dto.warrantyPeriodUnit !== undefined
          ? { warrantyPeriodUnit: this.nullable(dto.warrantyPeriodUnit) }
          : {}),
        warrantyExpires: this.calculateWarrantyExpires(
          purchaseDate,
          dto.warrantyPeriod ?? current.warrantyPeriod,
          dto.warrantyPeriodUnit ?? current.warrantyPeriodUnit,
        ),
        ...(dto.warrantyNotes !== undefined
          ? { warrantyNotes: this.nullable(dto.warrantyNotes) }
          : {}),
        ...(dto.invoiceImageUrl !== undefined
          ? { invoiceImageUrl: this.nullable(dto.invoiceImageUrl) }
          : {}),
        ...(dto.invoicePlaceholder !== undefined
          ? { invoicePlaceholder: this.nullable(dto.invoicePlaceholder) }
          : {}),
        ...(dto.notes !== undefined ? { notes: this.nullable(dto.notes) } : {}),
        updatedBy: userId,
      },
    });
    await this.logAction({
      action: 'UPDATE',
      entityType: 'STOCK_BATCH',
      entityId: updated.id,
      summary: `Stock batch updated`,
      beforeData: current,
      afterData: updated,
      userId,
    });
    return updated;
  }

  async deleteStockBatch(id: string, userId?: string) {
    const current = await this.findStockBatch(id);
    const deleted = await this.prisma().inventoryStockBatch.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId },
    });
    await this.logAction({
      action: 'DELETE',
      entityType: 'STOCK_BATCH',
      entityId: deleted.id,
      summary: `Stock batch deleted`,
      beforeData: current,
      afterData: deleted,
      userId,
    });
    return deleted;
  }

  async createAsset(
    dto: CreateInventoryAssetDto,
    userId?: string,
    userContext?: { role?: Role; schema?: string },
  ) {
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

    await Promise.all([
      this.findItem(dto.itemId),
      this.findLocation(dto.locationId),
    ]);
    const purchaseDate = this.parseDate(dto.purchaseDate);
    const asset = await this.prisma().inventoryAsset.create({
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
        purchasePrice: dto.purchasePrice,
        supplier: this.nullable(dto.supplier),
        invoiceNo: this.nullable(dto.invoiceNo),
        hasWarranty: dto.hasWarranty ?? false,
        warrantyPeriod: dto.warrantyPeriod,
        warrantyPeriodUnit: this.nullable(dto.warrantyPeriodUnit),
        warrantyExpires: this.calculateWarrantyExpires(
          purchaseDate,
          dto.warrantyPeriod,
          dto.warrantyPeriodUnit,
        ),
        notes: this.nullable(dto.notes),
        createdBy: userId,
      },
    });
    await this.logAction({
      action: 'CREATE',
      entityType: 'ASSET',
      entityId: asset.id,
      summary: `Asset "${asset.assetTag}" created`,
      afterData: asset,
      userId,
    });
    return asset;
  }

  async findAssets(query: any = {}) {
    const prisma = this.prisma();
    const { page, limit, skip } = this.pagination(query);
    const where: any = {
      deletedAt: null,
      ...this.buildDateFilter(query, 'createdAt'),
    };
    if (query.itemId) where.itemId = query.itemId;
    if (query.locationId) where.locationId = query.locationId;
    if (query.status) where.status = { in: String(query.status).split(',') };
    if (query.condition)
      where.condition = { in: String(query.condition).split(',') };
    if (query.search) {
      where.OR = [
        { assetTag: { contains: query.search, mode: 'insensitive' } },
        { serialNo: { contains: query.search, mode: 'insensitive' } },
        { item: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }
    const [items, total] = await Promise.all([
      prisma.inventoryAsset.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          assetTag: true,
          serialNo: true,
          condition: true,
          status: true,
          assignedTo: true,
          assignedName: true,
          warrantyExpires: true,
          createdAt: true,
          item: { select: { id: true, name: true, code: true } },
          location: { select: { id: true, name: true, locationType: true } },
          assignedToUser: {
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
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      prisma.inventoryAsset.count({ where }),
    ]);
    return this.paginatedResponse(
      'Inventory assets retrieved successfully',
      items,
      total,
      page,
      limit,
    );
  }

  async findAsset(id: string) {
    const asset = await this.prisma().inventoryAsset.findFirst({
      where: { id, deletedAt: null },
      include: {
        item: { include: { category: true } },
        location: true,
        assignedToUser: {
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
        },
        movements: true,
        maintenances: true,
      },
    });
    if (!asset) throw new NotFoundException('Inventory asset not found');
    return asset;
  }

  async updateAsset(
    id: string,
    dto: UpdateInventoryAssetDto,
    userId?: string,
    userContext?: { role?: Role; schema?: string },
  ) {
    const current = await this.findAsset(id);
    const purchaseDate =
      dto.purchaseDate !== undefined
        ? this.parseDate(dto.purchaseDate)
        : current.purchaseDate;
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

    const asset = await this.prisma().inventoryAsset.update({
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
              assignedAt: dto.assignedTo ? new Date() : null,
            }
          : {}),
        ...(dto.purchaseDate !== undefined ? { purchaseDate } : {}),
        ...(dto.purchasePrice !== undefined
          ? { purchasePrice: dto.purchasePrice }
          : {}),
        ...(dto.supplier !== undefined
          ? { supplier: this.nullable(dto.supplier) }
          : {}),
        ...(dto.invoiceNo !== undefined
          ? { invoiceNo: this.nullable(dto.invoiceNo) }
          : {}),
        ...(dto.hasWarranty !== undefined
          ? { hasWarranty: dto.hasWarranty }
          : {}),
        ...(dto.warrantyPeriod !== undefined
          ? { warrantyPeriod: dto.warrantyPeriod }
          : {}),
        ...(dto.warrantyPeriodUnit !== undefined
          ? { warrantyPeriodUnit: this.nullable(dto.warrantyPeriodUnit) }
          : {}),
        warrantyExpires: this.calculateWarrantyExpires(
          purchaseDate,
          dto.warrantyPeriod ?? current.warrantyPeriod,
          dto.warrantyPeriodUnit ?? current.warrantyPeriodUnit,
        ),
        ...(dto.notes !== undefined ? { notes: this.nullable(dto.notes) } : {}),
        updatedBy: userId,
      },
    });
    await this.logAction({
      action: 'UPDATE',
      entityType: 'ASSET',
      entityId: asset.id,
      summary: `Asset "${asset.assetTag}" updated`,
      beforeData: current,
      afterData: asset,
      userId,
    });
    return asset;
  }

  async deleteAsset(id: string, userId?: string) {
    const current = await this.findAsset(id);
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
    return deleted;
  }

  async createMovement(dto: CreateInventoryMovementDto, userId?: string) {
    const prisma = this.prisma();
    let movement: any;
    if (
      dto.movementType === InventoryMovementTypeDto.TRANSFER &&
      dto.stockBatchId
    ) {
      movement = await prisma.$transaction(async (tx: any) => {
        const batch = await tx.inventoryStockBatch.findFirst({
          where: { id: dto.stockBatchId, deletedAt: null },
        });
        if (!batch)
          throw new NotFoundException('Inventory stock batch not found');
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
      dto.movementType === InventoryMovementTypeDto.TRANSFER &&
      dto.assetId &&
      dto.toLocationId
    ) {
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

  async findMovements(query: any = {}) {
    const prisma = this.prisma();
    const { page, limit, skip } = this.pagination(query);
    const where: any = { ...this.buildDateFilter(query, 'createdAt') };
    if (query.itemId) where.itemId = query.itemId;
    if (query.movementType)
      where.movementType = { in: String(query.movementType).split(',') };
    const [items, total] = await Promise.all([
      prisma.inventoryMovement.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          movementType: true,
          quantity: true,
          referenceNo: true,
          createdAt: true,
          item: { select: { id: true, name: true, code: true } },
          fromLocation: { select: { id: true, name: true } },
          toLocation: { select: { id: true, name: true } },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      prisma.inventoryMovement.count({ where }),
    ]);
    return this.paginatedResponse(
      'Inventory movements retrieved successfully',
      items,
      total,
      page,
      limit,
    );
  }

  async findMovement(id: string) {
    const movement = await this.prisma().inventoryMovement.findFirst({
      where: { id },
      include: {
        item: true,
        asset: true,
        stockBatch: true,
        fromLocation: true,
        toLocation: true,
      },
    });
    if (!movement) throw new NotFoundException('Inventory movement not found');
    return movement;
  }

  async findAuditLogs(query: any = {}) {
    const prisma = this.prisma();
    const { page, limit, skip } = this.pagination(query);
    const where: any = { ...this.buildDateFilter(query, 'createdAt') };
    if (query.action) where.action = { in: String(query.action).split(',') };
    if (query.entityType)
      where.entityType = { in: String(query.entityType).split(',') };
    if (query.search) {
      where.OR = [
        { summary: { contains: query.search, mode: 'insensitive' } },
        { action: { contains: query.search, mode: 'insensitive' } },
        { entityType: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      prisma.inventoryAuditLog.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          summary: true,
          createdBy: true,
          createdAt: true,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      prisma.inventoryAuditLog.count({ where }),
    ]);
    return this.paginatedResponse(
      'Inventory audit logs retrieved successfully',
      items,
      total,
      page,
      limit,
    );
  }

  async createMaintenance(dto: CreateInventoryMaintenanceDto, userId?: string) {
    await this.findItem(dto.itemId);
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
    if (query.status) where.status = { in: String(query.status).split(',') };
    if (query.priority)
      where.priority = { in: String(query.priority).split(',') };
    if (query.itemId) where.itemId = query.itemId;
    const [items, total] = await Promise.all([
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
    ]);
    return this.paginatedResponse(
      'Inventory maintenances retrieved successfully',
      items,
      total,
      page,
      limit,
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
