-- AlterEnum
BEGIN;
CREATE TYPE "tenant"."SubjectType_new" AS ENUM ('MANDATORY', 'OPTIONAL', 'PRACTICAL', 'FOURTH_SUBJECT', 'RELIGION', 'GROUP_BASED');
ALTER TABLE "tenant"."subjects" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "tenant"."subjects" ALTER COLUMN "type" TYPE "tenant"."SubjectType_new" USING ("type"::text::"tenant"."SubjectType_new");
ALTER TYPE "tenant"."SubjectType" RENAME TO "SubjectType_old";
ALTER TYPE "tenant"."SubjectType_new" RENAME TO "SubjectType";
DROP TYPE "tenant"."SubjectType_old";
ALTER TABLE "tenant"."subjects" ALTER COLUMN "type" SET DEFAULT 'MANDATORY';
COMMIT;

-- DropForeignKey
ALTER TABLE "tenant"."class_subjects" DROP CONSTRAINT "class_subjects_class_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant"."class_subjects" DROP CONSTRAINT "class_subjects_subject_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant"."subject_classes" DROP CONSTRAINT "subject_classes_class_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant"."subject_classes" DROP CONSTRAINT "subject_classes_subject_id_fkey";

-- DropIndex
DROP INDEX "tenant"."subjects_en_name_idx";

-- AlterTable
ALTER TABLE "tenant"."subjects" DROP COLUMN "full_mark",
DROP COLUMN "has_practical",
DROP COLUMN "has_theory",
DROP COLUMN "pass_mark",
DROP COLUMN "weekly_classes";

-- DropTable
DROP TABLE "tenant"."class_subjects";

-- CreateTable
CREATE TABLE "tenant"."designations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "name_bn" VARCHAR(100),
    "category" VARCHAR(50) NOT NULL,
    "applicable_to" JSONB NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,
    "is_head_role" BOOLEAN NOT NULL DEFAULT false,
    "is_system" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "designations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant"."departments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "name_bn" VARCHAR(100),
    "head_teacher_id" UUID,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant"."teachers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "employee_code" VARCHAR(30) NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "full_name_bn" VARCHAR(255),
    "father_name" VARCHAR(255),
    "mother_name" VARCHAR(255),
    "date_of_birth" DATE NOT NULL,
    "gender" VARCHAR(20) NOT NULL,
    "blood_group" VARCHAR(5),
    "religion" VARCHAR(50),
    "nationality" VARCHAR(50) NOT NULL DEFAULT 'Bangladeshi',
    "marital_status" VARCHAR(20),
    "photo_url" VARCHAR(500),
    "photo_placeholder" TEXT,
    "photo_media_id" UUID,
    "nid" VARCHAR(20),
    "birth_certificate_no" VARCHAR(30),
    "passport_no" VARCHAR(20),
    "phone" VARCHAR(20) NOT NULL,
    "alternate_phone" VARCHAR(20),
    "email" VARCHAR(255),
    "division_id" INTEGER,
    "district_id" INTEGER,
    "upazila_id" INTEGER,
    "post_code" VARCHAR(10),
    "address" TEXT,
    "permanent_address" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "designation_id" UUID NOT NULL,
    "department_id" UUID,
    "is_head_of_institution" BOOLEAN NOT NULL DEFAULT false,
    "employment_type" VARCHAR(20) NOT NULL DEFAULT 'full_time',
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "joining_date" DATE NOT NULL,
    "confirmation_date" DATE,
    "resignation_date" DATE,
    "retirement_date" DATE,
    "exit_reason" TEXT,
    "is_mpo_listed" BOOLEAN NOT NULL DEFAULT false,
    "mpo_index_no" VARCHAR(30),
    "mpo_included_at" DATE,
    "mpo_category" VARCHAR(50),
    "ntrca_registered" BOOLEAN NOT NULL DEFAULT false,
    "ntrca_reg_no" VARCHAR(30),
    "ntrca_reg_year" INTEGER,
    "ntrca_certificate_url" VARCHAR(500),
    "ntrca_certificate_media_id" UUID,
    "ntrca_subject" VARCHAR(100),
    "banbeis_teacher_id" VARCHAR(30),
    "highest_qualification" VARCHAR(100),
    "qualification_details" JSONB,
    "professional_qualifications" JSONB,
    "primary_subject_id" UUID,
    "specialization_subjects" JSONB,
    "salary_grade" VARCHAR(20),
    "basic_salary" DECIMAL(10,2),
    "bank_account_no" VARCHAR(50),
    "bank_name" VARCHAR(100),
    "bank_branch" VARCHAR(100),
    "mobile_wallet_no" VARCHAR(20),
    "mobile_wallet_type" VARCHAR(20),
    "global_person_id" UUID,
    "transferred_from" VARCHAR(63),
    "transferred_to" VARCHAR(63),
    "transfer_date" DATE,
    "previous_institution" VARCHAR(255),
    "years_of_experience" DECIMAL(4,1),
    "documents" JSONB,
    "is_hafiz" BOOLEAN,
    "qirat_grade" VARCHAR(50),
    "joining_session_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "teachers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "designations_category_idx" ON "tenant"."designations"("category");

