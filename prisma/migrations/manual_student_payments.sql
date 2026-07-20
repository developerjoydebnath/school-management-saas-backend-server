-- Student payment history ledger for school-collected payments.
-- Applied to every tenant-like schema that already has admission applications.

DO $$
DECLARE
  target_schema text;
  has_fee_snapshot boolean;
BEGIN
  FOR target_schema IN
    SELECT table_schema
    FROM information_schema.tables
    WHERE table_name = 'admission_applications'
      AND table_schema NOT IN ('pg_catalog', 'information_schema')
  LOOP
    EXECUTE format($sql$
      CREATE TABLE IF NOT EXISTS %I.student_payments (
        id UUID PRIMARY KEY DEFAULT uuidv7(),
        payment_no VARCHAR(40) NOT NULL UNIQUE,
        admission_application_id UUID,
        student_id UUID,
        user_id UUID,
        session_id UUID NOT NULL,
        class_id UUID,
        section_id UUID,
        purpose VARCHAR(40) NOT NULL DEFAULT 'admission_fee',
        source VARCHAR(40) NOT NULL DEFAULT 'admin_manual',
        payment_method VARCHAR(30),
        payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
        payment_gateway VARCHAR(50),
        gateway_provider VARCHAR(50),
        payment_id VARCHAR(100),
        transaction_id VARCHAR(100),
        receipt_no VARCHAR(60),
        original_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
        required_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
        paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
        due_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
        currency VARCHAR(3) NOT NULL DEFAULT 'BDT',
        discount_applied BOOLEAN NOT NULL DEFAULT false,
        discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
        discount_type VARCHAR(20),
        discount_scope VARCHAR(30),
        discount_value NUMERIC(12, 2),
        discount_source VARCHAR(30),
        discount_reason VARCHAR(255),
        paid_at TIMESTAMPTZ,
        notes TEXT,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by UUID,
        updated_by UUID,
        deleted_at TIMESTAMPTZ,
        deleted_by UUID,
        CONSTRAINT student_payments_admission_application_id_fkey
          FOREIGN KEY (admission_application_id)
          REFERENCES %I.admission_applications(id)
          ON DELETE SET NULL
          ON UPDATE CASCADE,
        CONSTRAINT student_payments_student_id_fkey
          FOREIGN KEY (student_id)
          REFERENCES %I.students(id)
          ON DELETE SET NULL
          ON UPDATE CASCADE,
        CONSTRAINT student_payments_class_id_fkey
          FOREIGN KEY (class_id)
          REFERENCES %I.classes(id)
          ON DELETE SET NULL
          ON UPDATE CASCADE,
        CONSTRAINT student_payments_section_id_fkey
          FOREIGN KEY (section_id)
          REFERENCES %I.sections(id)
          ON DELETE SET NULL
          ON UPDATE CASCADE
      )
    $sql$, target_schema, target_schema, target_schema, target_schema, target_schema);

    EXECUTE format('CREATE INDEX IF NOT EXISTS student_payments_admission_application_id_idx ON %I.student_payments(admission_application_id)', target_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS student_payments_student_id_idx ON %I.student_payments(student_id)', target_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS student_payments_user_id_idx ON %I.student_payments(user_id)', target_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS student_payments_session_id_idx ON %I.student_payments(session_id)', target_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS student_payments_class_id_idx ON %I.student_payments(class_id)', target_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS student_payments_section_id_idx ON %I.student_payments(section_id)', target_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS student_payments_purpose_idx ON %I.student_payments(purpose)', target_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS student_payments_source_idx ON %I.student_payments(source)', target_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS student_payments_payment_method_idx ON %I.student_payments(payment_method)', target_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS student_payments_payment_status_idx ON %I.student_payments(payment_status)', target_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS student_payments_transaction_id_idx ON %I.student_payments(transaction_id)', target_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS student_payments_paid_at_idx ON %I.student_payments(paid_at)', target_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS student_payments_created_at_idx ON %I.student_payments(created_at)', target_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS student_payments_deleted_at_idx ON %I.student_payments(deleted_at)', target_schema);

    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = target_schema
        AND table_name = 'admission_applications'
        AND column_name = 'admission_fee_subtotal'
    )
    INTO has_fee_snapshot;

    IF has_fee_snapshot THEN
      EXECUTE format($sql$
      INSERT INTO %I.student_payments (
        payment_no,
        admission_application_id,
        student_id,
        session_id,
        class_id,
        section_id,
        purpose,
        source,
        payment_method,
        payment_status,
        transaction_id,
        original_amount,
        required_amount,
        paid_amount,
        due_amount,
        discount_applied,
        discount_amount,
        discount_type,
        discount_scope,
        discount_value,
        discount_source,
        discount_reason,
        paid_at,
        metadata,
        created_by,
        updated_by,
        created_at,
        updated_at
      )
      SELECT
        LEFT('SP-' || aa.application_no, 40),
        aa.id,
        aa.student_id,
        aa.session_id,
        aa.applying_class_id,
        aa.section_id,
        'admission_fee',
        aa.source,
        aa.payment_method,
        aa.payment_status,
        aa.transaction_id,
        COALESCE(aa.admission_fee_subtotal, aa.admission_payable_amount, aa.admission_fee_amount, 0),
        COALESCE(aa.admission_payable_amount, aa.admission_fee_amount, 0),
        COALESCE(aa.admission_fee_amount, 0),
        GREATEST(COALESCE(aa.admission_payable_amount, aa.admission_fee_amount, 0) - COALESCE(aa.admission_fee_amount, 0), 0),
        COALESCE(aa.admission_discount_amount, 0) > 0,
        COALESCE(aa.admission_discount_amount, 0),
        aa.discount_type,
        aa.discount_scope,
        aa.discount_value,
        aa.discount_source,
        aa.discount_reason,
        COALESCE(aa.paid_at, aa.submitted_at, aa.created_at),
        jsonb_build_object(
          'applicationNo', aa.application_no,
          'studentName', aa.student_name_en,
          'fatherMobile', aa.father_mobile,
          'backfilled', true
        ),
        aa.created_by,
        aa.updated_by,
        aa.created_at,
        now()
      FROM %I.admission_applications aa
      WHERE aa.deleted_at IS NULL
        AND COALESCE(aa.admission_fee_amount, 0) > 0
        AND NOT EXISTS (
          SELECT 1
          FROM %I.student_payments sp
          WHERE sp.admission_application_id = aa.id
            AND sp.deleted_at IS NULL
        )
      ON CONFLICT (payment_no) DO NOTHING
      $sql$, target_schema, target_schema, target_schema);
    ELSE
      EXECUTE format($sql$
        INSERT INTO %I.student_payments (
          payment_no,
          admission_application_id,
          student_id,
          session_id,
          class_id,
          section_id,
          purpose,
          source,
          payment_method,
          payment_status,
          transaction_id,
          original_amount,
          required_amount,
          paid_amount,
          due_amount,
          discount_applied,
          discount_amount,
          paid_at,
          metadata,
          created_by,
          updated_by,
          created_at,
          updated_at
        )
        SELECT
          LEFT('SP-' || aa.application_no, 40),
          aa.id,
          aa.student_id,
          aa.session_id,
          aa.applying_class_id,
          aa.section_id,
          'admission_fee',
          aa.source,
          aa.payment_method,
          aa.payment_status,
          aa.transaction_id,
          COALESCE(aa.admission_fee_amount, 0),
          COALESCE(aa.admission_fee_amount, 0),
          COALESCE(aa.admission_fee_amount, 0),
          0,
          false,
          0,
          COALESCE(aa.paid_at, aa.submitted_at, aa.created_at),
          jsonb_build_object(
            'applicationNo', aa.application_no,
            'studentName', aa.student_name_en,
            'fatherMobile', aa.father_mobile,
            'backfilled', true
          ),
          aa.created_by,
          aa.updated_by,
          aa.created_at,
          now()
        FROM %I.admission_applications aa
        WHERE aa.deleted_at IS NULL
          AND COALESCE(aa.admission_fee_amount, 0) > 0
          AND NOT EXISTS (
            SELECT 1
            FROM %I.student_payments sp
            WHERE sp.admission_application_id = aa.id
              AND sp.deleted_at IS NULL
          )
        ON CONFLICT (payment_no) DO NOTHING
      $sql$, target_schema, target_schema, target_schema);
    END IF;
  END LOOP;
END $$;
