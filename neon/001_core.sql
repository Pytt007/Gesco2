-- GESCO: empty Neon database only. No demo users, passwords or business records.
BEGIN;
CREATE TABLE public.profiles (
  id text PRIMARY KEY,
  username text NOT NULL UNIQUE CHECK (username = lower(username)),
  full_name text NOT NULL,
  email text,
  avatar_url text,
  role text NOT NULL CHECK (role IN ('ADMIN_GENERALE','DIRECTEUR','FINANCE','CAISSIER','SECRETAIRE','ENSEIGNANT','SCOLAIRE_ENSEIGNANT','CANTINE_TRANSPORT','RESP_CANTINE','RESP_TRANSPORT')),
  status text NOT NULL DEFAULT 'ACTIF' CHECK (status IN ('ACTIF','SUSPENDU','VERROUILLE','INVITATION_ENVOYEE','DESACTIVE')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE FUNCTION public.gesco_role() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT role FROM public.profiles WHERE id = auth.user_id()::text AND status = 'ACTIF'
$$;
REVOKE ALL ON FUNCTION public.gesco_role() FROM PUBLIC;

CREATE FUNCTION public.guard_profile() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(73246101);
  IF TG_OP = 'UPDATE' AND (NEW.id <> OLD.id OR NEW.username <> OLD.username) THEN
    RAISE EXCEPTION 'Identité du compte non modifiable';
  END IF;
  IF TG_OP <> 'INSERT' AND OLD.role = 'ADMIN_GENERALE' AND OLD.status = 'ACTIF' THEN
    IF TG_OP = 'DELETE' OR NEW.role <> 'ADMIN_GENERALE' OR NEW.status <> 'ACTIF' THEN
      IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id <> OLD.id AND role='ADMIN_GENERALE' AND status='ACTIF') THEN
        RAISE EXCEPTION 'Le dernier administrateur actif doit être conservé';
      END IF;
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  IF NOT EXISTS (SELECT 1 FROM neon_auth."user" WHERE id::text = NEW.id) THEN
    RAISE EXCEPTION 'Identité Neon Auth introuvable';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_profile() FROM PUBLIC;
CREATE TRIGGER profiles_guard BEFORE INSERT OR UPDATE OR DELETE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.guard_profile();

CREATE TABLE public.school_settings (
  id text PRIMARY KEY,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.students (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  matricule text NOT NULL,
  data jsonb NOT NULL CHECK (jsonb_typeof(data)='object' AND length(trim(data->>'firstName')) > 0 AND length(trim(data->>'lastName')) > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX students_matricule_unique ON public.students(lower(matricule));
CREATE TABLE public.student_enrollments (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  student_id text NOT NULL REFERENCES public.students(id),
  school_year_id text NOT NULL,
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, school_year_id)
);
CREATE FUNCTION public.patch_student(p_id text, p_updates jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE result jsonb;
BEGIN
  UPDATE public.students SET data = (data || (p_updates - 'id')) || jsonb_build_object('id', id),
    matricule=coalesce(nullif(p_updates->>'matricule',''),matricule), updated_at=now()
    WHERE id=p_id RETURNING to_jsonb(students.*) INTO result;
  IF result IS NULL THEN RAISE EXCEPTION 'Élève introuvable ou accès refusé'; END IF;
  RETURN result;
END $$;
CREATE FUNCTION public.patch_student_enrollment(p_id text, p_updates jsonb) RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  UPDATE public.student_enrollments SET data=data || (p_updates - ARRAY['id','studentId','schoolYearId']) WHERE id=p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Inscription introuvable ou accès refusé'; END IF;
  RETURN true;
END $$;

CREATE TABLE public.tuition_fee_schedules (
  id text PRIMARY KEY,
  data jsonb NOT NULL,
  academic_year_id text GENERATED ALWAYS AS (data->>'academicYearId') STORED NOT NULL,
  level_code text GENERATED ALWAYS AS (data->>'levelCode') STORED NOT NULL,
  status text GENERATED ALWAYS AS (data->>'status') STORED NOT NULL,
  CHECK ((data->>'registrationFee')::numeric >= 0 AND (data->>'tuitionFee')::numeric >= 0)
);
CREATE UNIQUE INDEX tuition_fee_active_unique ON public.tuition_fee_schedules(academic_year_id,level_code) WHERE status='ACTIVE';
CREATE FUNCTION public.replace_tuition_fees(p_year text, p_records jsonb) RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF coalesce(public.gesco_role(),'') NOT IN ('ADMIN_GENERALE','DIRECTEUR') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_records) r WHERE r->>'academicYearId' IS DISTINCT FROM p_year) THEN RAISE EXCEPTION 'Année incohérente'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_year,2));
  DELETE FROM public.tuition_fee_schedules WHERE academic_year_id=p_year;
  INSERT INTO public.tuition_fee_schedules(id,data) SELECT r->>'id',r FROM jsonb_array_elements(p_records) r;
  RETURN true;
