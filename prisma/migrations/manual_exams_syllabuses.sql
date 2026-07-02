-- Exam and syllabus management for tenant schools.
-- Exam subjects copy mark/pass-mark divisions from tenant.subjects when an exam is created.
-- Syllabus stores teaching content and progress only; every save writes a syllabus_histories snapshot.

DO $$
BEGIN
  CREATE TYPE tenant."ExamType" AS ENUM (
    'UNIT_TEST',
    'CLASS_TEST',
    'FIRST_TERM',
    'HALF_YEARLY',
    'ANNUAL',
    'FINAL',
    'MODEL_TEST',
    'MOCK_TEST',
    'PRE_TEST',
    'CUSTOM'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE tenant."ExamStatus" AS ENUM (
    'DRAFT',
    'SCHEDULED',
    'ONGOING',
    'COMPLETED',
    'CANCELLED',
    'ARCHIVED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE tenant."ExamSubjectStatus" AS ENUM (
    'SCHEDULED',
    'ONGOING',
    'COMPLETED',
    'CANCELLED',
    'POSTPONED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE tenant."SyllabusStatus" AS ENUM (
    'DRAFT',
    'PUBLISHED',
    'ARCHIVED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE tenant."SyllabusChangeType" AS ENUM (
    'CREATED',
    'UPDATED',
    'PUBLISHED',
    'ARCHIVED',
    'SUBJECT_ADDED',
    'SUBJECT_REMOVED',
    'CHAPTER_ADDED',
    'CHAPTER_UPDATED',
    'TOPIC_ADDED',
    'TOPIC_UPDATED',
    'TOPIC_COMPLETED',
    'TOPIC_UNCOMPLETED',
    'SNAPSHOT_CREATED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS tenant.exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  name varchar(150) NOT NULL,
  name_bn varchar(150),
  type tenant."ExamType" NOT NULL DEFAULT 'HALF_YEARLY',
  start_date date NOT NULL,
  end_date date NOT NULL,
  status tenant."ExamStatus" NOT NULL DEFAULT 'DRAFT',
  instructions text,
  instructions_bn text,
  grading_scale varchar(30) NOT NULL DEFAULT 'gpa_5',
  grading_rules jsonb,
  default_pass_marks integer NOT NULL DEFAULT 33,
  default_total_marks integer NOT NULL DEFAULT 100,
  default_written_marks integer NOT NULL DEFAULT 70,
  default_mcq_marks integer NOT NULL DEFAULT 30,
  default_practical_marks integer NOT NULL DEFAULT 0,
  default_ca_marks integer NOT NULL DEFAULT 0,
  weight_percent decimal(5, 2),
  publish_to_teachers_at timestamptz,
  publish_to_students_at timestamptz,
  created_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid
);

CREATE TABLE IF NOT EXISTS tenant.exam_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL,
  class_id uuid NOT NULL,
  status tenant."ExamStatus" NOT NULL DEFAULT 'DRAFT',
  chief_invigilator_id uuid,
  result_locked_at timestamptz,
  result_locked_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT exam_classes_exam_id_fkey
    FOREIGN KEY (exam_id)
    REFERENCES tenant.exams(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT exam_classes_class_id_fkey
    FOREIGN KEY (class_id)
    REFERENCES tenant.classes(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT exam_classes_exam_class_unique UNIQUE (exam_id, class_id)
);

CREATE TABLE IF NOT EXISTS tenant.exam_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL,
  exam_class_id uuid NOT NULL,
  class_id uuid NOT NULL,
  subject_id uuid NOT NULL,
  exam_date date,
  start_time varchar(10),
  duration_mins integer NOT NULL DEFAULT 180,
  class_room_id uuid,
  invigilator_id uuid,
  total_marks integer NOT NULL DEFAULT 100,
  pass_marks integer NOT NULL DEFAULT 33,
  mark_division tenant."SubjectMarkDivision" NOT NULL DEFAULT 'WRITTEN',
  written_marks integer NOT NULL DEFAULT 100,
  written_pass_marks integer NOT NULL DEFAULT 33,
  mcq_marks integer NOT NULL DEFAULT 0,
  mcq_pass_marks integer NOT NULL DEFAULT 0,
  practical_marks integer NOT NULL DEFAULT 0,
  practical_pass_marks integer NOT NULL DEFAULT 0,
  ca_marks integer NOT NULL DEFAULT 0,
  ca_pass_marks integer NOT NULL DEFAULT 0,
  status tenant."ExamSubjectStatus" NOT NULL DEFAULT 'SCHEDULED',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT exam_subjects_exam_id_fkey
    FOREIGN KEY (exam_id)
    REFERENCES tenant.exams(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT exam_subjects_exam_class_id_fkey
    FOREIGN KEY (exam_class_id)
    REFERENCES tenant.exam_classes(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT exam_subjects_class_id_fkey
    FOREIGN KEY (class_id)
    REFERENCES tenant.classes(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT exam_subjects_subject_id_fkey
    FOREIGN KEY (subject_id)
    REFERENCES tenant.subjects(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT exam_subjects_class_room_id_fkey
    FOREIGN KEY (class_room_id)
    REFERENCES tenant.class_rooms(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT exam_subjects_exam_class_subject_unique UNIQUE (exam_class_id, subject_id)
);

CREATE TABLE IF NOT EXISTS tenant.syllabuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  exam_id uuid NOT NULL,
  class_id uuid NOT NULL,
  section_id uuid,
  title varchar(255),
  status tenant."SyllabusStatus" NOT NULL DEFAULT 'DRAFT',
  total_subjects integer NOT NULL DEFAULT 0,
  total_chapters integer NOT NULL DEFAULT 0,
  total_topics integer NOT NULL DEFAULT 0,
  completed_topics integer NOT NULL DEFAULT 0,
  completion_percent decimal(5, 2) NOT NULL DEFAULT 0,
  published_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid,
  CONSTRAINT syllabuses_exam_id_fkey
    FOREIGN KEY (exam_id)
    REFERENCES tenant.exams(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT syllabuses_class_id_fkey
    FOREIGN KEY (class_id)
    REFERENCES tenant.classes(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT syllabuses_section_id_fkey
    FOREIGN KEY (section_id)
    REFERENCES tenant.sections(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS tenant.syllabus_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  syllabus_id uuid NOT NULL,
  subject_id uuid NOT NULL,
  teacher_id uuid,
  sort_order integer NOT NULL DEFAULT 0,
  total_chapters integer NOT NULL DEFAULT 0,
  total_topics integer NOT NULL DEFAULT 0,
  completed_topics integer NOT NULL DEFAULT 0,
  completion_percent decimal(5, 2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT syllabus_subjects_syllabus_id_fkey
    FOREIGN KEY (syllabus_id)
    REFERENCES tenant.syllabuses(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT syllabus_subjects_subject_id_fkey
    FOREIGN KEY (subject_id)
    REFERENCES tenant.subjects(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT syllabus_subjects_syllabus_subject_unique UNIQUE (syllabus_id, subject_id)
);

CREATE TABLE IF NOT EXISTS tenant.syllabus_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  syllabus_id uuid NOT NULL,
  syllabus_subject_id uuid NOT NULL,
  chapter_no integer NOT NULL DEFAULT 1,
  title varchar(255) NOT NULL,
  title_bn varchar(255),
  page_range varchar(100),
  learning_outcome text,
  sort_order integer NOT NULL DEFAULT 0,
  total_topics integer NOT NULL DEFAULT 0,
  completed_topics integer NOT NULL DEFAULT 0,
  completion_percent decimal(5, 2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT syllabus_chapters_syllabus_id_fkey
    FOREIGN KEY (syllabus_id)
    REFERENCES tenant.syllabuses(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT syllabus_chapters_syllabus_subject_id_fkey
    FOREIGN KEY (syllabus_subject_id)
    REFERENCES tenant.syllabus_subjects(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS tenant.syllabus_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  syllabus_id uuid NOT NULL,
  syllabus_subject_id uuid NOT NULL,
  syllabus_chapter_id uuid NOT NULL,
  title varchar(255) NOT NULL,
  title_bn varchar(255),
  description text,
  estimated_classes integer NOT NULL DEFAULT 1,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  completed_by uuid,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT syllabus_topics_syllabus_id_fkey
    FOREIGN KEY (syllabus_id)
    REFERENCES tenant.syllabuses(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT syllabus_topics_syllabus_subject_id_fkey
    FOREIGN KEY (syllabus_subject_id)
    REFERENCES tenant.syllabus_subjects(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT syllabus_topics_syllabus_chapter_id_fkey
    FOREIGN KEY (syllabus_chapter_id)
    REFERENCES tenant.syllabus_chapters(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS tenant.syllabus_histories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  syllabus_id uuid NOT NULL,
  version integer NOT NULL DEFAULT 1,
  change_type tenant."SyllabusChangeType" NOT NULL DEFAULT 'SNAPSHOT_CREATED',
  snapshot jsonb NOT NULL,
  summary varchar(255),
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT syllabus_histories_syllabus_id_fkey
    FOREIGN KEY (syllabus_id)
    REFERENCES tenant.syllabuses(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS tenant.syllabus_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  syllabus_id uuid NOT NULL,
  entity_type varchar(50) NOT NULL,
  entity_id uuid,
  change_type tenant."SyllabusChangeType" NOT NULL,
  previous_value jsonb,
  new_value jsonb,
  message varchar(255),
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT syllabus_activity_logs_syllabus_id_fkey
    FOREIGN KEY (syllabus_id)
    REFERENCES tenant.syllabuses(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS exams_session_id_idx ON tenant.exams(session_id);
CREATE INDEX IF NOT EXISTS exams_type_idx ON tenant.exams(type);
CREATE INDEX IF NOT EXISTS exams_status_idx ON tenant.exams(status);
CREATE INDEX IF NOT EXISTS exams_start_end_date_idx ON tenant.exams(start_date, end_date);
CREATE INDEX IF NOT EXISTS exams_deleted_at_idx ON tenant.exams(deleted_at);

CREATE INDEX IF NOT EXISTS exam_classes_exam_id_idx ON tenant.exam_classes(exam_id);
CREATE INDEX IF NOT EXISTS exam_classes_class_id_idx ON tenant.exam_classes(class_id);
CREATE INDEX IF NOT EXISTS exam_classes_status_idx ON tenant.exam_classes(status);

CREATE INDEX IF NOT EXISTS exam_subjects_exam_id_idx ON tenant.exam_subjects(exam_id);
CREATE INDEX IF NOT EXISTS exam_subjects_class_id_idx ON tenant.exam_subjects(class_id);
CREATE INDEX IF NOT EXISTS exam_subjects_subject_id_idx ON tenant.exam_subjects(subject_id);
CREATE INDEX IF NOT EXISTS exam_subjects_exam_date_idx ON tenant.exam_subjects(exam_date);
CREATE INDEX IF NOT EXISTS exam_subjects_status_idx ON tenant.exam_subjects(status);

CREATE INDEX IF NOT EXISTS syllabuses_session_id_idx ON tenant.syllabuses(session_id);
CREATE INDEX IF NOT EXISTS syllabuses_exam_id_idx ON tenant.syllabuses(exam_id);
CREATE INDEX IF NOT EXISTS syllabuses_class_id_idx ON tenant.syllabuses(class_id);
CREATE INDEX IF NOT EXISTS syllabuses_section_id_idx ON tenant.syllabuses(section_id);
CREATE INDEX IF NOT EXISTS syllabuses_status_idx ON tenant.syllabuses(status);
CREATE INDEX IF NOT EXISTS syllabuses_deleted_at_idx ON tenant.syllabuses(deleted_at);

CREATE UNIQUE INDEX IF NOT EXISTS syllabuses_class_level_unique
  ON tenant.syllabuses(session_id, exam_id, class_id)
  WHERE section_id IS NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS syllabuses_section_level_unique
  ON tenant.syllabuses(session_id, exam_id, class_id, section_id)
  WHERE section_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS syllabus_subjects_syllabus_id_idx ON tenant.syllabus_subjects(syllabus_id);
CREATE INDEX IF NOT EXISTS syllabus_subjects_subject_id_idx ON tenant.syllabus_subjects(subject_id);
CREATE INDEX IF NOT EXISTS syllabus_chapters_syllabus_id_idx ON tenant.syllabus_chapters(syllabus_id);
CREATE INDEX IF NOT EXISTS syllabus_chapters_syllabus_subject_id_idx ON tenant.syllabus_chapters(syllabus_subject_id);
CREATE INDEX IF NOT EXISTS syllabus_topics_syllabus_id_idx ON tenant.syllabus_topics(syllabus_id);
CREATE INDEX IF NOT EXISTS syllabus_topics_syllabus_subject_id_idx ON tenant.syllabus_topics(syllabus_subject_id);
CREATE INDEX IF NOT EXISTS syllabus_topics_syllabus_chapter_id_idx ON tenant.syllabus_topics(syllabus_chapter_id);
CREATE INDEX IF NOT EXISTS syllabus_topics_is_completed_idx ON tenant.syllabus_topics(is_completed);
CREATE INDEX IF NOT EXISTS syllabus_histories_syllabus_id_idx ON tenant.syllabus_histories(syllabus_id);
CREATE INDEX IF NOT EXISTS syllabus_histories_changed_at_idx ON tenant.syllabus_histories(changed_at);
CREATE INDEX IF NOT EXISTS syllabus_activity_logs_syllabus_id_idx ON tenant.syllabus_activity_logs(syllabus_id);
CREATE INDEX IF NOT EXISTS syllabus_activity_logs_change_type_idx ON tenant.syllabus_activity_logs(change_type);
CREATE INDEX IF NOT EXISTS syllabus_activity_logs_changed_at_idx ON tenant.syllabus_activity_logs(changed_at);
