-- Session-specific class section availability.
-- Applies to every tenant-like schema that already has classes and sections.

DO $$
DECLARE
  target_schema text;
  has_sections boolean;
  has_shifts boolean;
  has_rooms boolean;
BEGIN
  FOR target_schema IN
    SELECT table_schema
    FROM information_schema.tables
    WHERE table_name = 'classes'
      AND table_schema NOT IN ('pg_catalog', 'information_schema', 'public')
  LOOP
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = target_schema
        AND table_name = 'sections'
    ) INTO has_sections;

    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = target_schema
        AND table_name = 'shifts'
    ) INTO has_shifts;

    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = target_schema
        AND table_name = 'class_rooms'
    ) INTO has_rooms;

    EXECUTE format($sql$
      CREATE TABLE IF NOT EXISTS %I.session_class_sections (
        id uuid PRIMARY KEY DEFAULT uuidv7(),
        session_id uuid NOT NULL,
        class_id uuid NOT NULL,
        section_id uuid,
        capacity integer,
        shift_id uuid,
        room_id uuid,
        status varchar(50) NOT NULL DEFAULT 'ACTIVE',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        deleted_by uuid,
        CONSTRAINT session_class_sections_class_id_fkey
          FOREIGN KEY (class_id)
          REFERENCES %I.classes(id)
          ON DELETE CASCADE
          ON UPDATE CASCADE
      )
    $sql$, target_schema, target_schema);

    IF has_sections THEN
      EXECUTE format($sql$
        DO $constraint$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM information_schema.table_constraints
            WHERE constraint_schema = %L
              AND table_name = 'session_class_sections'
              AND constraint_name = 'session_class_sections_section_id_fkey'
          ) THEN
            ALTER TABLE %I.session_class_sections
            ADD CONSTRAINT session_class_sections_section_id_fkey
            FOREIGN KEY (section_id)
            REFERENCES %I.sections(id)
            ON DELETE CASCADE
            ON UPDATE CASCADE;
          END IF;
        END
        $constraint$
      $sql$, target_schema, target_schema, target_schema);
    END IF;

    IF has_shifts THEN
      EXECUTE format($sql$
        DO $constraint$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM information_schema.table_constraints
            WHERE constraint_schema = %L
              AND table_name = 'session_class_sections'
              AND constraint_name = 'session_class_sections_shift_id_fkey'
          ) THEN
            ALTER TABLE %I.session_class_sections
            ADD CONSTRAINT session_class_sections_shift_id_fkey
            FOREIGN KEY (shift_id)
            REFERENCES %I.shifts(id)
            ON DELETE SET NULL
            ON UPDATE CASCADE;
          END IF;
        END
        $constraint$
      $sql$, target_schema, target_schema, target_schema);
    END IF;

    IF has_rooms THEN
      EXECUTE format($sql$
        DO $constraint$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM information_schema.table_constraints
            WHERE constraint_schema = %L
              AND table_name = 'session_class_sections'
              AND constraint_name = 'session_class_sections_room_id_fkey'
          ) THEN
            ALTER TABLE %I.session_class_sections
            ADD CONSTRAINT session_class_sections_room_id_fkey
            FOREIGN KEY (room_id)
            REFERENCES %I.class_rooms(id)
            ON DELETE SET NULL
            ON UPDATE CASCADE;
          END IF;
        END
        $constraint$
      $sql$, target_schema, target_schema, target_schema);
    END IF;

    EXECUTE format('CREATE INDEX IF NOT EXISTS session_class_sections_session_id_idx ON %I.session_class_sections(session_id)', target_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS session_class_sections_class_id_idx ON %I.session_class_sections(class_id)', target_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS session_class_sections_section_id_idx ON %I.session_class_sections(section_id)', target_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS session_class_sections_shift_id_idx ON %I.session_class_sections(shift_id)', target_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS session_class_sections_room_id_idx ON %I.session_class_sections(room_id)', target_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS session_class_sections_status_idx ON %I.session_class_sections(status)', target_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS session_class_sections_deleted_at_idx ON %I.session_class_sections(deleted_at)', target_schema);
    EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS session_class_sections_section_unique ON %I.session_class_sections(session_id, class_id, section_id) WHERE section_id IS NOT NULL AND deleted_at IS NULL', target_schema);
    EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS session_class_sections_class_level_unique ON %I.session_class_sections(session_id, class_id) WHERE section_id IS NULL AND deleted_at IS NULL', target_schema);
  END LOOP;
END $$;
