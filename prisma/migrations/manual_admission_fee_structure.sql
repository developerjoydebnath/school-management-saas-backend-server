-- Admission fee structure for session-wise admission settings.
-- Existing admission settings/data remain unchanged. New rows use PostgreSQL 18 uuidv7().

CREATE TABLE IF NOT EXISTS tenant.admission_fee_heads (
  id UUID PRIMARY KEY DEFAULT uuidv7(),
  settings_id UUID NOT NULL,
  name VARCHAR(120) NOT NULL,
  name_bn VARCHAR(120),
  code VARCHAR(60) NOT NULL,
  type VARCHAR(30) NOT NULL DEFAULT 'one_time',
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_shown BOOLEAN NOT NULL DEFAULT true,
  is_required BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  CONSTRAINT admission_fee_heads_settings_id_fkey
    FOREIGN KEY (settings_id)
    REFERENCES tenant.admission_settings(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT admission_fee_heads_settings_id_code_key UNIQUE (settings_id, code)
);

CREATE TABLE IF NOT EXISTS tenant.admission_fee_head_class_amounts (
  id UUID PRIMARY KEY DEFAULT uuidv7(),
  fee_head_id UUID NOT NULL,
  class_id UUID NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  CONSTRAINT admission_fee_head_class_amounts_fee_head_id_fkey
    FOREIGN KEY (fee_head_id)
    REFERENCES tenant.admission_fee_heads(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT admission_fee_head_class_amounts_class_id_fkey
    FOREIGN KEY (class_id)
    REFERENCES tenant.classes(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT admission_fee_head_class_amounts_fee_head_id_class_id_key
    UNIQUE (fee_head_id, class_id)
);

CREATE INDEX IF NOT EXISTS admission_fee_heads_settings_id_idx
  ON tenant.admission_fee_heads(settings_id);
CREATE INDEX IF NOT EXISTS admission_fee_heads_settings_id_is_shown_idx
  ON tenant.admission_fee_heads(settings_id, is_shown);
CREATE INDEX IF NOT EXISTS admission_fee_heads_settings_id_is_required_idx
  ON tenant.admission_fee_heads(settings_id, is_required);
CREATE INDEX IF NOT EXISTS admission_fee_heads_deleted_at_idx
  ON tenant.admission_fee_heads(deleted_at);
CREATE INDEX IF NOT EXISTS admission_fee_head_class_amounts_class_id_idx
  ON tenant.admission_fee_head_class_amounts(class_id);
CREATE INDEX IF NOT EXISTS admission_fee_head_class_amounts_deleted_at_idx
  ON tenant.admission_fee_head_class_amounts(deleted_at);
