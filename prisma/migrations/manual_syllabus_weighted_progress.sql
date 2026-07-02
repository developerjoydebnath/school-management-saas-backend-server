ALTER TABLE tenant.syllabus_chapters
  ADD COLUMN IF NOT EXISTS weight_percent DECIMAL(5, 2) NOT NULL DEFAULT 100;

ALTER TABLE tenant.syllabus_topics
  ADD COLUMN IF NOT EXISTS weight_percent DECIMAL(5, 2) NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS progress_percent DECIMAL(5, 2) NOT NULL DEFAULT 0;

UPDATE tenant.syllabus_topics
SET progress_percent = CASE WHEN is_completed THEN 100 ELSE progress_percent END
WHERE progress_percent IS DISTINCT FROM CASE WHEN is_completed THEN 100 ELSE progress_percent END;
