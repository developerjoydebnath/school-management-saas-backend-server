-- Public portal shell config lives in public.schools because host resolution
-- must happen before a tenant schema can be selected.
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS portal_template_id VARCHAR(40) NOT NULL DEFAULT 'classic',
  ADD COLUMN IF NOT EXISTS portal_primary_color VARCHAR(20),
  ADD COLUMN IF NOT EXISTS portal_theme JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS portal_sections JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS portal_tagline VARCHAR(255),
  ADD COLUMN IF NOT EXISTS portal_about_text TEXT,
  ADD COLUMN IF NOT EXISTS portal_is_live BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS portal_published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS portal_version INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS schools_portal_is_live_idx
  ON public.schools (portal_is_live);

CREATE INDEX IF NOT EXISTS schools_portal_template_id_idx
  ON public.schools (portal_template_id);

-- Run the tenant table block for tenant_template and every activated school
-- schema. It is written as dynamic SQL so the migration can be applied once.
DO $$
DECLARE
  target_schema text;
BEGIN
  FOR target_schema IN
    SELECT schema_name
    FROM information_schema.schemata
    WHERE schema_name = 'tenant_template'
       OR (
         schema_name NOT IN ('public', 'information_schema')
         AND schema_name NOT LIKE 'pg_%'
       )
  LOOP
    EXECUTE format('
      CREATE TABLE IF NOT EXISTS %I.public_portal_pages (
        id UUID PRIMARY KEY DEFAULT uuidv7(),
        slug VARCHAR(120) NOT NULL UNIQUE,
        title VARCHAR(255) NOT NULL,
        title_bn VARCHAR(255),
        excerpt VARCHAR(500),
        content JSONB NOT NULL DEFAULT ''{}''::jsonb,
        status VARCHAR(30) NOT NULL DEFAULT ''draft'',
        sort_order INTEGER NOT NULL DEFAULT 0,
        published_at TIMESTAMPTZ,
        created_by UUID,
        updated_by UUID,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        deleted_at TIMESTAMPTZ,
        deleted_by UUID
      )', target_schema);

    EXECUTE format('CREATE INDEX IF NOT EXISTS public_portal_pages_status_idx ON %I.public_portal_pages (status)', target_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS public_portal_pages_published_at_idx ON %I.public_portal_pages (published_at)', target_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS public_portal_pages_deleted_at_idx ON %I.public_portal_pages (deleted_at)', target_schema);

    EXECUTE format('
      CREATE TABLE IF NOT EXISTS %I.public_portal_notices (
        id UUID PRIMARY KEY DEFAULT uuidv7(),
        title VARCHAR(255) NOT NULL,
        title_bn VARCHAR(255),
        content TEXT,
        status VARCHAR(30) NOT NULL DEFAULT ''draft'',
        is_pinned BOOLEAN NOT NULL DEFAULT false,
        sort_order INTEGER NOT NULL DEFAULT 0,
        published_at TIMESTAMPTZ,
        expires_at TIMESTAMPTZ,
        created_by UUID,
        updated_by UUID,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        deleted_at TIMESTAMPTZ,
        deleted_by UUID
      )', target_schema);

    EXECUTE format('CREATE INDEX IF NOT EXISTS public_portal_notices_status_idx ON %I.public_portal_notices (status)', target_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS public_portal_notices_is_pinned_idx ON %I.public_portal_notices (is_pinned)', target_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS public_portal_notices_published_at_idx ON %I.public_portal_notices (published_at)', target_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS public_portal_notices_expires_at_idx ON %I.public_portal_notices (expires_at)', target_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS public_portal_notices_deleted_at_idx ON %I.public_portal_notices (deleted_at)', target_schema);

    EXECUTE format('
      CREATE TABLE IF NOT EXISTS %I.public_portal_events (
        id UUID PRIMARY KEY DEFAULT uuidv7(),
        title VARCHAR(255) NOT NULL,
        title_bn VARCHAR(255),
        description TEXT,
        location VARCHAR(255),
        start_at TIMESTAMPTZ NOT NULL,
        end_at TIMESTAMPTZ,
        image_url VARCHAR(500),
        image_placeholder TEXT,
        status VARCHAR(30) NOT NULL DEFAULT ''draft'',
        is_featured BOOLEAN NOT NULL DEFAULT false,
        sort_order INTEGER NOT NULL DEFAULT 0,
        published_at TIMESTAMPTZ,
        created_by UUID,
        updated_by UUID,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        deleted_at TIMESTAMPTZ,
        deleted_by UUID
      )', target_schema);

    EXECUTE format('CREATE INDEX IF NOT EXISTS public_portal_events_status_idx ON %I.public_portal_events (status)', target_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS public_portal_events_start_at_idx ON %I.public_portal_events (start_at)', target_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS public_portal_events_is_featured_idx ON %I.public_portal_events (is_featured)', target_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS public_portal_events_published_at_idx ON %I.public_portal_events (published_at)', target_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS public_portal_events_deleted_at_idx ON %I.public_portal_events (deleted_at)', target_schema);

    EXECUTE format('
      CREATE TABLE IF NOT EXISTS %I.public_portal_gallery_items (
        id UUID PRIMARY KEY DEFAULT uuidv7(),
        title VARCHAR(255),
        title_bn VARCHAR(255),
        image_url VARCHAR(500) NOT NULL,
        image_placeholder TEXT,
        caption VARCHAR(500),
        status VARCHAR(30) NOT NULL DEFAULT ''draft'',
        sort_order INTEGER NOT NULL DEFAULT 0,
        published_at TIMESTAMPTZ,
        created_by UUID,
        updated_by UUID,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        deleted_at TIMESTAMPTZ,
        deleted_by UUID
      )', target_schema);

    EXECUTE format('CREATE INDEX IF NOT EXISTS public_portal_gallery_items_status_idx ON %I.public_portal_gallery_items (status)', target_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS public_portal_gallery_items_published_at_idx ON %I.public_portal_gallery_items (published_at)', target_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS public_portal_gallery_items_deleted_at_idx ON %I.public_portal_gallery_items (deleted_at)', target_schema);
  END LOOP;
END $$;
