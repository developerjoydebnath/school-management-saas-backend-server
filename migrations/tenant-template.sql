-- ============================================================
-- tenant-template.sql
-- Run this ONCE to create the tenant_template schema.
-- When a school is activated, this schema is cloned into a
-- new schema named after the school slug.
--
-- Usage:
--   psql -d your_database -f migrations/tenant-template.sql
-- ============================================================

-- Create the template schema (idempotent)
CREATE SCHEMA IF NOT EXISTS tenant_template;

-- ─── User Profiles ────────────────────────────────────────────────────────────
-- References public.users(id) via FK added during clone, not here.
CREATE TABLE IF NOT EXISTS tenant_template.user_profiles (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL,        -- FK → public.users(id) added at clone time
  full_name  VARCHAR(255) NOT NULL,
  photo_url  VARCHAR(500),
  phone      VARCHAR(20),
  address    TEXT,
  metadata   JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON tenant_template.user_profiles(user_id);

-- ─── School Profile ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_template.school_profile (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name     VARCHAR(255) NOT NULL,
  school_type     VARCHAR(50)  NOT NULL,
  contact_email   VARCHAR(255),
  contact_phone   VARCHAR(20),
  district        VARCHAR(100),
  upazila         VARCHAR(100),
  address         TEXT,
  eiin            VARCHAR(20),
  registration_no VARCHAR(100),
  plan            VARCHAR(50)  DEFAULT 'standard',
  custom_domain   VARCHAR(255),
  logo_url        VARCHAR(500),
  website         VARCHAR(255),
  created_at      TIMESTAMPTZ  DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  DEFAULT NOW()
);

-- ─── Roles ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_template.roles (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(100) NOT NULL,
  slug       VARCHAR(100) NOT NULL UNIQUE,
  is_system  BOOLEAN      DEFAULT false,
  created_at TIMESTAMPTZ  DEFAULT NOW()
);

-- ─── Academic Sessions ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_template.academic_sessions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(255) NOT NULL,
  start_date DATE         NOT NULL,
  end_date   DATE         NOT NULL,
  is_current BOOLEAN      DEFAULT false,
  created_at TIMESTAMPTZ  DEFAULT NOW(),
  updated_at TIMESTAMPTZ  DEFAULT NOW()
);

-- ─── Classes ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_template.classes (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                VARCHAR(100) NOT NULL,
  numeric_level       INT,
  academic_session_id UUID,
  created_at          TIMESTAMPTZ  DEFAULT NOW()
);

