ALTER TABLE tenant.admission_settings
  ADD COLUMN IF NOT EXISTS draft_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS discount_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20) NOT NULL DEFAULT 'fixed_amount',
  ADD COLUMN IF NOT EXISTS discount_scope VARCHAR(30) NOT NULL DEFAULT 'required_total',
  ADD COLUMN IF NOT EXISTS discount_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_max_amount NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS manual_discount_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS reference_enabled BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE tenant.admission_applications
  ADD COLUMN IF NOT EXISTS admission_fee_subtotal NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS admission_discount_amount NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS admission_payable_amount NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20),
  ADD COLUMN IF NOT EXISTS discount_scope VARCHAR(30),
  ADD COLUMN IF NOT EXISTS discount_value NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS discount_source VARCHAR(20),
  ADD COLUMN IF NOT EXISTS discount_reason VARCHAR(255),
  ADD COLUMN IF NOT EXISTS reference_user_id UUID,
  ADD COLUMN IF NOT EXISTS reference_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS reference_mobile VARCHAR(20);

ALTER TABLE tenant.students
  ADD COLUMN IF NOT EXISTS admission_fee_subtotal NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS admission_discount_amount NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS admission_payable_amount NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20),
  ADD COLUMN IF NOT EXISTS discount_scope VARCHAR(30),
  ADD COLUMN IF NOT EXISTS discount_value NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS discount_source VARCHAR(20),
  ADD COLUMN IF NOT EXISTS discount_reason VARCHAR(255),
  ADD COLUMN IF NOT EXISTS reference_user_id UUID,
  ADD COLUMN IF NOT EXISTS reference_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS reference_mobile VARCHAR(20);

CREATE INDEX IF NOT EXISTS admission_applications_reference_mobile_idx
  ON tenant.admission_applications(reference_mobile);

CREATE INDEX IF NOT EXISTS students_reference_mobile_idx
  ON tenant.students(reference_mobile);
