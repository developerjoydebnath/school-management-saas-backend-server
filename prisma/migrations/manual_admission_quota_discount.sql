ALTER TABLE tenant.admission_settings
ADD COLUMN IF NOT EXISTS quota_discount_enabled BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS quota_discount_rules JSONB NOT NULL DEFAULT '[]'::jsonb;
