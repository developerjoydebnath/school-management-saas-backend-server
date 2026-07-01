-- Create tenant class timetables and save-history snapshots.
-- A timetable is stored per academic session + class + optional section.
-- Every save writes the current timetable state into timetable_histories.

CREATE TABLE IF NOT EXISTS tenant.timetables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  class_id uuid NOT NULL,
  section_id uuid,
  title varchar(255),
  days jsonb NOT NULL,
  columns jsonb NOT NULL,
  cells jsonb NOT NULL,
  version integer NOT NULL DEFAULT 1,
  status varchar(50) NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid,
  CONSTRAINT timetables_class_id_fkey
    FOREIGN KEY (class_id)
    REFERENCES tenant.classes(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT timetables_section_id_fkey
    FOREIGN KEY (section_id)
    REFERENCES tenant.sections(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS tenant.timetable_histories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timetable_id uuid NOT NULL,
  session_id uuid NOT NULL,
  class_id uuid NOT NULL,
  section_id uuid,
  title varchar(255),
  days jsonb NOT NULL,
  columns jsonb NOT NULL,
  cells jsonb NOT NULL,
  version integer NOT NULL,
  change_type varchar(50) NOT NULL DEFAULT 'SAVE',
  saved_by uuid,
  saved_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT timetable_histories_timetable_id_fkey
    FOREIGN KEY (timetable_id)
    REFERENCES tenant.timetables(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS timetables_session_id_idx
  ON tenant.timetables(session_id);

CREATE INDEX IF NOT EXISTS timetables_class_id_idx
  ON tenant.timetables(class_id);

CREATE INDEX IF NOT EXISTS timetables_section_id_idx
  ON tenant.timetables(section_id);

CREATE INDEX IF NOT EXISTS timetables_session_class_section_idx
  ON tenant.timetables(session_id, class_id, section_id);

CREATE INDEX IF NOT EXISTS timetables_status_idx
  ON tenant.timetables(status);

CREATE INDEX IF NOT EXISTS timetables_deleted_at_idx
  ON tenant.timetables(deleted_at);

CREATE UNIQUE INDEX IF NOT EXISTS timetables_class_level_active_unique
  ON tenant.timetables(session_id, class_id)
  WHERE section_id IS NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS timetables_section_level_active_unique
  ON tenant.timetables(session_id, class_id, section_id)
  WHERE section_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS timetable_histories_timetable_id_idx
  ON tenant.timetable_histories(timetable_id);

CREATE INDEX IF NOT EXISTS timetable_histories_session_class_section_idx
  ON tenant.timetable_histories(session_id, class_id, section_id);

CREATE INDEX IF NOT EXISTS timetable_histories_saved_at_idx
  ON tenant.timetable_histories(saved_at);

