-- Financial records for canteen and transport. Writes and enrollment balances are atomic.
BEGIN;
CREATE TABLE public.module_payments (
  id text PRIMARY KEY,
  module text NOT NULL CHECK (module IN ('CANTEEN', 'TRANSPORT')),
  enrollment_id text NOT NULL,
  receipt_number text NOT NULL UNIQUE,
  amount numeric NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'VALIDATED' CHECK (status IN ('VALIDATED', 'CANCELLED')),
  data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX module_payments_enrollment_idx ON public.module_payments(module, enrollment_id, created_at DESC);
ALTER TABLE public.module_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY module_payments_read ON public.module_payments FOR SELECT TO authenticated
  USING (public.gesco_role() IN ('ADMIN_GENERALE', 'DIRECTEUR', 'FINANCE', 'CAISSIER')
    OR (module = 'CANTEEN' AND public.gesco_role() IN ('CANTINE_TRANSPORT', 'RESP_CANTINE'))
    OR (module = 'TRANSPORT' AND public.gesco_role() IN ('CANTINE_TRANSPORT', 'RESP_TRANSPORT')));
GRANT SELECT ON public.module_payments TO authenticated;

CREATE FUNCTION public.record_module_payment(p_module text, p_payment jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  settings_key text;
  source_rows jsonb;
  updated_rows jsonb := '[]'::jsonb;
  enrollment jsonb;
  row_value jsonb;
  periods jsonb;
  period jsonb;
  updated_periods jsonb;
  period_paid numeric;
  period_due numeric;
  amount_value numeric;
  new_paid numeric;
  net_due numeric;
  found_record boolean := false;
BEGIN
  IF p_module = 'CANTEEN' AND public.gesco_role() IN ('ADMIN_GENERALE','DIRECTEUR','CANTINE_TRANSPORT','RESP_CANTINE') THEN
    settings_key := 'canteen_enrollments_data';
  ELSIF p_module = 'TRANSPORT' AND public.gesco_role() IN ('ADMIN_GENERALE','DIRECTEUR','CANTINE_TRANSPORT','RESP_TRANSPORT') THEN
    settings_key := 'transport_enrollments_data';
  ELSE RAISE EXCEPTION 'Accès paiement refusé'; END IF;
  IF p_payment->>'id' IS NULL OR p_payment->>'enrollmentId' IS NULL OR p_payment->>'receiptNumber' IS NULL THEN
    RAISE EXCEPTION 'Paiement incomplet';
  END IF;
  amount_value := (p_payment->>'amount')::numeric;
  IF amount_value <= 0 THEN RAISE EXCEPTION 'Montant invalide'; END IF;
  SELECT data INTO source_rows FROM public.school_settings WHERE id = settings_key FOR UPDATE;
  IF source_rows IS NULL OR jsonb_typeof(source_rows) <> 'array' THEN RAISE EXCEPTION 'Inscriptions introuvables'; END IF;
  FOR row_value IN SELECT value FROM jsonb_array_elements(source_rows) LOOP
    IF row_value->>'id' = p_payment->>'enrollmentId' THEN
      found_record := true;
      enrollment := row_value;
      net_due := (enrollment->>'netAmountDue')::numeric;
      new_paid := coalesce((enrollment->>'totalPaid')::numeric, 0) + amount_value;
      IF new_paid > net_due THEN RAISE EXCEPTION 'Paiement supérieur au solde'; END IF;
      periods := coalesce(enrollment->'periods', '[]'::jsonb);
      updated_periods := '[]'::jsonb;
      FOR period IN SELECT value FROM jsonb_array_elements(periods) LOOP
        IF p_payment ? 'periodNumber' AND period->>'number' = p_payment->>'periodNumber' THEN
          period_due := (period->>'amountDue')::numeric;
          period_paid := least(period_due, coalesce((period->>'amountPaid')::numeric, 0) + amount_value);
          period := period || jsonb_build_object('amountPaid', period_paid, 'status',
            CASE WHEN period_paid >= period_due THEN 'PAID' WHEN period_paid > 0 THEN 'PARTIAL' ELSE 'PENDING' END);
        END IF;
        updated_periods := updated_periods || jsonb_build_array(period);
      END LOOP;
      enrollment := enrollment || jsonb_build_object('totalPaid',new_paid,'remainingBalance',net_due-new_paid,
        'periods',updated_periods,'updatedAt',now()::text);
      updated_rows := updated_rows || jsonb_build_array(enrollment);
    ELSE
      updated_rows := updated_rows || jsonb_build_array(row_value);
    END IF;
  END LOOP;
  IF NOT found_record THEN RAISE EXCEPTION 'Inscription introuvable'; END IF;
  INSERT INTO public.module_payments(id,module,enrollment_id,receipt_number,amount,status,data)
  VALUES (p_payment->>'id',p_module,p_payment->>'enrollmentId',p_payment->>'receiptNumber',amount_value,
    'VALIDATED',p_payment || jsonb_build_object('status','VALIDATED'));
  UPDATE public.school_settings SET data = updated_rows, updated_at = now() WHERE id = settings_key;
  RETURN enrollment;
END $$;

CREATE FUNCTION public.cancel_module_payment(p_module text, p_id text, p_reason text DEFAULT '') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  settings_key text;
  payment_row public.module_payments%ROWTYPE;
  source_rows jsonb;
  updated_rows jsonb := '[]'::jsonb;
  row_value jsonb;
  periods jsonb;
  period jsonb;
  updated_periods jsonb;
  period_paid numeric;
  period_due numeric;
  new_paid numeric;
  net_due numeric;
  found_record boolean := false;
BEGIN
  IF p_module = 'CANTEEN' AND public.gesco_role() IN ('ADMIN_GENERALE','DIRECTEUR','CANTINE_TRANSPORT','RESP_CANTINE') THEN
    settings_key := 'canteen_enrollments_data';
  ELSIF p_module = 'TRANSPORT' AND public.gesco_role() IN ('ADMIN_GENERALE','DIRECTEUR','CANTINE_TRANSPORT','RESP_TRANSPORT') THEN
    settings_key := 'transport_enrollments_data';
  ELSE RAISE EXCEPTION 'Accès annulation refusé'; END IF;
  SELECT * INTO payment_row FROM public.module_payments WHERE id=p_id AND module=p_module FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Paiement introuvable'; END IF;
  IF payment_row.status = 'CANCELLED' THEN RAISE EXCEPTION 'Paiement déjà annulé'; END IF;
  SELECT data INTO source_rows FROM public.school_settings WHERE id=settings_key FOR UPDATE;
  IF source_rows IS NULL OR jsonb_typeof(source_rows) <> 'array' THEN RAISE EXCEPTION 'Inscriptions introuvables'; END IF;
  FOR row_value IN SELECT value FROM jsonb_array_elements(source_rows) LOOP
    IF row_value->>'id' = payment_row.enrollment_id THEN
      found_record := true;
      net_due := (row_value->>'netAmountDue')::numeric;
      new_paid := greatest(0, coalesce((row_value->>'totalPaid')::numeric,0) - payment_row.amount);
      periods := coalesce(row_value->'periods','[]'::jsonb);
      updated_periods := '[]'::jsonb;
      FOR period IN SELECT value FROM jsonb_array_elements(periods) LOOP
        IF payment_row.data ? 'periodNumber' AND period->>'number' = payment_row.data->>'periodNumber' THEN
          period_due := (period->>'amountDue')::numeric;
          period_paid := greatest(0, coalesce((period->>'amountPaid')::numeric,0) - payment_row.amount);
          period := period || jsonb_build_object('amountPaid',period_paid,'status',
            CASE WHEN period_paid >= period_due THEN 'PAID' WHEN period_paid > 0 THEN 'PARTIAL' ELSE 'PENDING' END);
        END IF;
        updated_periods := updated_periods || jsonb_build_array(period);
      END LOOP;
      row_value := row_value || jsonb_build_object('totalPaid',new_paid,'remainingBalance',net_due-new_paid,
        'periods',updated_periods,'updatedAt',now()::text);
    END IF;
    updated_rows := updated_rows || jsonb_build_array(row_value);
  END LOOP;
  IF NOT found_record THEN RAISE EXCEPTION 'Inscription introuvable'; END IF;
  UPDATE public.module_payments SET status='CANCELLED',updated_at=now(),
    data=data || jsonb_build_object('status','CANCELLED','cancelledAt',now()::text,
      'cancellationReason',coalesce(p_reason,'')) WHERE id=p_id;
  UPDATE public.school_settings SET data=updated_rows,updated_at=now() WHERE id=settings_key;
  RETURN updated_rows;
END $$;
REVOKE ALL ON FUNCTION public.record_module_payment(text,jsonb), public.cancel_module_payment(text,text,text) FROM PUBLIC, anonymous;
GRANT EXECUTE ON FUNCTION public.record_module_payment(text,jsonb), public.cancel_module_payment(text,text,text) TO authenticated;
COMMIT;
