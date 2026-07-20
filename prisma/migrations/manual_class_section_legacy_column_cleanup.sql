-- Removes legacy assignment columns from Class and Section master tables.
-- Room, shift, capacity, and class-section availability now belong to session_class_sections.
-- Run after manual_session_class_sections.sql and manual_sections_master_refactor.sql.

DO $$
DECLARE
  target_schema text;
BEGIN
  FOR target_schema IN
    SELECT table_schema
    FROM information_schema.tables
    WHERE table_name IN ('classes', 'sections')
      AND table_schema NOT IN ('pg_catalog', 'information_schema', 'public')
    GROUP BY table_schema
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = target_schema
        AND table_name = 'classes'
    ) THEN
      EXECUTE format('ALTER TABLE %I.classes DROP COLUMN IF EXISTS class_room_id', target_schema);
      EXECUTE format('ALTER TABLE %I.classes DROP COLUMN IF EXISTS shift_id', target_schema);
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = target_schema
        AND table_name = 'sections'
    ) THEN
      EXECUTE format('DROP INDEX IF EXISTS %I.sections_class_id_idx', target_schema);
      EXECUTE format('DROP INDEX IF EXISTS %I.sections_class_room_id_idx', target_schema);
      EXECUTE format('DROP INDEX IF EXISTS %I.sections_shift_id_idx', target_schema);
      EXECUTE format('DROP INDEX IF EXISTS %I.sections_master_name_unique_idx', target_schema);

      EXECUTE format('ALTER TABLE %I.sections DROP COLUMN IF EXISTS class_id', target_schema);
      EXECUTE format('ALTER TABLE %I.sections DROP COLUMN IF EXISTS class_room_id', target_schema);
      EXECUTE format('ALTER TABLE %I.sections DROP COLUMN IF EXISTS shift_id', target_schema);

      EXECUTE format(
        'CREATE UNIQUE INDEX IF NOT EXISTS sections_master_name_unique_idx ON %I.sections (lower(name)) WHERE deleted_at IS NULL',
        target_schema
      );
    END IF;
  END LOOP;
END $$;
