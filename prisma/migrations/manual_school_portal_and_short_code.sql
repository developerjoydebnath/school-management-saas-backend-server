ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS school_short_code VARCHAR(10),
  ADD COLUMN IF NOT EXISTS portal_template_id VARCHAR(40) NOT NULL DEFAULT 'classic',
  ADD COLUMN IF NOT EXISTS portal_primary_color VARCHAR(20),
  ADD COLUMN IF NOT EXISTS portal_theme JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS portal_sections JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS portal_tagline VARCHAR(255),
  ADD COLUMN IF NOT EXISTS portal_about_text TEXT,
  ADD COLUMN IF NOT EXISTS portal_is_live BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS portal_published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS portal_version INTEGER NOT NULL DEFAULT 1;

UPDATE public.schools
SET school_short_code = SUBSTRING(
  COALESCE(
    NULLIF(UPPER(REGEXP_REPLACE(school_slug, '[^A-Za-z0-9]', '', 'g')), ''),
    NULLIF(UPPER(REGEXP_REPLACE(school_name, '[^A-Za-z0-9]', '', 'g')), ''),
    UPPER(REPLACE(id::text, '-', ''))
  )
  FROM 1 FOR 10
)
WHERE school_short_code IS NULL OR school_short_code = '';

WITH ranked AS (
  SELECT
    id,
    school_short_code,
    ROW_NUMBER() OVER (PARTITION BY school_short_code ORDER BY created_at, id) AS row_no
  FROM public.schools
  WHERE school_short_code IS NOT NULL
)
UPDATE public.schools AS schools
SET school_short_code = SUBSTRING(ranked.school_short_code FROM 1 FOR 6)
  || LPAD(ranked.row_no::text, 2, '0')
  || SUBSTRING(REPLACE(ranked.id::text, '-', '') FROM 1 FOR 2)
FROM ranked
WHERE schools.id = ranked.id
  AND ranked.row_no > 1;

ALTER TABLE public.schools
  ALTER COLUMN school_short_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS schools_school_short_code_key
  ON public.schools (school_short_code);
CREATE INDEX IF NOT EXISTS schools_portal_template_id_idx
  ON public.schools (portal_template_id);
CREATE INDEX IF NOT EXISTS schools_portal_is_live_idx
  ON public.schools (portal_is_live);
