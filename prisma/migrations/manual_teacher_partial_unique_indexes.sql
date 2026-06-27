-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRATION: Partial Unique Indexes for Teachers — Soft Delete Safe
-- ─────────────────────────────────────────────────────────────────────────────
--
-- WHY PARTIAL INDEXES?
-- ────────────────────
-- The Teacher model uses soft delete (deleted_at IS NULL = active).
-- Standard UNIQUE constraints enforce uniqueness across ALL rows, including
-- soft-deleted ones. This means you cannot re-hire a previously terminated or
-- resigned teacher if they have the same employeeCode, NID, or MPO index number.
--
-- PostgreSQL partial indexes solve this elegantly:
--   CREATE UNIQUE INDEX ... WHERE deleted_at IS NULL
-- This enforces uniqueness only among ACTIVE rows, so:
--   ✅ Two active teachers cannot share employee_code in the same tenant schema
--   ✅ Two active teachers cannot share nid
--   ✅ A terminated teacher can be re-hired with the same employee_code
--   ✅ Historical soft-deleted records are preserved for audit/restore
--
-- NOTE: These indexes are per-tenant-schema. Each school's PostgreSQL schema
-- (e.g. "dhaka_model_school", "rajshahi_college") has its own teachers table,
-- so uniqueness is naturally scoped per school.
--
-- HOW TO APPLY
-- ────────────
-- Run after the main migration (add_designation_department_teacher).
-- Replace 'tenant' with the actual schema name, or include in the generated
-- migration SQL file from prisma migrate dev.
--
-- Option 1: append to the generated prisma migration SQL, then:
--   npx prisma migrate deploy
--
-- Option 2: run directly:
--   psql $DATABASE_URL -f prisma/migrations/manual_teacher_partial_unique_indexes.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Employee Code ─────────────────────────────────────────────────────────────
-- Unique per school (each tenant schema has its own teachers table).
-- Active teachers cannot share an employee code. Re-hired teachers can reuse it.
CREATE UNIQUE INDEX IF NOT EXISTS teachers_employee_code_active_unique
  ON tenant.teachers (employee_code)
  WHERE deleted_at IS NULL;

-- ── NID (National ID) ─────────────────────────────────────────────────────────
-- Active teachers cannot share an NID. Re-registered teachers can reuse NID
-- after a soft-delete (e.g., resigned and rehired after a gap).
CREATE UNIQUE INDEX IF NOT EXISTS teachers_nid_active_unique
  ON tenant.teachers (nid)
  WHERE deleted_at IS NULL AND nid IS NOT NULL;

-- ── MPO Index Number ──────────────────────────────────────────────────────────
-- MPO index numbers must be unique among active MPO-listed teachers.
CREATE UNIQUE INDEX IF NOT EXISTS teachers_mpo_index_no_active_unique
  ON tenant.teachers (mpo_index_no)
  WHERE deleted_at IS NULL AND mpo_index_no IS NOT NULL;
