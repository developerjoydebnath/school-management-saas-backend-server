-- Adds student email support across admission, student, and user profile data.
-- Safe to run repeatedly. Applies to public.user_profiles and every tenant
-- schema that already has admission_applications/students tables.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS email VARCHAR(255);

CREATE INDEX IF NOT EXISTS user_profiles_email_idx
  ON public.user_profiles(email);

DO $$
DECLARE
  tenant_schema text;
BEGIN
  FOR tenant_schema IN
    SELECT table_schema
    FROM information_schema.tables
    WHERE table_name = 'admission_applications'
      AND table_type = 'BASE TABLE'
      AND table_schema NOT IN ('public', 'information_schema', 'tenant_template')
      AND table_schema NOT LIKE 'pg_%'
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.admission_applications ADD COLUMN IF NOT EXISTS email VARCHAR(255)',
      tenant_schema
    );

    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON %I.admission_applications(email)',
      'admission_applications_' || tenant_schema || '_email_idx',
      tenant_schema
    );
  END LOOP;

  FOR tenant_schema IN
    SELECT table_schema
    FROM information_schema.tables
    WHERE table_name = 'students'
      AND table_type = 'BASE TABLE'
      AND table_schema NOT IN ('public', 'information_schema', 'tenant_template')
      AND table_schema NOT LIKE 'pg_%'
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS email VARCHAR(255)',
      tenant_schema
    );

    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON %I.students(email)',
      'students_' || tenant_schema || '_email_idx',
      tenant_schema
    );
  END LOOP;
END $$;
