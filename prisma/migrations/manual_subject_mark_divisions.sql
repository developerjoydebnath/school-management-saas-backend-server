DO $$
BEGIN
  CREATE TYPE tenant."SubjectMarkDivision" AS ENUM (
    'WRITTEN',
    'WRITTEN_MCQ',
    'WRITTEN_MCQ_PRACTICAL'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE tenant.subjects
  ADD COLUMN IF NOT EXISTS mark_division tenant."SubjectMarkDivision" NOT NULL DEFAULT 'WRITTEN';

ALTER TABLE tenant.subjects ADD COLUMN IF NOT EXISTS written_marks integer;
ALTER TABLE tenant.subjects ADD COLUMN IF NOT EXISTS written_pass_marks integer;
ALTER TABLE tenant.subjects ADD COLUMN IF NOT EXISTS mcq_marks integer;
ALTER TABLE tenant.subjects ADD COLUMN IF NOT EXISTS mcq_pass_marks integer;
ALTER TABLE tenant.subjects ADD COLUMN IF NOT EXISTS practical_pass_marks integer;

UPDATE tenant.subjects
SET
  written_marks = COALESCE(written_marks, theory_marks, full_marks),
  written_pass_marks = COALESCE(written_pass_marks, pass_marks)
WHERE written_marks IS NULL OR written_pass_marks IS NULL;

CREATE INDEX IF NOT EXISTS subjects_mark_division_idx ON tenant.subjects(mark_division);
