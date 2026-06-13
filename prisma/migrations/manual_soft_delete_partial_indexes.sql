-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRATION: Partial Unique Indexes for Soft Delete
-- ─────────────────────────────────────────────────────────────────────────────
-- 
-- WHY PARTIAL INDEXES?
-- ────────────────────
-- Our User model uses soft delete (deleted_at IS NULL = active).
-- Standard UNIQUE constraints enforce uniqueness across ALL rows, including
-- soft-deleted ones. This means you cannot re-register a previously deleted
-- user with the same email/phone/studentCode.
--
-- PostgreSQL partial indexes solve this elegantly:
--   CREATE UNIQUE INDEX ... WHERE deleted_at IS NULL
-- This enforces uniqueness only among ACTIVE rows, so:
--   ✅ Two active users cannot share email+schema_name
--   ✅ A deleted user can be re-registered with the same email
--   ✅ Historical deleted records are preserved for audit/restore
--
-- HOW TO APPLY
-- ────────────
-- Run this file manually in your psql session or migration tool:
--   psql $DATABASE_URL -f prisma/migrations/manual_soft_delete_partial_indexes.sql
--
-- OR include it in your Prisma migration:
--   1. npx prisma migrate dev --create-only --name soft_delete_partial_indexes
--   2. Copy this content into the generated migration.sql
--   3. npx prisma migrate deploy
-- ─────────────────────────────────────────────────────────────────────────────

-- Step 1: Drop any existing full unique indexes on these columns
-- (created by Prisma if @@unique was previously present)
DROP INDEX IF EXISTS public.users_email_schema_name_key;
DROP INDEX IF EXISTS public.users_phone_schema_name_key;
DROP INDEX IF EXISTS public.users_student_code_schema_name_key;

-- Step 2: Create partial unique indexes (WHERE deleted_at IS NULL)
-- Only active (non-deleted) users are subject to uniqueness enforcement.

CREATE UNIQUE INDEX users_email_schema_active_unique
  ON public.users (email, schema_name)
  WHERE deleted_at IS NULL AND email IS NOT NULL;

CREATE UNIQUE INDEX users_phone_schema_active_unique
  ON public.users (phone, schema_name)
  WHERE deleted_at IS NULL AND phone IS NOT NULL;

CREATE UNIQUE INDEX users_student_code_schema_active_unique
  ON public.users (student_code, schema_name)
  WHERE deleted_at IS NULL AND student_code IS NOT NULL;

-- Step 3: Partial index on deleted_at itself for fast soft-delete filtering
-- This makes WHERE deleted_at IS NULL queries extremely fast.
-- PostgreSQL can use a partial index to satisfy this condition.
CREATE INDEX IF NOT EXISTS users_deleted_at_null_idx
  ON public.users (id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS schools_deleted_at_null_idx
  ON public.schools (id)
  WHERE deleted_at IS NULL;
