-- ─────────────────────────────────────────────────────────────────────────────
-- GESCO — Procédure Stockée RPC d'Inscription Atomique Transactionnelle (ACID)
-- Migration : 20260831_rpc_atomic_enrollment.sql
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_complete_student_enrollment(p_payload JSONB)
RETURNS JSONB AS $$
DECLARE
  v_student_id TEXT;
  v_matricule TEXT;
  v_first_name TEXT;
  v_last_name TEXT;
  v_gender TEXT;
  v_grade TEXT;
  v_school_year TEXT;
  v_parent_id TEXT;
  v_parent_phone TEXT;
  v_payment_id TEXT;
  v_paid_amount NUMERIC;
  v_receipt_number TEXT;
  v_result JSONB;
BEGIN
  -- 1. Extraction et validation des données d'entrée
  v_student_id := COALESCE(p_payload->'student'->>'id', gen_random_uuid()::text);
  v_matricule  := p_payload->'student'->>'matricule';
  v_first_name := TRIM(p_payload->'student'->>'firstName');
  v_last_name  := TRIM(p_payload->'student'->>'lastName');
  v_gender     := p_payload->'student'->>'gender';
  v_grade      := p_payload->'assignment'->>'classId';
  v_school_year:= COALESCE(p_payload->'schoolYear', '2026-2027');

  IF v_first_name IS NULL OR v_first_name = '' OR v_last_name IS NULL OR v_last_name = '' THEN
    RAISE EXCEPTION 'Le prénom et le nom de l''élève sont obligatoires.';
  END IF;

  -- 2. Insertion ou mise à jour de l'élève
  INSERT INTO public.students (
    id, matricule, first_name, last_name, gender, class_id, school_year, status, created_at
  ) VALUES (
    v_student_id,
    COALESCE(v_matricule, 'MAT-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD((FLOOR(RANDOM()*9000)+1000)::text, 4, '0')),
    v_first_name,
    v_last_name,
    CASE WHEN v_gender = 'Féminin' THEN 'F' ELSE 'M' END,
    v_grade,
    v_school_year,
    'ACTIVE',
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name  = EXCLUDED.last_name,
    updated_at = NOW();

  -- 3. Insertion du parent / tuteur légal
  v_parent_id    := COALESCE(p_payload->'parents'->'father'->>'id', gen_random_uuid()::text);
  v_parent_phone := p_payload->'parents'->'father'->>'phonePrimary';

  IF v_parent_phone IS NOT NULL AND v_parent_phone <> '' THEN
    INSERT INTO public.parents (
      id, first_name, last_name, phone_primary, address, created_at
    ) VALUES (
      v_parent_id,
      COALESCE(p_payload->'parents'->'father'->>'firstName', 'Parent'),
      COALESCE(p_payload->'parents'->'father'->>'lastName', v_last_name),
      v_parent_phone,
      p_payload->'parents'->'father'->>'address',
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- 4. Insertion du paiement initial si applicable
  v_paid_amount := (p_payload->'payment'->>'paidAmount')::NUMERIC;
  IF v_paid_amount IS NOT NULL AND v_paid_amount > 0 THEN
    v_payment_id := 'pay-' || EXTRACT(EPOCH FROM NOW())::BIGINT::text;
    v_receipt_number := 'REC-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-' || LPAD((FLOOR(RANDOM()*9000)+1000)::text, 4, '0');

    INSERT INTO public.tuition_payments (
      id, receipt_number, student_id, amount, payment_method, payment_date, notes, created_at
    ) VALUES (
      v_payment_id,
      v_receipt_number,
      v_student_id,
      v_paid_amount,
      COALESCE(p_payload->'payment'->>'paymentMode', 'CASH'),
      NOW(),
      p_payload->'payment'->>'paymentReference',
      NOW()
    );
  END IF;

  -- 5. Construction de la réponse atomique
  v_result := jsonb_build_object(
    'success', true,
    'studentId', v_student_id,
    'matricule', v_matricule,
    'receiptNumber', v_receipt_number,
    'timestamp', NOW()
  );

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  -- En cas de défaillance, la transaction PostgreSQL entière est automatiquement annulée (ROLLBACK)
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
