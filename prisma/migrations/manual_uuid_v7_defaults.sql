-- PostgreSQL 18 native UUID v7 defaults.
-- This migration changes only future ID generation. Existing UUID values remain unchanged.

ALTER TABLE public.users ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE public.user_profiles ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE public.media ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE public.schools ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE public.school_bank_accounts ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE public.subscription_plans ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE public.school_subscriptions ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE public.vouchers ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE public.school_subscription_discounts ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE public.payments ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE public.academic_sessions ALTER COLUMN id SET DEFAULT uuidv7();

ALTER TABLE tenant.tenant_roles ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE tenant.shifts ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE tenant.classes ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE tenant.subjects ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE tenant.subject_classes ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE tenant.sections ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE tenant.class_rooms ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE tenant.timetables ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE tenant.timetable_histories ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE tenant.designations ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE tenant.departments ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE tenant.teachers ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE tenant.exams ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE tenant.exam_classes ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE tenant.exam_subjects ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE tenant.syllabuses ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE tenant.syllabus_subjects ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE tenant.syllabus_chapters ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE tenant.syllabus_topics ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE tenant.syllabus_histories ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE tenant.syllabus_activity_logs ALTER COLUMN id SET DEFAULT uuidv7();
