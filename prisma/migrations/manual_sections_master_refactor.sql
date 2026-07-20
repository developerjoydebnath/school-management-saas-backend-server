-- Run this against the application database after deploying the Section master refactor.
-- It updates every tenant-like schema that has a `sections` table.

DO $$
DECLARE
  tenant_schema text;
BEGIN
  FOR tenant_schema IN
    SELECT table_schema
    FROM information_schema.tables
    WHERE table_name = 'sections'
      AND table_schema NOT IN ('pg_catalog', 'information_schema')
  LOOP
    EXECUTE format('ALTER TABLE %I.sections ADD COLUMN IF NOT EXISTS bn_name varchar(100)', tenant_schema);
    EXECUTE format('ALTER TABLE %I.sections ADD COLUMN IF NOT EXISTS code varchar(50)', tenant_schema);
    EXECUTE format('ALTER TABLE %I.sections ADD COLUMN IF NOT EXISTS class_room_id uuid', tenant_schema);
    EXECUTE format('ALTER TABLE %I.sections ADD COLUMN IF NOT EXISTS shift_id uuid', tenant_schema);
    EXECUTE format('ALTER TABLE %I.sections ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0', tenant_schema);
    EXECUTE format('ALTER TABLE %I.sections ADD COLUMN IF NOT EXISTS status varchar(50) NOT NULL DEFAULT ''ACTIVE''', tenant_schema);
    EXECUTE format('ALTER TABLE %I.sections ADD COLUMN IF NOT EXISTS deleted_at timestamptz', tenant_schema);
    EXECUTE format('ALTER TABLE %I.sections ADD COLUMN IF NOT EXISTS deleted_by uuid', tenant_schema);

    EXECUTE format('ALTER TABLE %I.sections ALTER COLUMN class_id DROP NOT NULL', tenant_schema);
    EXECUTE format('ALTER TABLE %I.sections ALTER COLUMN class_room_id DROP NOT NULL', tenant_schema);
    EXECUTE format('ALTER TABLE %I.sections ALTER COLUMN shift_id DROP NOT NULL', tenant_schema);

    EXECUTE format('CREATE INDEX IF NOT EXISTS sections_code_idx ON %I.sections (code)', tenant_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS sections_sort_order_idx ON %I.sections (sort_order)', tenant_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS sections_status_idx ON %I.sections (status)', tenant_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS sections_deleted_at_idx ON %I.sections (deleted_at)', tenant_schema);
    EXECUTE format(
      'CREATE UNIQUE INDEX IF NOT EXISTS sections_master_name_unique_idx ON %I.sections (lower(name)) WHERE class_id IS NULL AND deleted_at IS NULL',
      tenant_schema
    );
  END LOOP;
END $$;
