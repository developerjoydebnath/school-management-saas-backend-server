CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuidv7(),
  transaction_no VARCHAR(50) NOT NULL UNIQUE,
  gateway VARCHAR(50) NOT NULL,
  gateway_transaction_id VARCHAR(120),
  gateway_validation_id VARCHAR(120),
  gateway_bank_transaction_id VARCHAR(120),
  merchant_tran_id VARCHAR(100) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'initiated',
  amount NUMERIC(12, 2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'BDT',
  payable_type VARCHAR(40) NOT NULL DEFAULT 'admission',
  payable_id UUID NOT NULL,
  admission_application_id UUID,
  student_payment_id UUID,
  student_id UUID,
  user_id UUID,
  payment_method_id UUID,
  payment_method_name VARCHAR(120),
  payment_method_provider VARCHAR(50),
  request_payload JSONB,
  response_payload JSONB,
  validation_payload JSONB,
  failure_reason TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS payment_transactions_gateway_idx ON payment_transactions(gateway);
CREATE INDEX IF NOT EXISTS payment_transactions_merchant_tran_id_idx ON payment_transactions(merchant_tran_id);
CREATE INDEX IF NOT EXISTS payment_transactions_status_idx ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS payment_transactions_payable_idx ON payment_transactions(payable_type, payable_id);
CREATE INDEX IF NOT EXISTS payment_transactions_admission_application_id_idx ON payment_transactions(admission_application_id);
