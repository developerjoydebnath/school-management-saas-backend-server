-- Move subscription/payment ownership to payments.
-- One subscription can have many payment records across billing cycles.

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS subscription_id uuid;

UPDATE public.payments p
SET subscription_id = s.id
FROM public.school_subscriptions s
WHERE s.payment_id = p.id
  AND p.subscription_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'payments_subscription_id_fkey'
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_subscription_id_fkey
      FOREIGN KEY (subscription_id)
      REFERENCES public.school_subscriptions(id)
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS payments_subscription_id_idx
  ON public.payments(subscription_id);

DROP INDEX IF EXISTS public.school_subscriptions_payment_id_idx;

ALTER TABLE public.school_subscriptions
  DROP CONSTRAINT IF EXISTS school_subscriptions_payment_id_fkey;

ALTER TABLE public.school_subscriptions
  DROP COLUMN IF EXISTS payment_id;
