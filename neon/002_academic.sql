BEGIN;
ALTER TABLE public.school_settings ADD COLUMN revision bigint NOT NULL DEFAULT 1;

CREATE TABLE public.school_cycles (
 id text PRIMARY KEY, school_id text, code text NOT NULL UNIQUE CHECK(length(trim(code))>0),
 name text NOT NULL CHECK(length(trim(name))>0), sort_order integer NOT NULL DEFAULT 1,
 is_active boolean NOT NULL DEFAULT true, is_deleted boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.school_levels (
 id text PRIMARY KEY, school_id text, cycle_id text NOT NULL REFERENCES public.school_cycles(id),
 code text NOT NULL UNIQUE CHECK(length(trim(code))>0), name text NOT NULL CHECK(length(trim(name))>0),
 short_name text NOT NULL DEFAULT '', sort_order integer NOT NULL DEFAULT 1,
 is_active boolean NOT NULL DEFAULT true, is_deleted boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.classes (
 id text PRIMARY KEY,school_id text,school_year_id text NOT NULL,level_id text NOT NULL REFERENCES public.school_levels(id),
 name text NOT NULL CHECK(length(trim(name))>0),room text NOT NULL DEFAULT '',main_teacher_id text,main_teacher_name text,
 capacity integer NOT NULL CHECK(capacity>0),status text NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','INACTIVE')),
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX classes_unique_year_name ON public.classes(school_year_id,lower(name));
CREATE TABLE public.student_class_assignments (
 id text PRIMARY KEY, student_id text NOT NULL REFERENCES public.students(id), classroom_id text NOT NULL REFERENCES public.classes(id),
 academic_year_id text NOT NULL, assignment_date date NOT NULL, exit_date date,
 status text NOT NULL CHECK(status IN ('Actif','Transféré','Archivé')),
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX assignments_one_active ON public.student_class_assignments(student_id,academic_year_id) WHERE status='Actif';
CREATE INDEX assignments_class ON public.student_class_assignments(classroom_id,status);

-- Legitimate school catalogs; no students, staff or payments are seeded.
INSERT INTO public.school_cycles(id,code,name,sort_order) VALUES ('cyc-1','PRESCHOOL','Préscolaire',1),('cyc-2','PRIMARY','Primaire',2);
INSERT INTO public.school_levels(id,cycle_id,code,name,short_name,sort_order) VALUES
 ('lvl-garderie','cyc-1','GARDERIE','Garderie','Garderie',0),('lvl-ps','cyc-1','PS','Petite Section','PS',1),
 ('lvl-ms','cyc-1','MS','Moyenne Section','MS',2),('lvl-gs','cyc-1','GS','Grande Section','GS',3),
 ('lvl-cp1','cyc-2','CP1','Cours Préparatoire 1','CP1',4),('lvl-cp2','cyc-2','CP2','Cours Préparatoire 2','CP2',5),
 ('lvl-ce1','cyc-2','CE1','Cours Élémentaire 1','CE1',6),('lvl-ce2','cyc-2','CE2','Cours Élémentaire 2','CE2',7),
 ('lvl-cm1','cyc-2','CM1','Cours Moyen 1','CM1',8),('lvl-cm2','cyc-2','CM2','Cours Moyen 2','CM2',9);

CREATE FUNCTION public.save_setting(p_id text,p_data jsonb,p_revision bigint) RETURNS bigint
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
   IF coalesce(length(trim(year->>'id')),0)=0 OR coalesce(length(trim(year->>'label')),0)=0 OR year->>'startDate' IS NULL OR year->>'endDate' IS NULL OR (year->>'startDate')::date >= (year->>'endDate')::date THEN RAISE EXCEPTION 'Année scolaire invalide'; END IF;
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

CREATE FUNCTION public.guard_class() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('setting:school_years_list',0));
 IF NOT EXISTS(SELECT 1 FROM public.school_settings s,jsonb_array_elements(s.data)y WHERE s.id='school_years_list' AND y->>'id'=NEW.school_year_id AND NOT coalesce((y->>'isArchived')::boolean,false)) THEN RAISE EXCEPTION 'Année scolaire introuvable ou archivée'; END IF;
 IF NEW.status='ACTIVE' AND NOT EXISTS(SELECT 1 FROM public.school_levels WHERE id=NEW.level_id AND is_active AND NOT is_deleted) THEN RAISE EXCEPTION 'Niveau inactif'; END IF;
 IF TG_OP='UPDATE' AND EXISTS(SELECT 1 FROM public.student_class_assignments WHERE classroom_id=OLD.id) AND (NEW.school_year_id<>OLD.school_year_id OR NEW.level_id<>OLD.level_id) THEN RAISE EXCEPTION 'Une classe utilisée ne peut changer de niveau ou d’année'; END IF;
 IF (SELECT count(*) FROM public.student_class_assignments WHERE classroom_id=NEW.id AND status='Actif')>NEW.capacity THEN RAISE EXCEPTION 'La capacité ne peut être inférieure à l’effectif actif'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_class BEFORE INSERT OR UPDATE ON public.classes FOR EACH ROW EXECUTE FUNCTION public.guard_class();
CREATE FUNCTION public.guard_school_level() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF NOT NEW.is_active AND EXISTS(SELECT 1 FROM public.classes WHERE level_id=NEW.id AND status='ACTIVE') THEN RAISE EXCEPTION 'Ce niveau contient des classes actives'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_school_level BEFORE UPDATE ON public.school_levels FOR EACH ROW EXECUTE FUNCTION public.guard_school_level();

CREATE FUNCTION public.assign_student(p_id text,p_student_id text,p_classroom_id text,p_year_id text,p_date date,p_ignore_capacity boolean DEFAULT false) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE cls public.classes; old_assignment public.student_class_assignments; result jsonb;
BEGIN
 IF coalesce(public.gesco_role(),'') NOT IN ('ADMIN_GENERALE','DIRECTEUR','SECRETAIRE') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('assignment:'||p_student_id||':'||p_year_id,0));
 SELECT * INTO cls FROM public.classes WHERE id=p_classroom_id FOR UPDATE;
 IF NOT FOUND OR cls.status<>'ACTIVE' OR cls.school_year_id<>p_year_id THEN RAISE EXCEPTION 'Classe inactive ou année incompatible'; END IF;
 SELECT * INTO old_assignment FROM public.student_class_assignments WHERE student_id=p_student_id AND academic_year_id=p_year_id AND status='Actif';
 IF old_assignment.classroom_id=p_classroom_id THEN RETURN to_jsonb(old_assignment); END IF;
 IF p_ignore_capacity AND public.gesco_role()<>'ADMIN_GENERALE' THEN RAISE EXCEPTION 'Seul l’administrateur peut déroger à la capacité'; END IF;
 IF NOT p_ignore_capacity AND (SELECT count(*) FROM public.student_class_assignments WHERE classroom_id=p_classroom_id AND status='Actif')>=cls.capacity THEN RAISE EXCEPTION 'Capacité maximale atteinte'; END IF;
 IF p_date IS NULL THEN RAISE EXCEPTION 'Date requise'; END IF;
 UPDATE public.student_class_assignments SET status='Transféré',exit_date=p_date,updated_at=now() WHERE id=old_assignment.id;
 INSERT INTO public.student_class_assignments(id,student_id,classroom_id,academic_year_id,assignment_date,status) VALUES(p_id,p_student_id,p_classroom_id,p_year_id,p_date,'Actif') RETURNING to_jsonb(student_class_assignments) INTO result;
 UPDATE public.students SET data=data||jsonb_build_object('classId',cls.id,'className',cls.name,'grade',(SELECT code FROM public.school_levels WHERE id=cls.level_id),'schoolYearId',p_year_id),updated_at=now() WHERE id=p_student_id;
 INSERT INTO public.audit_logs(id,action,data)VALUES(gen_random_uuid()::text,'STUDENT_ASSIGNED',result);
 RETURN result;
END $$;
CREATE FUNCTION public.archive_assignment(p_id text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE item public.student_class_assignments;
BEGIN
 IF coalesce(public.gesco_role(),'') NOT IN ('ADMIN_GENERALE','DIRECTEUR','SECRETAIRE') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
 SELECT * INTO item FROM public.student_class_assignments WHERE id=p_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Affectation introuvable'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('assignment:'||item.student_id||':'||item.academic_year_id,0));
 UPDATE public.student_class_assignments SET status='Archivé',exit_date=current_date,updated_at=now() WHERE id=p_id;
 UPDATE public.students SET data=data-'classId'-'className',updated_at=now() WHERE id=item.student_id AND data->>'classId'=item.classroom_id AND NOT EXISTS(SELECT 1 FROM public.student_class_assignments WHERE student_id=item.student_id AND status='Actif');
END $$;

DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['school_cycles','school_levels','classes','student_class_assignments'] LOOP
 EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anonymous,authenticated',t);
 EXECUTE format('GRANT SELECT ON public.%I TO authenticated',t);
 EXECUTE format('CREATE POLICY read_active_users ON public.%I FOR SELECT TO authenticated USING (public.gesco_role() IS NOT NULL)',t);
 IF t<>'student_class_assignments' THEN
  EXECUTE format('GRANT INSERT,UPDATE,DELETE ON public.%I TO authenticated',t);
  EXECUTE format('CREATE POLICY write_management ON public.%I FOR ALL TO authenticated USING (public.gesco_role() IN (''ADMIN_GENERALE'',''DIRECTEUR'')) WITH CHECK (public.gesco_role() IN (''ADMIN_GENERALE'',''DIRECTEUR''))',t);
 END IF;
END LOOP;END $$;
REVOKE ALL ON FUNCTION public.save_setting(text,jsonb,bigint),public.guard_class(),public.guard_school_level(),public.assign_student(text,text,text,text,date,boolean),public.archive_assignment(text) FROM PUBLIC,anonymous;
GRANT EXECUTE ON FUNCTION public.save_setting(text,jsonb,bigint),public.assign_student(text,text,text,text,date,boolean),public.archive_assignment(text) TO authenticated;
COMMIT;