-- ─── Sections ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_template.sections (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(100) NOT NULL,
  class_id   UUID        NOT NULL,
  capacity   INT,
  created_at TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sections_class_id ON tenant_template.sections(class_id);

-- ─── Subjects ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_template.subjects (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(255) NOT NULL,
  code       VARCHAR(50),
  class_id   UUID,
  is_optional BOOLEAN     DEFAULT false,
  created_at TIMESTAMPTZ  DEFAULT NOW()
);

-- ─── Students ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_template.students (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID,               -- FK → public.users(id) if student has login
  student_id_no       VARCHAR(50)  UNIQUE,
  full_name           VARCHAR(255) NOT NULL,
  date_of_birth       DATE,
  gender              VARCHAR(20),
  blood_group         VARCHAR(5),
  religion            VARCHAR(50),
  nationality         VARCHAR(100) DEFAULT 'Bangladeshi',
  photo_url           VARCHAR(500),
  address             TEXT,
  class_id            UUID,
  section_id          UUID,
  academic_session_id UUID,
  roll_number         INT,
  admission_date      DATE,
  is_active           BOOLEAN      DEFAULT true,
  created_at          TIMESTAMPTZ  DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_students_class_id    ON tenant_template.students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_section_id  ON tenant_template.students(section_id);
CREATE INDEX IF NOT EXISTS idx_students_is_active   ON tenant_template.students(is_active);

-- ─── Guardian / Parent Info ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_template.guardians (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID        NOT NULL,
  name         VARCHAR(255) NOT NULL,
  relation     VARCHAR(50),
  phone        VARCHAR(20),
  email        VARCHAR(255),
  occupation   VARCHAR(100),
  nid          VARCHAR(30),
  is_primary   BOOLEAN      DEFAULT false,
  created_at   TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_guardians_student_id ON tenant_template.guardians(student_id);

-- ─── Teachers ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_template.teachers (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID,
  employee_id    VARCHAR(50)  UNIQUE,
  full_name      VARCHAR(255) NOT NULL,
  date_of_birth  DATE,
  gender         VARCHAR(20),
  blood_group    VARCHAR(5),
  religion       VARCHAR(50),
  photo_url      VARCHAR(500),
  designation    VARCHAR(100),
  department     VARCHAR(100),
  joining_date   DATE,
  nid            VARCHAR(30),
  phone          VARCHAR(20),
  email          VARCHAR(255),
  address        TEXT,
  is_active      BOOLEAN      DEFAULT true,
  created_at     TIMESTAMPTZ  DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_teachers_is_active ON tenant_template.teachers(is_active);

-- ─── Teacher Subject Assignment ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_template.teacher_subjects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id  UUID NOT NULL,
  subject_id  UUID NOT NULL,
  class_id    UUID,
  section_id  UUID,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, subject_id, class_id, section_id)
);

-- ─── Staff ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_template.staff (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID,
  employee_id    VARCHAR(50)  UNIQUE,
  full_name      VARCHAR(255) NOT NULL,
  role_id        UUID,
  designation    VARCHAR(100),
  joining_date   DATE,
  phone          VARCHAR(20),
  email          VARCHAR(255),
  address        TEXT,
  is_active      BOOLEAN      DEFAULT true,
  created_at     TIMESTAMPTZ  DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  DEFAULT NOW()
);

-- ─── Fee Heads ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_template.fee_heads (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  type        VARCHAR(50)  NOT NULL,    -- monthly | one_time | yearly
  amount      NUMERIC(12,2),
  is_system   BOOLEAN      DEFAULT false,
  is_active   BOOLEAN      DEFAULT true,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- ─── Fee Invoices ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_template.fee_invoices (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id          UUID        NOT NULL,
  academic_session_id UUID,
  month               INT,           -- 1-12 for monthly fees
  year                INT,
  total_amount        NUMERIC(12,2) DEFAULT 0,
  paid_amount         NUMERIC(12,2) DEFAULT 0,
  due_amount          NUMERIC(12,2) DEFAULT 0,
  status              VARCHAR(30)   DEFAULT 'unpaid',  -- unpaid | partial | paid | waived
  due_date            DATE,
  created_at          TIMESTAMPTZ   DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fee_invoices_student_id ON tenant_template.fee_invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_invoices_status     ON tenant_template.fee_invoices(status);

-- ─── Fee Invoice Items ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_template.fee_invoice_items (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id    UUID        NOT NULL,
  fee_head_id   UUID        NOT NULL,
  amount        NUMERIC(12,2) NOT NULL,
  waived_amount NUMERIC(12,2) DEFAULT 0,
  created_at    TIMESTAMPTZ   DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fee_invoice_items_invoice_id ON tenant_template.fee_invoice_items(invoice_id);

-- ─── Fee Payments ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_template.fee_payments (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id     UUID        NOT NULL,
  student_id     UUID        NOT NULL,
  amount         NUMERIC(12,2) NOT NULL,
  payment_method VARCHAR(50),           -- cash | bank | mobile_banking
  payment_ref    VARCHAR(100),
  paid_at        TIMESTAMPTZ   DEFAULT NOW(),
  received_by    UUID,                  -- staff user_id
  note           TEXT,
  created_at     TIMESTAMPTZ   DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fee_payments_invoice_id  ON tenant_template.fee_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_student_id  ON tenant_template.fee_payments(student_id);

-- ─── Attendance ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_template.attendance (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID        NOT NULL,
  class_id   UUID,
  section_id UUID,
  date       DATE        NOT NULL,
  status     VARCHAR(20) NOT NULL DEFAULT 'present', -- present | absent | late | excused
  note       TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, date)
);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON tenant_template.attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date       ON tenant_template.attendance(date);

-- ─── Exams ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_template.exams (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                VARCHAR(255) NOT NULL,
  academic_session_id UUID,
  start_date          DATE,
  end_date            DATE,
  is_published        BOOLEAN      DEFAULT false,
  created_at          TIMESTAMPTZ  DEFAULT NOW()
);

-- ─── Exam Results ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_template.exam_results (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id     UUID        NOT NULL,
  student_id  UUID        NOT NULL,
  subject_id  UUID        NOT NULL,
  marks       NUMERIC(6,2),
  grade       VARCHAR(5),
  is_absent   BOOLEAN      DEFAULT false,
  created_at  TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE(exam_id, student_id, subject_id)
);
CREATE INDEX IF NOT EXISTS idx_exam_results_exam_id    ON tenant_template.exam_results(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_student_id ON tenant_template.exam_results(student_id);

-- ─── Holidays ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_template.holidays (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  date        DATE         NOT NULL,
  type        VARCHAR(50)  DEFAULT 'national',  -- national | school | other
  is_national BOOLEAN      DEFAULT false,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_holidays_date ON tenant_template.holidays(date);

-- ─── Notices / Announcements ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_template.notices (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       VARCHAR(500) NOT NULL,
  content     TEXT,
  target_role VARCHAR(50), -- NULL = all | 'teacher' | 'student' | 'parent'
  is_active   BOOLEAN      DEFAULT true,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- ─── Library Books ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_template.library_books (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title           VARCHAR(500) NOT NULL,
  author          VARCHAR(255),
  isbn            VARCHAR(30),
  category        VARCHAR(100),
  total_copies    INT          DEFAULT 1,
  available_copies INT         DEFAULT 1,
  created_at      TIMESTAMPTZ  DEFAULT NOW()
);

-- ─── Library Borrow Records ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_template.library_borrows (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id      UUID        NOT NULL,
  borrower_id  UUID        NOT NULL,  -- student or teacher user_id
  borrowed_at  TIMESTAMPTZ DEFAULT NOW(),
  due_date     DATE,
  returned_at  TIMESTAMPTZ,
  status       VARCHAR(20) DEFAULT 'borrowed',  -- borrowed | returned | overdue
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_library_borrows_book_id     ON tenant_template.library_borrows(book_id);
CREATE INDEX IF NOT EXISTS idx_library_borrows_borrower_id ON tenant_template.library_borrows(borrower_id);

-- ─── Updated_at triggers (optional but recommended) ──────────────────────────
-- Example trigger function (shared by all tables with updated_at)
CREATE OR REPLACE FUNCTION tenant_template.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables that have updated_at columns
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'user_profiles','school_profile','academic_sessions',
    'students','teachers','staff',
    'fee_invoices','fee_invoice_items'
  ]
  LOOP
    EXECUTE format(
      'CREATE OR REPLACE TRIGGER trg_%s_updated_at
       BEFORE UPDATE ON tenant_template.%I
       FOR EACH ROW EXECUTE FUNCTION tenant_template.set_updated_at()',
      tbl, tbl
    );
  END LOOP;
END;
$$;
