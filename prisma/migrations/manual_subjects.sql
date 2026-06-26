DO $$
BEGIN
  CREATE TYPE tenant."SubjectType" AS ENUM (
    'MANDATORY',
    'OPTIONAL',
    'PRACTICAL',
    'FOURTH_SUBJECT',
    'RELIGION',
    'GROUP_BASED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS tenant.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  en_name varchar(255) NOT NULL,
  bn_name varchar(255),
  code varchar(50),
  board_code varchar(50),
  type tenant."SubjectType" NOT NULL DEFAULT 'MANDATORY',
  "group" varchar(50),
  paper_count integer NOT NULL DEFAULT 1,
  full_marks integer NOT NULL DEFAULT 100,
  pass_marks integer NOT NULL DEFAULT 33,
  practical_marks integer,
  theory_marks integer,
  sort_order integer NOT NULL DEFAULT 0,
  status varchar(50) NOT NULL DEFAULT 'ACTIVE',
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid
);

ALTER TABLE tenant.subjects ADD COLUMN IF NOT EXISTS en_name varchar(255);
ALTER TABLE tenant.subjects ADD COLUMN IF NOT EXISTS bn_name varchar(255);
ALTER TABLE tenant.subjects ADD COLUMN IF NOT EXISTS code varchar(50);
ALTER TABLE tenant.subjects ADD COLUMN IF NOT EXISTS board_code varchar(50);
ALTER TABLE tenant.subjects ADD COLUMN IF NOT EXISTS type tenant."SubjectType" NOT NULL DEFAULT 'MANDATORY';
ALTER TABLE tenant.subjects ADD COLUMN IF NOT EXISTS "group" varchar(50);
ALTER TABLE tenant.subjects ADD COLUMN IF NOT EXISTS paper_count integer NOT NULL DEFAULT 1;
ALTER TABLE tenant.subjects ADD COLUMN IF NOT EXISTS full_marks integer NOT NULL DEFAULT 100;
ALTER TABLE tenant.subjects ADD COLUMN IF NOT EXISTS pass_marks integer NOT NULL DEFAULT 33;
ALTER TABLE tenant.subjects ADD COLUMN IF NOT EXISTS practical_marks integer;
ALTER TABLE tenant.subjects ADD COLUMN IF NOT EXISTS theory_marks integer;
ALTER TABLE tenant.subjects ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
ALTER TABLE tenant.subjects ADD COLUMN IF NOT EXISTS status varchar(50) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE tenant.subjects ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE tenant.subjects ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE tenant.subjects ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE tenant.subjects ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE tenant.subjects ADD COLUMN IF NOT EXISTS deleted_by uuid;

UPDATE tenant.subjects
SET en_name = COALESCE(en_name, code, 'Untitled Subject')
WHERE en_name IS NULL;

ALTER TABLE tenant.subjects ALTER COLUMN en_name SET NOT NULL;

CREATE TABLE IF NOT EXISTS tenant.subject_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES tenant.subjects(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES tenant.classes(id) ON DELETE RESTRICT,
  CONSTRAINT subject_classes_subject_id_class_id_key UNIQUE (subject_id, class_id)
);

CREATE INDEX IF NOT EXISTS subjects_code_idx ON tenant.subjects(code);
CREATE INDEX IF NOT EXISTS subjects_type_idx ON tenant.subjects(type);
CREATE INDEX IF NOT EXISTS subjects_group_idx ON tenant.subjects("group");
CREATE INDEX IF NOT EXISTS subjects_status_idx ON tenant.subjects(status);
CREATE INDEX IF NOT EXISTS subjects_deleted_at_idx ON tenant.subjects(deleted_at);
CREATE UNIQUE INDEX IF NOT EXISTS subjects_code_active_unique_idx
  ON tenant.subjects (lower(code))
  WHERE code IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS subject_classes_subject_id_idx ON tenant.subject_classes(subject_id);
CREATE INDEX IF NOT EXISTS subject_classes_class_id_idx ON tenant.subject_classes(class_id);
