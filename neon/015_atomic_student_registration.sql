-- Apply after 014. The caller receives a result only after every write succeeds.
BEGIN;

CREATE FUNCTION public.create_complete_student_enrollment(p_request_id text, p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  actor_id text := auth.user_id()::text;
  role_name text := public.gesco_role();
  student_input jsonb := p_payload->'student';
  parent_input jsonb := p_payload->'parents';
  payment_input jsonb := p_payload->'payment';
  assignment_input jsonb := p_payload->'assignment';
  year_id text := assignment_input->>'schoolYear';
  cls public.classes%ROWTYPE;
  selected_level_code text;
  schedule jsonb;
  student_data jsonb;
  enrollment_data jsonb;
  payment_data jsonb;
  parent_data jsonb;
  parent_record jsonb;
  parent_key text;
  parent_id text;
  payer_key text;
  payer_name text := '';
  payer_phone text := '';
  enrollment_id text;
  enrollment_record_id text;
  registration_fee numeric;
  tuition_fee numeric;
  canteen_fee numeric;
  transport_fee numeric;
  other_fees numeric;
  discount_value numeric;
  discount_amount numeric;
  total_due numeric;
  paid_amount numeric;
  installment_sum numeric;
  installments jsonb := '[]'::jsonb;
  installment jsonb;
  part_amount numeric;
  first_year integer;
  payment_id text;
  receipt text;
  i integer;
BEGIN
  IF role_name NOT IN ('ADMIN_GENERALE','DIRECTEUR','SECRETAIRE') OR actor_id IS NULL THEN
    RAISE EXCEPTION 'Accès à l’inscription refusé' USING ERRCODE = '42501';
  END IF;
  IF p_request_id IS NULL OR p_request_id !~ '^[0-9a-fA-F-]{36}$' OR jsonb_typeof(p_payload) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Demande d’inscription invalide';
  END IF;
  IF coalesce(length(trim(student_input->>'firstName')),0)=0 OR coalesce(length(trim(student_input->>'lastName')),0)=0
     OR coalesce(length(trim(year_id)),0)=0 OR parent_input->>'financialPayer' NOT IN ('FATHER','MOTHER','GUARDIAN') THEN
    RAISE EXCEPTION 'Identité, responsable ou année scolaire manquant';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('registration:' || p_request_id, 0));
  SELECT data INTO student_data FROM public.students WHERE id=p_request_id;
  enrollment_id := 'fin-' || p_request_id || '-' || year_id;
  payment_id := p_request_id || '-initial';
  IF student_data IS NOT NULL THEN
    IF student_data->>'registrationActorId' IS DISTINCT FROM actor_id
       OR student_data->>'firstName' IS DISTINCT FROM trim(student_input->>'firstName')
       OR student_data->>'lastName' IS DISTINCT FROM trim(student_input->>'lastName')
       OR student_data->>'schoolYear' IS DISTINCT FROM year_id THEN
      RAISE EXCEPTION 'Clé d’inscription déjà utilisée';
    END IF;
    SELECT data INTO enrollment_data FROM public.student_financial_enrollments WHERE id=enrollment_id;
    SELECT data INTO payment_data FROM public.tuition_payments WHERE id=payment_id;
    IF coalesce((payment_data->>'amount')::numeric,0) IS DISTINCT FROM (payment_input->>'paidAmount')::numeric THEN
      RAISE EXCEPTION 'Clé d’inscription déjà utilisée avec un autre montant';
    END IF;
    RETURN jsonb_build_object('student',student_data,'enrollment',enrollment_data,'payment',payment_data);
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('setting:school_years_list',0));
  IF NOT EXISTS (
    SELECT 1 FROM public.school_settings s, jsonb_array_elements(s.data) y
    WHERE s.id='school_years_list' AND (y->>'id'=year_id OR y->>'label'=year_id)
      AND NOT coalesce((y->>'isArchived')::boolean,false)
      AND NOT coalesce((y->>'isClosed')::boolean,false)
  ) THEN RAISE EXCEPTION 'Année scolaire introuvable ou clôturée'; END IF;

  IF nullif(assignment_input->>'classId','') IS NOT NULL THEN
    SELECT * INTO cls FROM public.classes WHERE id=assignment_input->>'classId' FOR UPDATE;
    IF NOT FOUND OR cls.status<>'ACTIVE' OR cls.school_year_id<>year_id THEN
      RAISE EXCEPTION 'Classe inactive ou année incompatible';
    END IF;
    IF coalesce((assignment_input->>'allowCapacityOverflow')::boolean,false) AND role_name<>'ADMIN_GENERALE' THEN
      RAISE EXCEPTION 'Seul l’administrateur peut déroger à la capacité';
    END IF;
    IF NOT coalesce((assignment_input->>'allowCapacityOverflow')::boolean,false)
       AND (SELECT count(*) FROM public.student_class_assignments WHERE classroom_id=cls.id AND status='Actif')>=cls.capacity THEN
      RAISE EXCEPTION 'Capacité maximale atteinte';
    END IF;
    SELECT code INTO selected_level_code FROM public.school_levels WHERE id=cls.level_id AND is_active AND NOT is_deleted;
  ELSE
    SELECT code INTO selected_level_code FROM public.school_levels WHERE id=assignment_input->>'levelId' AND is_active AND NOT is_deleted;
  END IF;
  IF selected_level_code IS NULL THEN RAISE EXCEPTION 'Niveau scolaire valide requis'; END IF;
  SELECT fees.data INTO schedule FROM public.tuition_fee_schedules fees
    WHERE fees.academic_year_id=year_id AND fees.level_code=selected_level_code AND fees.status='ACTIVE'
    FOR SHARE;
  IF schedule IS NULL THEN RAISE EXCEPTION 'Configurez les tarifs officiels de ce niveau'; END IF;

  registration_fee := (schedule->>'registrationFee')::numeric;
  tuition_fee := (schedule->>'tuitionFee')::numeric;
  IF payment_input->>'discountType' IS NULL OR payment_input->>'discountType' NOT IN ('FIXED','PERCENTAGE') THEN RAISE EXCEPTION 'Type de remise invalide'; END IF;
  IF jsonb_typeof(payment_input->'discountValue') IS DISTINCT FROM 'number'
     OR jsonb_typeof(payment_input->'paidAmount') IS DISTINCT FROM 'number' THEN
    RAISE EXCEPTION 'Montants numériques requis';
  END IF;
  discount_value := (payment_input->>'discountValue')::numeric;
  paid_amount := (payment_input->>'paidAmount')::numeric;
  IF (payment_input ? 'canteenFee' AND jsonb_typeof(payment_input->'canteenFee') IS DISTINCT FROM 'number')
     OR (payment_input ? 'transportFee' AND jsonb_typeof(payment_input->'transportFee') IS DISTINCT FROM 'number')
     OR (payment_input ? 'otherFees' AND jsonb_typeof(payment_input->'otherFees') IS DISTINCT FROM 'number') THEN
    RAISE EXCEPTION 'Frais annexes numériques requis';
  END IF;
  canteen_fee := coalesce((payment_input->>'canteenFee')::numeric,0);
  transport_fee := coalesce((payment_input->>'transportFee')::numeric,0);
  other_fees := coalesce((payment_input->>'otherFees')::numeric,0);
  IF canteen_fee<0 OR transport_fee<0 OR other_fees<0 THEN RAISE EXCEPTION 'Frais annexes invalides'; END IF;
  IF discount_value<0 OR paid_amount<0 OR (payment_input->>'discountType'='PERCENTAGE' AND discount_value>100) THEN
    RAISE EXCEPTION 'Remise ou paiement invalide';
  END IF;
  discount_amount := CASE WHEN payment_input->>'discountType'='PERCENTAGE'
    THEN round(tuition_fee*discount_value/100) ELSE discount_value END;
  total_due := registration_fee+tuition_fee+canteen_fee+transport_fee+other_fees-discount_amount;
  IF total_due<0 OR paid_amount>total_due THEN RAISE EXCEPTION 'Le versement dépasse le montant dû'; END IF;
  IF paid_amount>0 AND payment_input->>'paymentMode' NOT IN ('CASH','ORANGE_MONEY','MTN_MONEY','WAVE','TRANSFER','CHECK') THEN
    RAISE EXCEPTION 'Mode de paiement invalide';
  END IF;

  IF jsonb_typeof(payment_input->'customInstallments')='array' AND jsonb_array_length(payment_input->'customInstallments')>0 THEN
    installment_sum := 0;
    FOR installment IN SELECT value FROM jsonb_array_elements(payment_input->'customInstallments') LOOP
      IF jsonb_typeof(installment->'amountDue') IS DISTINCT FROM 'number' OR (installment->>'amountDue')::numeric<0 THEN
        RAISE EXCEPTION 'Échéance invalide';
      END IF;
      part_amount := (installment->>'amountDue')::numeric;
      installment_sum := installment_sum+part_amount;
      installments := installments || jsonb_build_array(jsonb_build_object(
        'number',jsonb_array_length(installments)+1,'label',coalesce(nullif(installment->>'label',''),'Échéance'),
        'dueDate',installment->>'dueDate','amountDue',part_amount,'amountPaid',0,'status','PENDING'));
    END LOOP;
    IF installment_sum<>total_due THEN RAISE EXCEPTION 'La somme des échéances doit égaler le montant dû'; END IF;
  ELSE
    first_year := split_part(year_id,'-',1)::integer;
    FOR i IN 1..8 LOOP
      part_amount := CASE WHEN i=1 THEN total_due-floor(greatest(total_due-registration_fee,0)/8)*7
        ELSE floor(greatest(total_due-registration_fee,0)/8) END;
      IF part_amount>0 OR (i=1 AND total_due=0) THEN
        installments := installments || jsonb_build_array(jsonb_build_object(
          'number',jsonb_array_length(installments)+1,'label','Échéance ' || (jsonb_array_length(installments)+1),
          'dueDate',to_char(make_date(first_year + CASE WHEN i>3 THEN 1 ELSE 0 END,
            (ARRAY[10,11,12,1,2,3,4,5])[i],5),'YYYY-MM-DD'),
          'amountDue',part_amount,'amountPaid',0,'status','PENDING'));
      END IF;
    END LOOP;
  END IF;

  payer_key := lower(parent_input->>'financialPayer');
  parent_record := parent_input->payer_key;
  IF parent_record IS NULL OR (coalesce(length(trim(parent_record->>'firstName')),0)=0
      AND coalesce(length(trim(parent_record->>'lastName')),0)=0)
      OR coalesce(length(trim(parent_record->>'phone')),0)=0 THEN
    RAISE EXCEPTION 'Responsable financier incomplet';
  END IF;
  payer_name := trim(coalesce(parent_record->>'lastName','') || ' ' || coalesce(parent_record->>'firstName',''));
  payer_phone := parent_record->>'phone';

  student_data := student_input || jsonb_build_object(
    'id',p_request_id,'matricule','MAT-' || split_part(year_id,'-',1) || '-' || upper(substr(replace(p_request_id,'-',''),1,12)),
    'firstName',trim(student_input->>'firstName'),'lastName',trim(student_input->>'lastName'),
    'status','Actif','feesStatus',CASE WHEN paid_amount>=total_due THEN 'Payé' WHEN paid_amount>0 THEN 'Partiel' ELSE 'En attente' END,
    'attendance',100,'parentName',payer_name,'parentPhone',payer_phone,'schoolYear',year_id,
    'schoolYearId',year_id,'classId',coalesce(cls.id,''),'className',coalesce(cls.name,'Non affecté'),
    'grade',coalesce(cls.name,'Non affecté'),'registrationActorId',actor_id);
  INSERT INTO public.students(id,matricule,data) VALUES(p_request_id,student_data->>'matricule',student_data);
  enrollment_record_id := gen_random_uuid()::text;
  INSERT INTO public.student_enrollments(id,student_id,school_year_id,data) VALUES(enrollment_record_id,p_request_id,year_id,
    jsonb_build_object('id',enrollment_record_id,'studentId',p_request_id,'schoolYearId',year_id,
      'classId',coalesce(cls.id,''),'enrollmentStatus','Inscrit'));
  IF cls.id IS NOT NULL THEN
    INSERT INTO public.student_class_assignments(id,student_id,classroom_id,academic_year_id,assignment_date,status)
    VALUES(gen_random_uuid()::text,p_request_id,cls.id,year_id,current_date,'Actif');
  END IF;

  FOR parent_key IN SELECT unnest(ARRAY['father','mother','guardian']) LOOP
    parent_record := parent_input->parent_key;
    IF parent_record IS NOT NULL AND (nullif(trim(coalesce(parent_record->>'firstName','')),'') IS NOT NULL
      OR nullif(trim(coalesce(parent_record->>'lastName','')),'') IS NOT NULL) THEN
      parent_id := gen_random_uuid()::text;
      parent_data := parent_record || jsonb_build_object('id',parent_id,'firstName',coalesce(parent_record->>'firstName',''),
        'lastName',coalesce(parent_record->>'lastName',''),'phonePrimary',coalesce(parent_record->>'phone',''),
        'relationshipType',CASE parent_key WHEN 'father' THEN 'Père' WHEN 'mother' THEN 'Mère'
          ELSE coalesce(parent_record->>'relationshipType','Tuteur Légal') END,'status','Actif');
      INSERT INTO public.parents(id,first_name,last_name,phone,email,address,profession,data)
      VALUES(parent_id,parent_data->>'firstName',parent_data->>'lastName',nullif(parent_data->>'phonePrimary',''),
        nullif(parent_data->>'email',''),nullif(parent_data->>'address',''),nullif(parent_data->>'profession',''),parent_data);
      INSERT INTO public.student_parent_links(id,student_id,parent_id,data)
      VALUES(gen_random_uuid()::text,p_request_id,parent_id,jsonb_build_object('relationshipType',parent_data->>'relationshipType',
        'isPrimary',parent_key=payer_key,'isPayer',parent_key=payer_key,'isFinancialEmergencyContact',parent_key=payer_key));
    END IF;
  END LOOP;

  enrollment_data := jsonb_build_object('id',enrollment_id,'studentId',p_request_id,
    'studentName',trim((student_data->>'lastName') || ' ' || (student_data->>'firstName')),
    'matricule',student_data->>'matricule','academicYearId',year_id,'classroomId',coalesce(cls.id,''),
    'className',coalesce(cls.name,'Non affecté'),'levelCode',selected_level_code,
    'parentSponsor',payer_name,'parentPhone',payer_phone,'registrationFee',registration_fee,
    'tuitionFee',tuition_fee,'canteenFee',canteen_fee,'transportFee',transport_fee,'otherFees',other_fees,
    'totalAnnualFee',registration_fee+tuition_fee+canteen_fee+transport_fee+other_fees,
    'discountType',payment_input->>'discountType','discountValue',discount_value,
    'discountAmount',discount_amount,'netTotalDue',total_due,'totalPaid',0,'remainingBalance',total_due,
    'installmentsCount',jsonb_array_length(installments),'installments',installments,'status','ACTIVE',
    'createdAt',now(),'updatedAt',now());
  INSERT INTO public.student_financial_enrollments(id,data) VALUES(enrollment_id,enrollment_data);
  IF paid_amount>0 THEN
    receipt := 'REC-' || to_char(current_date,'YYYY') || '-' || lpad(nextval('public.receipt_sequence')::text,8,'0');
    payment_data := jsonb_build_object('id',payment_id,'enrollmentId',enrollment_id,'academicYearId',year_id,
      'receiptNumber',receipt,'amount',paid_amount,'paymentDate',current_date,'paymentMode',payment_input->>'paymentMode',
      'referenceNumber',payment_input->>'paymentReference','remarks',payment_input->>'remarks',
      'recordedBy',(SELECT full_name FROM public.profiles WHERE id=actor_id),'status','VALIDATED',
      'createdAt',now(),'updatedAt',now());
    INSERT INTO public.tuition_payments(id,enrollment_id,receipt_number,data) VALUES(payment_id,enrollment_id,receipt,payment_data);
    enrollment_data := public.recalculate_enrollment(enrollment_id);
  END IF;
  INSERT INTO public.student_status_history(student_id,old_status,new_status,reason,created_by,data)
    VALUES(p_request_id,'Nouveau','Actif','Inscription initiale',actor_id,jsonb_build_object('eventType','INSCRIPTION'));
  INSERT INTO public.audit_logs(action,data) VALUES('STUDENT_REGISTRATION',jsonb_build_object(
    'studentId',p_request_id,'matricule',student_data->>'matricule','enrollmentId',enrollment_id,
    'paymentId',CASE WHEN paid_amount>0 THEN payment_id ELSE NULL END,'amount',paid_amount));
  RETURN jsonb_build_object('student',student_data,'enrollment',enrollment_data,'payment',payment_data);
