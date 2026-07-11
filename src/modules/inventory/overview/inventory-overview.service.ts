import { Injectable } from '@nestjs/common';
import {
  PrismaService,
  TenantConnectionService,
} from 'src/cores/prisma.service';
import { InventorySeedService } from '../inventory-seed.service';

@Injectable()
export class InventoryOverviewService {
  constructor(
    private readonly tenantConnection: TenantConnectionService,
    private readonly prismaService: PrismaService,
    private readonly inventorySeedService: InventorySeedService,
  ) {}

  private prisma(): any {
    return this.tenantConnection.getTenantClient();
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

  private getUserDisplayName(user: any) {
    const profileName =
      `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim();
    return profileName || user.email || user.phone || user.id;
  }

  private async attachChangedByNames(items: any[]) {
    const userIds = [
      ...new Set(items.map((item) => item.createdBy).filter(Boolean)),
    ];
    if (userIds.length === 0) {
      return items.map((item) => ({ ...item, changedByName: null }));
    }

    const users = await this.prismaService.client.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        email: true,
        phone: true,
        profile: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });
    const userMap = new Map(
      users.map((user) => [user.id, this.getUserDisplayName(user)]),
    );

    return items.map((item) => ({
      ...item,
      changedByName: item.createdBy
        ? userMap.get(item.createdBy) || item.createdBy
        : null,
    }));
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const warrantyWindowEnd = this.addDays(30);
    warrantyWindowEnd.setHours(23, 59, 59, 999);

    const [
      categoryCount,
      itemCount,
      activeItemCount,
      locationCount,
      assetCount,
      assignedAssetCount,
      inStoreAssetCount,
      damagedBatchCount,
      maintenanceCount,
      urgentMaintenanceCount,
      stockTotals,
      assetStatuses,
      assetConditions,
      maintenancePriorities,
      lowStockSource,
      expiringAssetWarranties,
      expiringStockWarranties,
      recentMovements,
      openMaintenances,
      topCategoriesSource,
      topLocationsSource,
      auditLogs,
    ] = await Promise.all([
      prisma.inventoryCategory.count({ where: { deletedAt: null } }),
      prisma.inventoryItem.count({ where: { deletedAt: null } }),
      prisma.inventoryItem.count({ where: { deletedAt: null, isActive: true } }),
      prisma.inventoryLocation.count({ where: { deletedAt: null } }),
      prisma.inventoryAsset.count({ where: { deletedAt: null } }),
      prisma.inventoryAsset.count({
        where: { deletedAt: null, assignedTo: { not: null } },
      }),
      prisma.inventoryAsset.count({
        where: { deletedAt: null, status: 'IN_STORE' },
      }),
      prisma.inventoryStockBatch.count({
        where: { deletedAt: null, quantityDamaged: { gt: 0 } },
      }),
      prisma.inventoryMaintenance.count({
        where: { deletedAt: null, status: { in: ['OPEN', 'IN_PROGRESS'] } },
      }),
      prisma.inventoryMaintenance.count({
        where: {
          deletedAt: null,
          status: { in: ['OPEN', 'IN_PROGRESS'] },
          priority: { in: ['HIGH', 'URGENT'] },
        },
      }),
      prisma.inventoryStockBatch.aggregate({
        where: { deletedAt: null },
        _sum: {
          quantityTotal: true,
          quantityGood: true,
          quantityDamaged: true,
          quantityDisposed: true,
          totalCost: true,
        },
      }),
      prisma.inventoryAsset.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: { _all: true },
      }),
      prisma.inventoryAsset.groupBy({
        by: ['condition'],
        where: { deletedAt: null },
        _count: { _all: true },
      }),
      prisma.inventoryMaintenance.groupBy({
        by: ['priority'],
        where: { deletedAt: null, status: { in: ['OPEN', 'IN_PROGRESS'] } },
        _count: { _all: true },
      }),
      prisma.inventoryItem.findMany({
        where: {
          deletedAt: null,
          trackingType: 'QUANTITY',
          minimumStock: { gt: 0 },
        },
        select: {
          id: true,
          name: true,
          code: true,
          unit: true,
          minimumStock: true,
          stockBatches: {
            where: { deletedAt: null },
            select: { quantityGood: true },
          },
          category: { select: { id: true, name: true } },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      prisma.inventoryAsset.findMany({
        where: {
          deletedAt: null,
          warrantyExpires: { gte: today, lte: warrantyWindowEnd },
        },
        take: 5,
        select: {
          id: true,
          assetTag: true,
          warrantyExpires: true,
          item: { select: { id: true, name: true, code: true } },
          location: { select: { id: true, name: true } },
        },
        orderBy: [{ warrantyExpires: 'asc' }, { id: 'desc' }],
      }),
      prisma.inventoryStockBatch.findMany({
        where: {
          deletedAt: null,
          warrantyExpires: { gte: today, lte: warrantyWindowEnd },
        },
        take: 5,
        select: {
          id: true,
          warrantyExpires: true,
          item: { select: { id: true, name: true, code: true } },
          location: { select: { id: true, name: true } },
        },
        orderBy: [{ warrantyExpires: 'asc' }, { id: 'desc' }],
      }),
      prisma.inventoryMovement.findMany({
        take: 6,
        select: {
          id: true,
          movementType: true,
          quantity: true,
          createdAt: true,
          item: { select: { id: true, name: true, code: true } },
          fromLocation: { select: { id: true, name: true } },
          toLocation: { select: { id: true, name: true } },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      prisma.inventoryMaintenance.findMany({
        where: { deletedAt: null, status: { in: ['OPEN', 'IN_PROGRESS'] } },
        take: 5,
        select: {
          id: true,
          issueTitle: true,
          status: true,
          priority: true,
          reportedAt: true,
          item: { select: { id: true, name: true, code: true } },
          location: { select: { id: true, name: true } },
        },
        orderBy: [
          { priority: 'desc' },
          { reportedAt: 'desc' },
          { id: 'desc' },
        ],
      }),
      prisma.inventoryCategory.findMany({
        where: { deletedAt: null },
        take: 6,
        select: {
          id: true,
          name: true,
          iconName: true,
          colorCode: true,
          items: {
            where: { deletedAt: null },
            select: {
              id: true,
              stockBatches: {
                where: { deletedAt: null },
                select: { quantityGood: true },
              },
              assets: {
                where: { deletedAt: null },
                select: { id: true },
              },
            },
          },
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }, { id: 'desc' }],
      }),
      prisma.inventoryLocation.findMany({
        where: { deletedAt: null },
        take: 6,
        select: {
          id: true,
          name: true,
          locationType: true,
          classRoom: {
            select: { id: true, roomNo: true, building: true, floor: true },
          },
          stockBatches: {
            where: { deletedAt: null },
            select: { quantityGood: true },
          },
          assets: {
            where: { deletedAt: null },
            select: { id: true },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      prisma.inventoryAuditLog.findMany({
        take: 5,
        select: {
          id: true,
          action: true,
          entityType: true,
          summary: true,
          createdBy: true,
          createdAt: true,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    ]);

    const lowStockItems = (lowStockSource as any[])
      .map((item: any) => {
        const available = item.stockBatches.reduce(
          (sum: number, batch: any) => sum + batch.quantityGood,
          0,
        );
        return { ...item, available };
      })
      .filter((item: any) => item.available <= item.minimumStock)
      .sort((a: any, b: any) => a.available - b.available)
      .slice(0, 5);

    const totalStock =
      this.toNumber(stockTotals._sum.quantityGood) +
      this.toNumber(stockTotals._sum.quantityDamaged) +
      this.toNumber(stockTotals._sum.quantityDisposed);
    const stockHealthPercent =
      totalStock > 0
        ? Math.round((this.toNumber(stockTotals._sum.quantityGood) / totalStock) * 100)
        : 0;

    const topCategories = (topCategoriesSource as any[])
      .map((category: any) => ({
        id: category.id,
        name: category.name,
        iconName: category.iconName,
        colorCode: category.colorCode,
        itemCount: category.items.length,
        assetCount: category.items.reduce(
          (sum: number, item: any) => sum + item.assets.length,
          0,
        ),
        stockGood: category.items.reduce(
          (sum: number, item: any) =>
            sum +
            item.stockBatches.reduce(
              (batchSum: number, batch: any) => batchSum + batch.quantityGood,
              0,
            ),
          0,
        ),
      }))
      .sort(
        (a: any, b: any) =>
          b.assetCount + b.stockGood - (a.assetCount + a.stockGood),
      )
      .slice(0, 5);

    const topLocations = (topLocationsSource as any[])
      .map((location: any) => ({
        id: location.id,
        name: location.name,
        locationType: location.locationType,
        classRoom: location.classRoom,
        stockGood: location.stockBatches.reduce(
          (sum: number, batch: any) => sum + batch.quantityGood,
          0,
        ),
        assetCount: location.assets.length,
      }))
      .sort(
        (a: any, b: any) =>
          b.assetCount + b.stockGood - (a.assetCount + a.stockGood),
      )
      .slice(0, 5);

    return {
      success: true,
      statusCode: 200,
      message: 'Inventory overview retrieved successfully',
      data: {
        categoryCount,
        itemCount,
        activeItemCount,
        locationCount,
        assetCount,
        assignedAssetCount,
        inStoreAssetCount,
        damagedBatchCount,
        maintenanceCount,
        urgentMaintenanceCount,
        lowStockCount: lowStockItems.length,
        expiringWarrantyCount:
          expiringAssetWarranties.length + expiringStockWarranties.length,
        stockHealthPercent,
        totalStockValue: this.toNumber(stockTotals._sum.totalCost),
        stock: {
          total: this.toNumber(stockTotals._sum.quantityTotal),
          good: this.toNumber(stockTotals._sum.quantityGood),
          damaged: this.toNumber(stockTotals._sum.quantityDamaged),
          disposed: this.toNumber(stockTotals._sum.quantityDisposed),
          healthPercent: stockHealthPercent,
          lowStockItems,
        },
        assets: {
          statuses: (assetStatuses as any[]).map((item: any) => ({
            status: item.status,
            count: item._count._all,
          })),
          conditions: (assetConditions as any[]).map((item: any) => ({
            condition: item.condition,
            count: item._count._all,
          })),
        },
        maintenance: {
          priorities: (maintenancePriorities as any[]).map((item: any) => ({
            priority: item.priority,
            count: item._count._all,
          })),
          openItems: openMaintenances,
        },
        warranties: {
          assets: expiringAssetWarranties,
          stockBatches: expiringStockWarranties,
        },
        recentMovements,
        topCategories,
        topLocations,
        auditLogs: await this.attachChangedByNames(auditLogs),
      },
      meta: null,
    };
  }
}
