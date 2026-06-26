-- Move medium-specific school types into the generic school type.
-- The separate `medium` column remains responsible for Bangla/English/Both.

ALTER TABLE public.schools
  ALTER COLUMN school_type TYPE text
  USING school_type::text;

UPDATE public.schools
SET school_type = 'school',
    medium = CASE
      WHEN school_type = 'english_medium' THEN 'english'
      WHEN school_type = 'bangla_medium' THEN 'bangla'
      ELSE medium
    END
WHERE school_type IN ('bangla_medium', 'english_medium');

DROP TYPE public."SchoolType";

CREATE TYPE public."SchoolType" AS ENUM (
  'school',
  'madrasa',
  'college',
  'university_college'
);

ALTER TABLE public.schools
  ALTER COLUMN school_type TYPE public."SchoolType"
  USING school_type::text::public."SchoolType";