END $$;
CREATE TABLE public.student_financial_enrollments (
  id text PRIMARY KEY,
  data jsonb NOT NULL,
  student_id text GENERATED ALWAYS AS (data->>'studentId') STORED REFERENCES public.students(id),
  academic_year_id text GENERATED ALWAYS AS (data->>'academicYearId') STORED NOT NULL,
  status text GENERATED ALWAYS AS (data->>'status') STORED NOT NULL CHECK (status IN ('ACTIVE','ARCHIVED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id,academic_year_id)
);
CREATE SEQUENCE public.receipt_sequence;
CREATE TABLE public.tuition_payments (
  id text PRIMARY KEY,
  enrollment_id text NOT NULL REFERENCES public.student_financial_enrollments(id),
  receipt_number text NOT NULL UNIQUE,
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((data->>'amount')::numeric > 0),
  CHECK (data->>'status' IN ('VALIDATED','CANCELLED'))
);
CREATE TABLE public.audit_logs (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  actor_id text NOT NULL DEFAULT auth.user_id()::text,
  action text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE FUNCTION public.require_finance() RETURNS void
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF coalesce(public.gesco_role(),'') NOT IN ('ADMIN_GENERALE','DIRECTEUR','FINANCE','CAISSIER') THEN
    RAISE EXCEPTION 'Accès financier refusé' USING ERRCODE='42501';
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.require_finance() FROM PUBLIC;

CREATE FUNCTION public.recalculate_enrollment(p_id text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE e jsonb; paid numeric; rest numeric; part jsonb; parts jsonb := '[]'; allocation numeric;
BEGIN
  SELECT data INTO STRICT e FROM public.student_financial_enrollments WHERE id=p_id FOR UPDATE;
  SELECT coalesce(sum((data->>'amount')::numeric),0) INTO paid FROM public.tuition_payments WHERE enrollment_id=p_id AND data->>'status'='VALIDATED';
  rest := paid;
  FOR part IN SELECT value FROM jsonb_array_elements(e->'installments') LOOP
    allocation := least(rest,(part->>'amountDue')::numeric);
    rest := rest-allocation;
    part := part || jsonb_build_object('amountPaid',allocation,'status',CASE WHEN allocation >= (part->>'amountDue')::numeric THEN 'PAID' WHEN allocation>0 THEN 'PARTIAL' ELSE 'PENDING' END);
    parts := parts || jsonb_build_array(part);
  END LOOP;
  e := e || jsonb_build_object('totalPaid',paid,'remainingBalance',greatest(0,(e->>'netTotalDue')::numeric-paid),'installments',parts,'updatedAt',now());
  UPDATE public.student_financial_enrollments SET data=e WHERE id=p_id;
  RETURN e;
END $$;
REVOKE ALL ON FUNCTION public.recalculate_enrollment(text) FROM PUBLIC;

CREATE FUNCTION public.save_financial_enrollment(p_data jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE e jsonb; existing jsonb; due numeric; reg numeric; tuition numeric; discount numeric; discount_value numeric; installment_total numeric; part jsonb;
BEGIN
  PERFORM public.require_finance();
  IF nullif(p_data->>'id','') IS NULL OR nullif(p_data->>'academicYearId','') IS NULL THEN RAISE EXCEPTION 'Dossier et année requis'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_data->>'id',0));
  SELECT data INTO existing FROM public.student_financial_enrollments WHERE id=p_data->>'id' FOR UPDATE;
  IF existing IS NOT NULL AND (existing->>'studentId' IS DISTINCT FROM p_data->>'studentId' OR existing->>'academicYearId' IS DISTINCT FROM p_data->>'academicYearId') THEN RAISE EXCEPTION 'Identité du dossier non modifiable'; END IF;
  reg := (p_data->>'registrationFee')::numeric; tuition := (p_data->>'tuitionFee')::numeric; discount_value := (p_data->>'discountValue')::numeric;
  IF jsonb_typeof(p_data->'registrationFee') IS DISTINCT FROM 'number' OR jsonb_typeof(p_data->'tuitionFee') IS DISTINCT FROM 'number' OR jsonb_typeof(p_data->'discountValue') IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'Montants numériques requis'; END IF;
  IF reg IS NULL OR tuition IS NULL OR discount_value IS NULL OR reg<0 OR tuition<0 OR discount_value<0 THEN RAISE EXCEPTION 'Montants invalides'; END IF;
  IF p_data->>'discountType' NOT IN ('NONE','FIXED','PERCENTAGE') THEN RAISE EXCEPTION 'Remise invalide'; END IF;
  discount := CASE p_data->>'discountType' WHEN 'FIXED' THEN discount_value WHEN 'PERCENTAGE' THEN round(tuition*discount_value/100) ELSE 0 END;
  due := reg+tuition-discount;
  IF due<0 OR (p_data->>'discountType'='PERCENTAGE' AND discount_value>100) THEN RAISE EXCEPTION 'Remise supérieure au montant dû'; END IF;
  IF jsonb_typeof(p_data->'installments') IS DISTINCT FROM 'array' OR jsonb_array_length(p_data->'installments')=0 THEN RAISE EXCEPTION 'Échéancier requis'; END IF;
  installment_total:=0;
  FOR part IN SELECT value FROM jsonb_array_elements(p_data->'installments') LOOP
    IF (part->>'amountDue')::numeric IS NULL OR (part->>'amountDue')::numeric<0 THEN RAISE EXCEPTION 'Échéance invalide'; END IF;
    installment_total := installment_total + (part->>'amountDue')::numeric;
  END LOOP;
  IF installment_total<>due THEN RAISE EXCEPTION 'La somme des échéances doit être égale au montant dû'; END IF;
  e := p_data || jsonb_build_object('totalAnnualFee',reg+tuition,'discountAmount',discount,'netTotalDue',due,'installmentsCount',jsonb_array_length(p_data->'installments'),'updatedAt',now(),'createdAt',coalesce(existing->'createdAt',to_jsonb(now())));
  INSERT INTO public.student_financial_enrollments(id,data) VALUES(e->>'id',e) ON CONFLICT(id) DO UPDATE SET data=excluded.data;
  RETURN public.recalculate_enrollment(e->>'id');
END $$;

CREATE FUNCTION public.record_tuition_payment(p_request_id text, p_input jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE e jsonb; payment jsonb; amount numeric; receipt text; actor text;
BEGIN
  PERFORM public.require_finance();
  IF nullif(p_request_id,'') IS NULL THEN RAISE EXCEPTION 'Clé de requête requise'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id,1));
  SELECT data INTO payment FROM public.tuition_payments WHERE id=p_request_id;
  IF payment IS NOT NULL THEN
    IF payment->>'enrollmentId' IS DISTINCT FROM p_input->>'enrollmentId' OR (payment->>'amount')::numeric IS DISTINCT FROM (p_input->>'amount')::numeric THEN RAISE EXCEPTION 'Clé de paiement déjà utilisée'; END IF;
    SELECT data INTO e FROM public.student_financial_enrollments WHERE id=payment->>'enrollmentId';
    RETURN jsonb_build_object('payment',payment,'enrollment',e);
  END IF;
  SELECT data INTO e FROM public.student_financial_enrollments WHERE id=p_input->>'enrollmentId' FOR UPDATE;
  IF e IS NULL OR e->>'status'<>'ACTIVE' THEN RAISE EXCEPTION 'Dossier financier actif introuvable'; END IF;
  amount := (p_input->>'amount')::numeric;
  IF jsonb_typeof(p_input->'amount') IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'Montant numérique requis'; END IF;
  IF amount IS NULL OR amount<=0 OR amount>100000000000 THEN RAISE EXCEPTION 'Montant invalide'; END IF;
  IF p_input->>'paymentMode' IS NULL OR p_input->>'paymentMode' NOT IN ('CASH','ORANGE_MONEY','MTN_MONEY','WAVE','TRANSFER','CHECK') THEN RAISE EXCEPTION 'Mode de paiement invalide'; END IF;
  IF amount>(e->>'remainingBalance')::numeric AND NOT coalesce((p_input->>'confirmOverpayment')::boolean,false) THEN RAISE EXCEPTION 'Le versement dépasse le solde restant'; END IF;
  SELECT full_name INTO actor FROM public.profiles WHERE id=auth.user_id()::text;
  receipt := 'REC-' || to_char(current_date,'YYYY') || '-' || lpad(nextval('public.receipt_sequence')::text,8,'0');
  payment := jsonb_build_object('id',p_request_id,'enrollmentId',e->>'id','academicYearId',e->>'academicYearId','receiptNumber',receipt,'amount',amount,'paymentDate',coalesce(nullif(p_input->>'paymentDate','')::date,current_date),'paymentMode',p_input->>'paymentMode','referenceNumber',p_input->>'referenceNumber','remarks',p_input->>'remarks','recordedBy',actor,'status','VALIDATED','createdAt',now(),'updatedAt',now());
  INSERT INTO public.tuition_payments(id,enrollment_id,receipt_number,data) VALUES(p_request_id,e->>'id',receipt,payment);
  e := public.recalculate_enrollment(e->>'id');
  INSERT INTO public.audit_logs(action,data) VALUES('ENCAISSEMENT_SCOLARITE',jsonb_build_object('paymentId',p_request_id,'amount',amount));
  RETURN jsonb_build_object('payment',payment,'enrollment',e);
END $$;

CREATE FUNCTION public.cancel_tuition_payment(p_id text, p_reason text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE payment jsonb; enrollment text; actor text;
BEGIN
  PERFORM public.require_finance();
  IF length(trim(coalesce(p_reason,'')))<3 THEN RAISE EXCEPTION 'Motif requis'; END IF;
  SELECT enrollment_id INTO enrollment FROM public.tuition_payments WHERE id=p_id;
  IF enrollment IS NULL THEN RAISE EXCEPTION 'Paiement introuvable'; END IF;
  PERFORM 1 FROM public.student_financial_enrollments WHERE id=enrollment FOR UPDATE;
  SELECT data INTO payment FROM public.tuition_payments WHERE id=p_id FOR UPDATE;
  IF payment->>'status'='CANCELLED' THEN RETURN true; END IF;
  SELECT full_name INTO actor FROM public.profiles WHERE id=auth.user_id()::text;
  UPDATE public.tuition_payments SET data=data || jsonb_build_object('status','CANCELLED','cancellationReason',p_reason,'cancelledBy',actor,'cancelledAt',now(),'updatedAt',now()) WHERE id=p_id;
  PERFORM public.recalculate_enrollment(enrollment);
  INSERT INTO public.audit_logs(action,data) VALUES('ANNULATION_PAIEMENT',jsonb_build_object('paymentId',p_id,'reason',p_reason));
  RETURN true;
END $$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tuition_fee_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_financial_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tuition_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_read ON public.profiles FOR SELECT TO authenticated USING (id=auth.user_id()::text OR public.gesco_role()='ADMIN_GENERALE');
CREATE POLICY profiles_insert ON public.profiles FOR INSERT TO authenticated WITH CHECK (public.gesco_role()='ADMIN_GENERALE');
CREATE POLICY profiles_update ON public.profiles FOR UPDATE TO authenticated USING (public.gesco_role()='ADMIN_GENERALE') WITH CHECK (public.gesco_role()='ADMIN_GENERALE');
CREATE POLICY settings_read ON public.school_settings FOR SELECT TO authenticated USING (public.gesco_role() IS NOT NULL AND (id IN ('school_info','school_years_list','academic_terms_list','general_config') OR public.gesco_role() IN ('ADMIN_GENERALE','DIRECTEUR')));
CREATE POLICY settings_write ON public.school_settings FOR ALL TO authenticated USING (public.gesco_role() IN ('ADMIN_GENERALE','DIRECTEUR')) WITH CHECK (public.gesco_role() IN ('ADMIN_GENERALE','DIRECTEUR'));
CREATE POLICY students_read ON public.students FOR SELECT TO authenticated USING (public.gesco_role() IS NOT NULL);
CREATE POLICY students_write ON public.students FOR ALL TO authenticated USING (public.gesco_role() IN ('ADMIN_GENERALE','DIRECTEUR','SECRETAIRE')) WITH CHECK (public.gesco_role() IN ('ADMIN_GENERALE','DIRECTEUR','SECRETAIRE'));
CREATE POLICY enrollment_read ON public.student_enrollments FOR SELECT TO authenticated USING (public.gesco_role() IS NOT NULL);
CREATE POLICY enrollment_write ON public.student_enrollments FOR ALL TO authenticated USING (public.gesco_role() IN ('ADMIN_GENERALE','DIRECTEUR','SECRETAIRE')) WITH CHECK (public.gesco_role() IN ('ADMIN_GENERALE','DIRECTEUR','SECRETAIRE'));
CREATE POLICY fees_read ON public.tuition_fee_schedules FOR SELECT TO authenticated USING (public.gesco_role() IN ('ADMIN_GENERALE','DIRECTEUR','FINANCE','CAISSIER','SECRETAIRE'));
CREATE POLICY fees_write ON public.tuition_fee_schedules FOR ALL TO authenticated USING (public.gesco_role() IN ('ADMIN_GENERALE','DIRECTEUR')) WITH CHECK (public.gesco_role() IN ('ADMIN_GENERALE','DIRECTEUR'));
CREATE POLICY finances_read ON public.student_financial_enrollments FOR SELECT TO authenticated USING (public.gesco_role() IN ('ADMIN_GENERALE','DIRECTEUR','FINANCE','CAISSIER'));
CREATE POLICY payments_read ON public.tuition_payments FOR SELECT TO authenticated USING (public.gesco_role() IN ('ADMIN_GENERALE','DIRECTEUR','FINANCE','CAISSIER'));
CREATE POLICY audit_read ON public.audit_logs FOR SELECT TO authenticated USING (public.gesco_role() IN ('ADMIN_GENERALE','DIRECTEUR'));

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anonymous, authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anonymous, authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT,INSERT,UPDATE ON public.profiles TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.school_settings,public.students,public.student_enrollments,public.tuition_fee_schedules TO authenticated;
GRANT SELECT ON public.student_financial_enrollments,public.tuition_payments,public.audit_logs TO authenticated;
GRANT EXECUTE ON FUNCTION public.gesco_role(),public.patch_student(text,jsonb),public.patch_student_enrollment(text,jsonb),public.save_financial_enrollment(jsonb),public.record_tuition_payment(text,jsonb),public.cancel_tuition_payment(text,text),public.replace_tuition_fees(text,jsonb) TO authenticated;
COMMIT;
