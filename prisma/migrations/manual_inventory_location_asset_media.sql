-- Inventory location cleanup and asset image support.
-- Patches every schema that already owns inventory tables. This matters because
-- active schools use cloned tenant schemas, not only Prisma's placeholder schema.

DO $$
DECLARE
  target_schema text;
BEGIN
  FOR target_schema IN
    SELECT table_schema
    FROM information_schema.tables
    WHERE table_name = 'inventory_assets'
      AND table_schema NOT IN ('pg_catalog', 'information_schema')
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.inventory_locations
         DROP COLUMN IF EXISTS building,
         DROP COLUMN IF EXISTS floor,
         DROP COLUMN IF EXISTS room_no',
      target_schema
    );

    EXECUTE format(
      'ALTER TABLE %I.inventory_assets
         ADD COLUMN IF NOT EXISTS image_url VARCHAR(500),
         ADD COLUMN IF NOT EXISTS image_placeholder TEXT',
      target_schema
    );
  END LOOP;
END $$;
