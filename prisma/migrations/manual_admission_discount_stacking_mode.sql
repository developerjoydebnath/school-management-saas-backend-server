ALTER TABLE admission_settings
  ADD COLUMN IF NOT EXISTS discount_stacking_mode VARCHAR(20) NOT NULL DEFAULT 'stack_all';
