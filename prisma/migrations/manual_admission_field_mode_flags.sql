ALTER TABLE tenant.admission_field_configs
  ADD COLUMN IF NOT EXISTS show_in_fast_mode BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS show_in_full_mode BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS required_in_fast_mode BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS required_in_full_mode BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE tenant.admission_field_configs
SET
  show_in_fast_mode = is_shown,
  show_in_full_mode = is_shown,
  required_in_fast_mode = is_required,
  required_in_full_mode = is_required
WHERE deleted_at IS NULL;
