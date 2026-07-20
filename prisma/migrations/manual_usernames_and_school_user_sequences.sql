ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS username VARCHAR(50);

UPDATE public.users
SET username = COALESCE(
  student_code,
  left(schema_name || '-' || email, 50),
  left(schema_name || '-' || phone, 50),
  role::text || '-' || substr(id::text, 1, 8)
)
WHERE username IS NULL;

ALTER TABLE public.users
  ALTER COLUMN username SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_username_active_idx
  ON public.users (username)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.school_user_sequences (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  role public."Role" NOT NULL,
  last_value integer NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS school_user_sequences_school_id_role_key
  ON public.school_user_sequences (school_id, role);

CREATE INDEX IF NOT EXISTS school_user_sequences_school_id_idx
  ON public.school_user_sequences (school_id);
