-- An official end date may be unknown when the school year is first configured.
-- Keep the revision, role, uniqueness and linked-data guards from 002_academic.sql.
CREATE OR REPLACE FUNCTION public.save_setting(p_id text,p_data jsonb,p_revision bigint) RETURNS bigint
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE current_revision bigint; next_revision bigint; year jsonb; old_year jsonb;
BEGIN
 IF p_id NOT IN ('school_info','school_years_list','academic_terms_list','general_config') THEN RAISE EXCEPTION 'Paramètre non reconnu'; END IF;
 IF coalesce(public.gesco_role(),'') NOT IN ('ADMIN_GENERALE','DIRECTEUR') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('setting:'||p_id,0));
 SELECT revision INTO current_revision FROM public.school_settings WHERE id=p_id FOR UPDATE;
 IF p_revision IS DISTINCT FROM coalesce(current_revision,0) THEN RAISE EXCEPTION 'Ces paramètres ont été modifiés ailleurs. Actualisez avant de réessayer.'; END IF;
 IF p_id IN ('school_years_list','academic_terms_list') AND jsonb_typeof(p_data) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Liste attendue'; END IF;
 IF p_id='school_years_list' THEN
  IF (SELECT count(*) FROM jsonb_array_elements(p_data) x WHERE (x->>'isActive')::boolean)>1 THEN RAISE EXCEPTION 'Une seule année active est autorisée'; END IF;
  IF (SELECT count(*) FROM jsonb_array_elements(p_data))<>(SELECT count(DISTINCT x->>'id') FROM jsonb_array_elements(p_data)x) THEN RAISE EXCEPTION 'Identifiants année dupliqués'; END IF;
  IF (SELECT count(*) FROM jsonb_array_elements(p_data))<>(SELECT count(DISTINCT lower(x->>'label')) FROM jsonb_array_elements(p_data)x) THEN RAISE EXCEPTION 'Libellés année dupliqués'; END IF;
  FOR year IN SELECT value FROM jsonb_array_elements(p_data) LOOP
   IF coalesce(length(trim(year->>'id')),0)=0 OR coalesce(length(trim(year->>'label')),0)=0 OR coalesce(length(trim(year->>'startDate')),0)=0 THEN RAISE EXCEPTION 'Année scolaire invalide'; END IF;
   PERFORM (year->>'startDate')::date;
   IF nullif(trim(year->>'endDate'),'') IS NOT NULL THEN
    IF (year->>'startDate')::date >= (year->>'endDate')::date THEN RAISE EXCEPTION 'Année scolaire invalide'; END IF;
   END IF;
   IF coalesce((year->>'isActive')::boolean,false) AND (coalesce((year->>'isClosed')::boolean,false) OR coalesce((year->>'isArchived')::boolean,false)) THEN RAISE EXCEPTION 'Une année clôturée ou archivée ne peut être active'; END IF;
  END LOOP;
  FOR old_year IN SELECT value FROM jsonb_array_elements(coalesce((SELECT data FROM public.school_settings WHERE id=p_id),'[]')) LOOP
   IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p_data)x WHERE x->>'id'=old_year->>'id') AND (
    EXISTS(SELECT 1 FROM public.classes WHERE school_year_id=old_year->>'id') OR
    EXISTS(SELECT 1 FROM public.student_enrollments WHERE school_year_id=old_year->>'id') OR
    EXISTS(SELECT 1 FROM public.student_financial_enrollments WHERE academic_year_id=old_year->>'id') OR
    EXISTS(SELECT 1 FROM public.tuition_fee_schedules WHERE academic_year_id=old_year->>'id') OR
    EXISTS(SELECT 1 FROM public.students WHERE data->>'schoolYearId'=old_year->>'id' OR data->>'academicYearId'=old_year->>'id')
   ) THEN RAISE EXCEPTION 'Année utilisée : archivez-la au lieu de la supprimer'; END IF;
  END LOOP;
 END IF;
 next_revision:=coalesce(current_revision,0)+1;
 INSERT INTO public.school_settings(id,data,revision,updated_at)VALUES(p_id,p_data,next_revision,now())
 ON CONFLICT(id)DO UPDATE SET data=excluded.data,revision=excluded.revision,updated_at=excluded.updated_at;
 RETURN next_revision;
END $$;