-- CreateIndex
CREATE INDEX "designations_is_active_idx" ON "tenant"."designations"("is_active");

-- CreateIndex
CREATE INDEX "designations_deleted_at_idx" ON "tenant"."designations"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "departments_head_teacher_id_key" ON "tenant"."departments"("head_teacher_id");

-- CreateIndex
CREATE INDEX "departments_is_active_idx" ON "tenant"."departments"("is_active");

-- CreateIndex
CREATE INDEX "departments_deleted_at_idx" ON "tenant"."departments"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "teachers_user_id_key" ON "tenant"."teachers"("user_id");

-- CreateIndex
CREATE INDEX "teachers_status_idx" ON "tenant"."teachers"("status");

-- CreateIndex
CREATE INDEX "teachers_designation_id_idx" ON "tenant"."teachers"("designation_id");

-- CreateIndex
CREATE INDEX "teachers_department_id_idx" ON "tenant"."teachers"("department_id");

-- CreateIndex
CREATE INDEX "teachers_is_mpo_listed_idx" ON "tenant"."teachers"("is_mpo_listed");

-- CreateIndex
CREATE INDEX "teachers_mpo_index_no_idx" ON "tenant"."teachers"("mpo_index_no");

-- CreateIndex
CREATE INDEX "teachers_ntrca_reg_no_idx" ON "tenant"."teachers"("ntrca_reg_no");

-- CreateIndex
CREATE INDEX "teachers_nid_idx" ON "tenant"."teachers"("nid");

-- CreateIndex
CREATE INDEX "teachers_global_person_id_idx" ON "tenant"."teachers"("global_person_id");

-- CreateIndex
CREATE INDEX "teachers_employment_type_idx" ON "tenant"."teachers"("employment_type");

-- CreateIndex
CREATE INDEX "teachers_division_id_idx" ON "tenant"."teachers"("division_id");

-- CreateIndex
CREATE INDEX "teachers_district_id_idx" ON "tenant"."teachers"("district_id");

-- CreateIndex
CREATE INDEX "teachers_upazila_id_idx" ON "tenant"."teachers"("upazila_id");

-- CreateIndex
CREATE INDEX "teachers_primary_subject_id_idx" ON "tenant"."teachers"("primary_subject_id");

-- CreateIndex
CREATE INDEX "teachers_deleted_at_idx" ON "tenant"."teachers"("deleted_at");

-- AddForeignKey
ALTER TABLE "tenant"."subject_classes" ADD CONSTRAINT "subject_classes_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "tenant"."subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant"."subject_classes" ADD CONSTRAINT "subject_classes_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "tenant"."classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant"."departments" ADD CONSTRAINT "departments_head_teacher_id_fkey" FOREIGN KEY ("head_teacher_id") REFERENCES "tenant"."teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant"."teachers" ADD CONSTRAINT "teachers_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant"."teachers" ADD CONSTRAINT "teachers_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant"."teachers" ADD CONSTRAINT "teachers_upazila_id_fkey" FOREIGN KEY ("upazila_id") REFERENCES "public"."upazilas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant"."teachers" ADD CONSTRAINT "teachers_designation_id_fkey" FOREIGN KEY ("designation_id") REFERENCES "tenant"."designations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant"."teachers" ADD CONSTRAINT "teachers_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "tenant"."departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant"."teachers" ADD CONSTRAINT "teachers_primary_subject_id_fkey" FOREIGN KEY ("primary_subject_id") REFERENCES "tenant"."subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

