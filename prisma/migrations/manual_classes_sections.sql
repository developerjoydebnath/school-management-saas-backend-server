-- Create tenant academic classes and sections.
-- Classes may either store default room/capacity/shift directly, or own multiple
-- section rows when the class is split into sections.

CREATE TABLE IF NOT EXISTS tenant.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  en_name varchar(255) NOT NULL,
  bn_name varchar(255),
  capacity integer,
  room_number varchar(50),
  shift_id uuid,
  status varchar(50) NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid,
  CONSTRAINT classes_shift_id_fkey
    FOREIGN KEY (shift_id)
    REFERENCES tenant.shifts(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS tenant.sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL,
  name varchar(100) NOT NULL,
  capacity integer NOT NULL,
  room_number varchar(50) NOT NULL,
  shift_id uuid NOT NULL,
  status varchar(50) NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid,
  CONSTRAINT sections_class_id_fkey
    FOREIGN KEY (class_id)
    REFERENCES tenant.classes(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT sections_shift_id_fkey
    FOREIGN KEY (shift_id)
    REFERENCES tenant.shifts(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS classes_shift_id_idx
  ON tenant.classes(shift_id);

CREATE INDEX IF NOT EXISTS classes_status_idx
  ON tenant.classes(status);

CREATE INDEX IF NOT EXISTS classes_deleted_at_idx
  ON tenant.classes(deleted_at);

CREATE INDEX IF NOT EXISTS sections_class_id_idx
  ON tenant.sections(class_id);

CREATE INDEX IF NOT EXISTS sections_class_id_name_idx
  ON tenant.sections(class_id, name);

CREATE INDEX IF NOT EXISTS sections_shift_id_idx
  ON tenant.sections(shift_id);

CREATE INDEX IF NOT EXISTS sections_status_idx
  ON tenant.sections(status);

CREATE INDEX IF NOT EXISTS sections_deleted_at_idx
  ON tenant.sections(deleted_at);

CREATE UNIQUE INDEX IF NOT EXISTS classes_en_name_active_unique
  ON tenant.classes(lower(en_name))
  WHERE deleted_at IS NULL;
