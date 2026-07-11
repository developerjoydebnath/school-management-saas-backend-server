DO $$
DECLARE
  tenant_schema text;
BEGIN
  FOR tenant_schema IN
    SELECT s.schema_name
    FROM information_schema.schemata s
    WHERE s.schema_name NOT IN ('public', 'information_schema')
      AND s.schema_name NOT LIKE 'pg_%'
      AND (
        s.schema_name = 'tenant'
        OR EXISTS (
        SELECT 1
        FROM information_schema.tables t
        WHERE t.table_schema = s.schema_name
          AND t.table_name = 'academic_sessions'
        )
      )
  LOOP
    EXECUTE format('
      CREATE TABLE IF NOT EXISTS %I.admission_settings (
        id uuid PRIMARY KEY DEFAULT uuidv7(),
        session_id uuid NOT NULL,
        admission_mode varchar(10) NOT NULL DEFAULT ''fast'',
        online_portal_enabled boolean NOT NULL DEFAULT false,
        online_portal_slug varchar(100),
        online_portal_opens_at timestamptz,
        online_portal_closes_at timestamptz,
        default_admission_fee numeric(10,2),
        application_prefix varchar(10) NOT NULL DEFAULT ''ADM'',
        application_no_seq integer NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        created_by uuid,
        updated_by uuid,
        deleted_at timestamptz,
        deleted_by uuid
      )', tenant_schema);

    EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS admission_settings_%s_session_id_uidx ON %I.admission_settings (session_id)', tenant_schema, tenant_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS admission_settings_%s_admission_mode_idx ON %I.admission_settings (admission_mode)', tenant_schema, tenant_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS admission_settings_%s_online_portal_slug_idx ON %I.admission_settings (online_portal_slug)', tenant_schema, tenant_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS admission_settings_%s_deleted_at_idx ON %I.admission_settings (deleted_at)', tenant_schema, tenant_schema);

    EXECUTE format('
      CREATE TABLE IF NOT EXISTS %I.admission_field_configs (
        id uuid PRIMARY KEY DEFAULT uuidv7(),
        settings_id uuid NOT NULL,
        field_key varchar(100) NOT NULL,
        section varchar(40) NOT NULL,
        label varchar(150) NOT NULL,
        label_bn varchar(150),
        field_type varchar(20) NOT NULL,
        options jsonb,
        placeholder varchar(200),
        help_text varchar(300),
        is_system boolean NOT NULL DEFAULT false,
        is_system_locked boolean NOT NULL DEFAULT false,
        is_shown boolean NOT NULL DEFAULT true,
        is_required boolean NOT NULL DEFAULT false,
        is_custom boolean NOT NULL DEFAULT false,
        depends_on_field_key varchar(100),
        sort_order integer NOT NULL DEFAULT 0,
        min_length integer,
        max_length integer,
        min_value numeric(12,2),
        max_value numeric(12,2),
        regex_pattern varchar(300),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        created_by uuid,
        updated_by uuid,
        deleted_at timestamptz,
        deleted_by uuid,
        CONSTRAINT admission_field_configs_settings_fk FOREIGN KEY (settings_id)
          REFERENCES %I.admission_settings(id) ON DELETE CASCADE ON UPDATE CASCADE
      )', tenant_schema, tenant_schema);

    EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS admission_field_configs_%s_settings_field_uidx ON %I.admission_field_configs (settings_id, field_key)', tenant_schema, tenant_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS admission_field_configs_%s_settings_section_idx ON %I.admission_field_configs (settings_id, section)', tenant_schema, tenant_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS admission_field_configs_%s_settings_custom_idx ON %I.admission_field_configs (settings_id, is_custom)', tenant_schema, tenant_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS admission_field_configs_%s_deleted_at_idx ON %I.admission_field_configs (deleted_at)', tenant_schema, tenant_schema);

    EXECUTE format('
      CREATE TABLE IF NOT EXISTS %I.admission_applications (
        id uuid PRIMARY KEY DEFAULT uuidv7(),
        application_no varchar(30) NOT NULL,
        session_id uuid NOT NULL,
        status varchar(20) NOT NULL DEFAULT ''pending'',
        source varchar(20) NOT NULL DEFAULT ''admin_fast'',
        admission_mode varchar(10) NOT NULL DEFAULT ''fast'',
        current_step varchar(40),
        completion_percent integer NOT NULL DEFAULT 0,
        is_draft boolean NOT NULL DEFAULT false,
        submitted_at timestamptz,
        reviewed_at timestamptz,
        reviewed_by uuid,
        rejection_reason text,
        waitlist_rank integer,
        approved_at timestamptz,
        approved_by uuid,
        student_id uuid UNIQUE,
        student_name_en varchar(255) NOT NULL,
        student_name_bn varchar(255),
        date_of_birth date NOT NULL,
        gender varchar(20) NOT NULL,
        birth_registration_no varchar(30),
        blood_group varchar(5),
        religion varchar(50),
        nationality varchar(50) NOT NULL DEFAULT ''Bangladeshi'',
        special_quota jsonb,
        photo_url varchar(500),
        photo_placeholder text,
        photo_media_id uuid,
        applying_class_id uuid NOT NULL,
        section_id uuid,
        admission_type varchar(20) NOT NULL DEFAULT ''new'',
        medium_or_version varchar(20),
        shift varchar(20),
        group_or_dept varchar(30),
        previous_school_name varchar(255),
        previous_school_eiin varchar(20),
        transfer_certificate_no varchar(50),
        last_class_completed varchar(20),
        last_exam_result varchar(20),
        father_name varchar(255) NOT NULL,
        father_name_bn varchar(255),
        father_nid varchar(20),
        father_occupation varchar(100),
        father_mobile varchar(20) NOT NULL,
        mother_name varchar(255),
        mother_name_bn varchar(255),
        mother_nid varchar(20),
        mother_occupation varchar(100),
        mother_mobile varchar(20),
        guardian_name varchar(255),
        guardian_relation varchar(50),
        guardian_nid varchar(20),
        guardian_mobile varchar(20),
        local_guardian_name varchar(255),
        local_guardian_mobile varchar(20),
        local_guardian_address text,
        emergency_contact_name varchar(255),
        emergency_contact_phone varchar(20),
        monthly_family_income numeric(10,2),
        present_address text,
        present_division_id integer,
        present_district_id integer,
        present_upazila_id integer,
        permanent_same_as_present boolean NOT NULL DEFAULT false,
        permanent_address text,
        permanent_division_id integer,
        permanent_district_id integer,
        permanent_upazila_id integer,
        documents jsonb,
        allergies text,
        medical_conditions text,
        disability_type varchar(100),
        immunization_complete boolean,
        admission_fee_amount numeric(10,2),
        payment_status varchar(20) NOT NULL DEFAULT ''pending'',
        payment_method varchar(20),
        transaction_id varchar(100),
        paid_at timestamptz,
        custom_data jsonb,
        notes text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        created_by uuid,
        updated_by uuid,
        deleted_at timestamptz,
        deleted_by uuid
      )', tenant_schema);

    EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS admission_applications_%s_application_no_uidx ON %I.admission_applications (application_no)', tenant_schema, tenant_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS admission_applications_%s_status_idx ON %I.admission_applications (status)', tenant_schema, tenant_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS admission_applications_%s_session_id_idx ON %I.admission_applications (session_id)', tenant_schema, tenant_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS admission_applications_%s_applying_class_id_idx ON %I.admission_applications (applying_class_id)', tenant_schema, tenant_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS admission_applications_%s_section_id_idx ON %I.admission_applications (section_id)', tenant_schema, tenant_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS admission_applications_%s_source_idx ON %I.admission_applications (source)', tenant_schema, tenant_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS admission_applications_%s_payment_status_idx ON %I.admission_applications (payment_status)', tenant_schema, tenant_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS admission_applications_%s_present_division_id_idx ON %I.admission_applications (present_division_id)', tenant_schema, tenant_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS admission_applications_%s_present_district_id_idx ON %I.admission_applications (present_district_id)', tenant_schema, tenant_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS admission_applications_%s_present_upazila_id_idx ON %I.admission_applications (present_upazila_id)', tenant_schema, tenant_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS admission_applications_%s_deleted_at_idx ON %I.admission_applications (deleted_at)', tenant_schema, tenant_schema);

    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = tenant_schema AND table_name = 'students'
    ) THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = tenant_schema AND table_name = 'students' AND column_name = 'full_name_en'
      ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = tenant_schema AND table_name = 'students' AND column_name = 'full_name'
      ) THEN
        EXECUTE format('ALTER TABLE %I.students RENAME COLUMN full_name TO full_name_en', tenant_schema);
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = tenant_schema AND table_name = 'students' AND column_name = 'current_session_id'
      ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = tenant_schema AND table_name = 'students' AND column_name = 'academic_session_id'
      ) THEN
        EXECUTE format('ALTER TABLE %I.students RENAME COLUMN academic_session_id TO current_session_id', tenant_schema);
      END IF;

      EXECUTE format('ALTER TABLE %I.students ALTER COLUMN id SET DEFAULT uuidv7()', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ALTER COLUMN roll_number TYPE varchar(20) USING roll_number::text', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS admission_application_id uuid', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS full_name_bn varchar(255)', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS birth_registration_no varchar(30)', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS special_quota jsonb', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS photo_placeholder text', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS photo_media_id uuid', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS medium_or_version varchar(20)', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS shift varchar(20)', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS group_or_dept varchar(30)', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS admission_type varchar(20) DEFAULT ''new''', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS status varchar(20) DEFAULT ''active''', tenant_schema);
      EXECUTE format('UPDATE %I.students SET status = CASE WHEN is_active THEN ''active'' ELSE ''inactive'' END WHERE status IS NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = %L AND table_name = ''students'' AND column_name = ''is_active'')', tenant_schema, tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS status_reason text', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS status_changed_at timestamptz', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS previous_school_name varchar(255)', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS previous_school_eiin varchar(20)', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS transfer_certificate_no varchar(50)', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS last_class_completed varchar(20)', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS last_exam_result varchar(20)', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS global_person_id uuid', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS transferred_from varchar(63)', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS transferred_to varchar(63)', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS transfer_date date', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS father_name varchar(255)', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS father_name_bn varchar(255)', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS father_nid varchar(20)', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS father_occupation varchar(100)', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS father_mobile varchar(20)', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS mother_name varchar(255)', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS mother_name_bn varchar(255)', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS mother_nid varchar(20)', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS mother_occupation varchar(100)', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS mother_mobile varchar(20)', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS guardian_name varchar(255)', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS guardian_relation varchar(50)', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS guardian_nid varchar(20)', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS guardian_mobile varchar(20)', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS local_guardian_name varchar(255)', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS local_guardian_mobile varchar(20)', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS local_guardian_address text', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS emergency_contact_name varchar(255)', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS emergency_contact_phone varchar(20)', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS monthly_family_income numeric(10,2)', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS present_address text', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS present_division_id integer', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS present_district_id integer', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS present_upazila_id integer', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS permanent_same_as_present boolean DEFAULT false', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS permanent_address text', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS permanent_division_id integer', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS permanent_district_id integer', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS permanent_upazila_id integer', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS documents jsonb', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS allergies text', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS medical_conditions text', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS disability_type varchar(100)', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS immunization_complete boolean', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS admission_fee_amount numeric(10,2)', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS payment_status varchar(20) DEFAULT ''paid''', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS custom_data jsonb', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS notes text', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS created_by uuid', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS updated_by uuid', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS deleted_at timestamptz', tenant_schema);
      EXECUTE format('ALTER TABLE %I.students ADD COLUMN IF NOT EXISTS deleted_by uuid', tenant_schema);
    ELSE
      EXECUTE format('
        CREATE TABLE %I.students (
          id uuid PRIMARY KEY DEFAULT uuidv7(),
          user_id uuid UNIQUE,
          admission_application_id uuid UNIQUE,
          student_id_no varchar(30) NOT NULL UNIQUE,
          full_name_en varchar(255) NOT NULL,
          full_name_bn varchar(255),
          date_of_birth date NOT NULL,
          gender varchar(20) NOT NULL,
          birth_registration_no varchar(30),
          blood_group varchar(5),
          religion varchar(50),
          nationality varchar(50) NOT NULL DEFAULT ''Bangladeshi'',
          special_quota jsonb,
          photo_url varchar(500),
          photo_placeholder text,
          photo_media_id uuid,
          class_id uuid NOT NULL,
          section_id uuid,
          current_session_id uuid NOT NULL,
          roll_number varchar(20),
          medium_or_version varchar(20),
          shift varchar(20),
          group_or_dept varchar(30),
          admission_type varchar(20) NOT NULL DEFAULT ''new'',
          admission_date date NOT NULL,
          status varchar(20) NOT NULL DEFAULT ''active'',
          status_reason text,
          status_changed_at timestamptz,
          previous_school_name varchar(255),
          previous_school_eiin varchar(20),
          transfer_certificate_no varchar(50),
          last_class_completed varchar(20),
          last_exam_result varchar(20),
          global_person_id uuid,
          transferred_from varchar(63),
          transferred_to varchar(63),
          transfer_date date,
          father_name varchar(255) NOT NULL,
          father_name_bn varchar(255),
          father_nid varchar(20),
          father_occupation varchar(100),
          father_mobile varchar(20) NOT NULL,
          mother_name varchar(255),
          mother_name_bn varchar(255),
          mother_nid varchar(20),
          mother_occupation varchar(100),
          mother_mobile varchar(20),
          guardian_name varchar(255),
          guardian_relation varchar(50),
          guardian_nid varchar(20),
          guardian_mobile varchar(20),
          local_guardian_name varchar(255),
          local_guardian_mobile varchar(20),
          local_guardian_address text,
          emergency_contact_name varchar(255),
          emergency_contact_phone varchar(20),
          monthly_family_income numeric(10,2),
          present_address text,
          present_division_id integer,
          present_district_id integer,
          present_upazila_id integer,
          permanent_same_as_present boolean NOT NULL DEFAULT false,
          permanent_address text,
          permanent_division_id integer,
          permanent_district_id integer,
          permanent_upazila_id integer,
          documents jsonb,
          allergies text,
          medical_conditions text,
          disability_type varchar(100),
          immunization_complete boolean,
          admission_fee_amount numeric(10,2),
          payment_status varchar(20) NOT NULL DEFAULT ''paid'',
          custom_data jsonb,
          notes text,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          created_by uuid,
          updated_by uuid,
          deleted_at timestamptz,
          deleted_by uuid
        )', tenant_schema);
    END IF;

    EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS students_%s_admission_application_id_uidx ON %I.students (admission_application_id)', tenant_schema, tenant_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS students_%s_status_idx ON %I.students (status)', tenant_schema, tenant_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS students_%s_class_id_idx ON %I.students (class_id)', tenant_schema, tenant_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS students_%s_section_id_idx ON %I.students (section_id)', tenant_schema, tenant_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS students_%s_current_session_id_idx ON %I.students (current_session_id)', tenant_schema, tenant_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS students_%s_global_person_id_idx ON %I.students (global_person_id)', tenant_schema, tenant_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS students_%s_present_division_id_idx ON %I.students (present_division_id)', tenant_schema, tenant_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS students_%s_present_district_id_idx ON %I.students (present_district_id)', tenant_schema, tenant_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS students_%s_present_upazila_id_idx ON %I.students (present_upazila_id)', tenant_schema, tenant_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS students_%s_deleted_at_idx ON %I.students (deleted_at)', tenant_schema, tenant_schema);
  END LOOP;
END $$;