END $$;

-- Keep subsequent finance edits consistent with the supplementary fees saved above.
CREATE OR REPLACE FUNCTION public.save_financial_enrollment(p_data jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  e jsonb;
  existing jsonb;
  reg numeric;
  tuition numeric;
  canteen numeric;
  transport numeric;
  other_fee numeric;
  discount_value numeric;
  discount numeric;
  due numeric;
  installment_total numeric := 0;
  part jsonb;
BEGIN
  PERFORM public.require_finance();
  IF nullif(p_data->>'id','') IS NULL OR nullif(p_data->>'academicYearId','') IS NULL
     OR nullif(p_data->>'studentId','') IS NULL THEN RAISE EXCEPTION 'Dossier, élève et année requis'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_data->>'id',0));
  SELECT data INTO existing FROM public.student_financial_enrollments WHERE id=p_data->>'id' FOR UPDATE;
  IF existing IS NOT NULL AND (existing->>'studentId' IS DISTINCT FROM p_data->>'studentId'
    OR existing->>'academicYearId' IS DISTINCT FROM p_data->>'academicYearId') THEN
    RAISE EXCEPTION 'Identité du dossier non modifiable';
  END IF;
  IF jsonb_typeof(p_data->'registrationFee') IS DISTINCT FROM 'number'
    OR jsonb_typeof(p_data->'tuitionFee') IS DISTINCT FROM 'number'
    OR jsonb_typeof(p_data->'discountValue') IS DISTINCT FROM 'number'
    OR (p_data ? 'canteenFee' AND jsonb_typeof(p_data->'canteenFee') IS DISTINCT FROM 'number')
    OR (p_data ? 'transportFee' AND jsonb_typeof(p_data->'transportFee') IS DISTINCT FROM 'number')
    OR (p_data ? 'otherFees' AND jsonb_typeof(p_data->'otherFees') IS DISTINCT FROM 'number') THEN
    RAISE EXCEPTION 'Montants numériques requis';
  END IF;
  reg := (p_data->>'registrationFee')::numeric;
  tuition := (p_data->>'tuitionFee')::numeric;
  canteen := coalesce((p_data->>'canteenFee')::numeric,0);
  transport := coalesce((p_data->>'transportFee')::numeric,0);
  other_fee := coalesce((p_data->>'otherFees')::numeric,0);
  discount_value := (p_data->>'discountValue')::numeric;
  IF reg<0 OR tuition<0 OR canteen<0 OR transport<0 OR other_fee<0 OR discount_value<0 THEN
    RAISE EXCEPTION 'Montants invalides';
  END IF;
  IF p_data->>'discountType' IS NULL OR p_data->>'discountType' NOT IN ('NONE','FIXED','PERCENTAGE')
    OR (p_data->>'discountType'='PERCENTAGE' AND discount_value>100) THEN RAISE EXCEPTION 'Remise invalide'; END IF;
  discount := CASE p_data->>'discountType' WHEN 'FIXED' THEN discount_value
    WHEN 'PERCENTAGE' THEN round(tuition*discount_value/100) ELSE 0 END;
  due := reg+tuition+canteen+transport+other_fee-discount;
  IF due<0 THEN RAISE EXCEPTION 'Remise supérieure au montant dû'; END IF;
  IF jsonb_typeof(p_data->'installments') IS DISTINCT FROM 'array'
    OR jsonb_array_length(p_data->'installments')=0 THEN RAISE EXCEPTION 'Échéancier requis'; END IF;
  FOR part IN SELECT value FROM jsonb_array_elements(p_data->'installments') LOOP
    IF jsonb_typeof(part->'amountDue') IS DISTINCT FROM 'number'
      OR (part->>'amountDue')::numeric<0 THEN RAISE EXCEPTION 'Échéance invalide'; END IF;
    installment_total := installment_total+(part->>'amountDue')::numeric;
  END LOOP;
  IF installment_total<>due THEN RAISE EXCEPTION 'La somme des échéances doit être égale au montant dû'; END IF;
  e := p_data || jsonb_build_object('totalAnnualFee',reg+tuition+canteen+transport+other_fee,
    'discountAmount',discount,'netTotalDue',due,'installmentsCount',jsonb_array_length(p_data->'installments'),
    'updatedAt',now(),'createdAt',coalesce(existing->'createdAt',to_jsonb(now())));
  INSERT INTO public.student_financial_enrollments(id,data) VALUES(e->>'id',e)
    ON CONFLICT(id) DO UPDATE SET data=excluded.data;
  RETURN public.recalculate_enrollment(e->>'id');
END $$;

REVOKE ALL ON FUNCTION public.create_complete_student_enrollment(text,jsonb) FROM PUBLIC,anonymous;
GRANT EXECUTE ON FUNCTION public.create_complete_student_enrollment(text,jsonb) TO authenticated;
COMMIT;
