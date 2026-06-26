-- Create tenant class rooms and move class/section room ownership to room IDs.

CREATE TABLE IF NOT EXISTS tenant.class_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL,
  room_no varchar(50) NOT NULL,
  capacity integer NOT NULL,
  floor varchar(50),
  building varchar(100),
  high_bench integer NOT NULL DEFAULT 0,
  low_bench integer NOT NULL DEFAULT 0,
  chair integer NOT NULL DEFAULT 0,
  "table" integer NOT NULL DEFAULT 0,
  board integer NOT NULL DEFAULT 0,
  projector integer NOT NULL DEFAULT 0,
  fan integer NOT NULL DEFAULT 0,
  light integer NOT NULL DEFAULT 0,
  has_ac boolean NOT NULL DEFAULT false,
  has_cctv boolean NOT NULL DEFAULT false,
  status varchar(50) NOT NULL DEFAULT 'ACTIVE',
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid
);

CREATE INDEX IF NOT EXISTS class_rooms_room_no_idx ON tenant.class_rooms(room_no);
CREATE INDEX IF NOT EXISTS class_rooms_status_idx ON tenant.class_rooms(status);
CREATE INDEX IF NOT EXISTS class_rooms_deleted_at_idx ON tenant.class_rooms(deleted_at);
CREATE UNIQUE INDEX IF NOT EXISTS class_rooms_room_no_active_unique
  ON tenant.class_rooms(lower(room_no))
  WHERE deleted_at IS NULL;

INSERT INTO tenant.class_rooms (name, room_no, capacity, status)
SELECT DISTINCT
  COALESCE(NULLIF(room_number, ''), 'Room') AS name,
  COALESCE(NULLIF(room_number, ''), 'ROOM-' || left(id::text, 8)) AS room_no,
  COALESCE(capacity, 1) AS capacity,
  'ACTIVE'
FROM tenant.classes c
WHERE c.deleted_at IS NULL
  AND c.room_number IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM tenant.class_rooms cr
    WHERE lower(cr.room_no) = lower(COALESCE(NULLIF(c.room_number, ''), 'ROOM-' || left(c.id::text, 8)))
      AND cr.deleted_at IS NULL
  );

INSERT INTO tenant.class_rooms (name, room_no, capacity, status)
SELECT DISTINCT
  COALESCE(NULLIF(room_number, ''), 'Room') AS name,
  COALESCE(NULLIF(room_number, ''), 'ROOM-' || left(id::text, 8)) AS room_no,
  COALESCE(capacity, 1) AS capacity,
  'ACTIVE'
FROM tenant.sections s
WHERE s.deleted_at IS NULL
  AND s.room_number IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM tenant.class_rooms cr
    WHERE lower(cr.room_no) = lower(COALESCE(NULLIF(s.room_number, ''), 'ROOM-' || left(s.id::text, 8)))
      AND cr.deleted_at IS NULL
  );

ALTER TABLE tenant.classes
  ADD COLUMN IF NOT EXISTS class_room_id uuid;

ALTER TABLE tenant.sections
  ADD COLUMN IF NOT EXISTS class_room_id uuid;

UPDATE tenant.classes c
SET class_room_id = cr.id
FROM tenant.class_rooms cr
WHERE c.room_number IS NOT NULL
  AND lower(cr.room_no) = lower(c.room_number)
  AND c.class_room_id IS NULL
  AND cr.deleted_at IS NULL;

UPDATE tenant.sections s
SET class_room_id = cr.id
FROM tenant.class_rooms cr
WHERE s.room_number IS NOT NULL
  AND lower(cr.room_no) = lower(s.room_number)
  AND s.class_room_id IS NULL
  AND cr.deleted_at IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'classes_class_room_id_fkey'
  ) THEN
    ALTER TABLE tenant.classes
      ADD CONSTRAINT classes_class_room_id_fkey
      FOREIGN KEY (class_room_id)
      REFERENCES tenant.class_rooms(id)
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sections_class_room_id_fkey'
  ) THEN
    ALTER TABLE tenant.sections
      ADD CONSTRAINT sections_class_room_id_fkey
      FOREIGN KEY (class_room_id)
      REFERENCES tenant.class_rooms(id)
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS classes_class_room_id_idx ON tenant.classes(class_room_id);
CREATE INDEX IF NOT EXISTS sections_class_room_id_idx ON tenant.sections(class_room_id);

ALTER TABLE tenant.classes DROP COLUMN IF EXISTS capacity;
ALTER TABLE tenant.classes DROP COLUMN IF EXISTS room_number;
ALTER TABLE tenant.sections DROP COLUMN IF EXISTS capacity;
ALTER TABLE tenant.sections DROP COLUMN IF EXISTS room_number;
