import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/cores/prisma.service';
import {
  INVENTORY_SEED_CATEGORIES,
  INVENTORY_SEED_ITEMS,
} from './inventory.seed-data';

@Injectable()
export class InventorySeedService {
  private readonly logger = new Logger(InventorySeedService.name);

  constructor(private readonly prisma: PrismaService) {}

  async seedTenantSchema(schema: string, tx?: any) {
    const client = tx || this.prisma;

    const tableExists = (await client.$queryRawUnsafe(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = $1 AND table_name = 'inventory_categories'
      ) AS exists`,
      schema,
    )) as { exists: boolean }[];

    if (!tableExists[0]?.exists) {
      this.logger.warn(`Inventory tables not found in schema "${schema}". Seed skipped.`);
      return;
    }

    for (const category of INVENTORY_SEED_CATEGORIES) {
      await client.$executeRawUnsafe(
        `INSERT INTO "${schema}".inventory_categories
          (name, name_bn, slug, icon_name, color_code, is_system, is_active, sort_order)
         VALUES ($1, $2, $3, $4, $5, true, true, $6)
         ON CONFLICT (slug) DO UPDATE SET
          name = EXCLUDED.name,
          name_bn = EXCLUDED.name_bn,
          icon_name = EXCLUDED.icon_name,
          color_code = EXCLUDED.color_code,
          is_system = true,
          updated_at = now()`,
        category.name,
        category.nameBn,
        category.slug,
        category.iconName,
        category.colorCode,
        category.sortOrder,
      );
    }

    const categories = (await client.$queryRawUnsafe(
      `SELECT id::text, slug FROM "${schema}".inventory_categories WHERE deleted_at IS NULL`,
    )) as { id: string; slug: string }[];
    const categoryMap = new Map(
      categories.map((category: { id: string; slug: string }) => [
        category.slug,
        category.id,
      ]),
    );

    for (const item of INVENTORY_SEED_ITEMS) {
      const categoryId = categoryMap.get(item.categorySlug);
      if (!categoryId) continue;

      await client.$executeRawUnsafe(
        `INSERT INTO "${schema}".inventory_items
          (
            category_id, name, code, tracking_type, unit, seating_capacity,
            is_seating_item, is_depreciable, minimum_stock
          )
         VALUES ($1::uuid, $2, $3, $4::"${schema}"."InventoryTrackingType", $5, $6, $7, $8, $9)
         ON CONFLICT (code) DO UPDATE SET
          category_id = EXCLUDED.category_id,
          name = EXCLUDED.name,
          tracking_type = EXCLUDED.tracking_type,
          unit = EXCLUDED.unit,
          seating_capacity = EXCLUDED.seating_capacity,
          is_seating_item = EXCLUDED.is_seating_item,
          is_depreciable = EXCLUDED.is_depreciable,
          minimum_stock = EXCLUDED.minimum_stock,
          updated_at = now()`,
        categoryId,
        item.name,
        item.code,
        item.trackingType || 'QUANTITY',
        item.unit || 'piece',
        item.seatingCapacity || null,
        item.isSeatingItem || false,
        item.isDepreciable || false,
        item.minimumStock || 0,
      );
    }

    await client.$executeRawUnsafe(
      `INSERT INTO "${schema}".inventory_locations
        (location_type, name, code, status)
       VALUES ('STORE'::"${schema}"."InventoryLocationType", 'Central Store', 'CENTRAL-STORE', 'ACTIVE')
       ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        status = 'ACTIVE',
        updated_at = now()`,
    );
  }
}
