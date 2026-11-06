-- GESCO: tables des modules secondaires. Aucune donnée de démonstration.
BEGIN;

CREATE TABLE IF NOT EXISTS public.calendar_events (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title text NOT NULL,
  description text,
  start_date timestamptz NOT NULL,
  end_date timestamptz,
  all_day boolean NOT NULL DEFAULT false,
  type text,
  color text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.decision_rules (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name text NOT NULL,
  description text,
  priority integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.subject_categories (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  school_id text,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.subjects (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  school_id text,
  category_id text,
  code text NOT NULL,
  name text NOT NULL,
  short_name text,
  description text,
  is_composite boolean NOT NULL DEFAULT false,
  is_graded boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.subject_components (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  parent_subject_id text NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  child_subject_id text NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(parent_subject_id, child_subject_id)
);
CREATE TABLE IF NOT EXISTS public.level_subjects (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  school_id text,
  level_id text NOT NULL REFERENCES public.school_levels(id) ON DELETE CASCADE,
  subject_id text NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  is_required boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(level_id, subject_id)
);

CREATE TABLE IF NOT EXISTS public.assessment_sessions (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  academic_year_id text,
  title text NOT NULL,
  description text,
  session_type text,
  start_date date,
  end_date date,
  class_id text,
  level_id text,
  status text NOT NULL DEFAULT 'DRAFT',
  locked boolean NOT NULL DEFAULT false,
  data jsonb NOT NULL DEFAULT '{}',
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.assessment_results (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  assessment_session_id text NOT NULL REFERENCES public.assessment_sessions(id) ON DELETE CASCADE,
  student_id text NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  score numeric,
  average numeric,
  decision text,
  data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(assessment_session_id, student_id)
);
CREATE TABLE IF NOT EXISTS public.assessment_scores (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  assessment_result_id text NOT NULL REFERENCES public.assessment_results(id) ON DELETE CASCADE,
  subject_id text REFERENCES public.subjects(id) ON DELETE SET NULL,
  score numeric,
  coefficient numeric NOT NULL DEFAULT 1,
  data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.parents (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text,
  email text,
  address text,
  profession text,
  data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.medical_records (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  student_id text NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  blood_type text,
  allergies text,
  chronic_conditions text,
  medications text,
  emergency_contact text,
  data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id)
);
CREATE TABLE IF NOT EXISTS public.student_attendance (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  student_id text NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  date date NOT NULL,
  status text NOT NULL,
  reason text,
  data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, date)
);
CREATE TABLE IF NOT EXISTS public.student_documents (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  student_id text NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  file_name text,
  file_url text,
  data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.student_status_history (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  student_id text NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  reason text,
  created_by text,
  data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.staff (
  id text NOT NULL,
  school_year text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(id, school_year)
);
CREATE TABLE IF NOT EXISTS public.staff_members (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  role text,
  specialty text,
  hire_date date,
  base_salary numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.staff_departments (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.staff_positions (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  department_id text REFERENCES public.staff_departments(id) ON DELETE SET NULL,
  code text NOT NULL,
  title text NOT NULL,
  hierarchy_level integer NOT NULL DEFAULT 0,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.staff_contracts (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  staff_id text NOT NULL REFERENCES public.staff_members(id) ON DELETE CASCADE,
  contract_type text NOT NULL,
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'ACTIF',
  salary numeric,
  data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.staff_documents (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  staff_id text NOT NULL REFERENCES public.staff_members(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  file_name text,
  file_url text,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.transport_vehicles (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name text NOT NULL,
  brand text,
  model text,
  license_plate text NOT NULL UNIQUE,
  capacity integer NOT NULL CHECK (capacity > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.transport_drivers (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name text NOT NULL,
  phone text NOT NULL,
  license_number text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.expense_categories (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name text NOT NULL UNIQUE,
  color text,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.expense_budgets (
  academic_year_id text PRIMARY KEY,
  amount numeric NOT NULL DEFAULT 0 CHECK (amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.expenses (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  date date NOT NULL,
  category_id text REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  description text NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  payment_method text,
  status text NOT NULL DEFAULT 'VALIDATED',
  notes text,
  school_year text,
  data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fee_configs (id text NOT NULL, school_year text NOT NULL, data jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(id, school_year));
CREATE TABLE IF NOT EXISTS public.fee_records (id text NOT NULL, school_year text NOT NULL, data jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(id, school_year));
CREATE TABLE IF NOT EXISTS public.school_fees (id text NOT NULL, school_year text NOT NULL, data jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(id, school_year));
CREATE TABLE IF NOT EXISTS public.history_logs (id text NOT NULL, school_year text NOT NULL, data jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(id, school_year));
CREATE TABLE IF NOT EXISTS public.document_blocks (id text PRIMARY KEY DEFAULT gen_random_uuid()::text, type text, name text, content jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.document_templates (id text PRIMARY KEY DEFAULT gen_random_uuid()::text, name text NOT NULL, description text, type text, schema jsonb NOT NULL DEFAULT '{}', data jsonb NOT NULL DEFAULT '{}', is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.template_blocks (id text PRIMARY KEY DEFAULT gen_random_uuid()::text, template_id text NOT NULL REFERENCES public.document_templates(id) ON DELETE CASCADE, block_id text NOT NULL REFERENCES public.document_blocks(id) ON DELETE CASCADE, sort_order integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.generated_documents (id text PRIMARY KEY DEFAULT gen_random_uuid()::text, entity_type text, entity_id text, template_id text, generated_at timestamptz NOT NULL DEFAULT now(), file_url text, data jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now());

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['calendar_events','decision_rules','subject_categories','subjects','subject_components','level_subjects','assessment_sessions','assessment_results','assessment_scores','parents','medical_records','student_attendance','student_documents','student_status_history','staff','staff_members','staff_departments','staff_positions','staff_contracts','staff_documents','transport_vehicles','transport_drivers','expense_categories','expense_budgets','expenses','fee_configs','fee_records','school_fees','history_logs','document_blocks','document_templates','template_blocks','generated_documents'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anonymous, authenticated', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('CREATE POLICY module_read ON public.%I FOR SELECT TO authenticated USING (public.gesco_role() IS NOT NULL)', t);
    EXECUTE format('CREATE POLICY module_write ON public.%I FOR ALL TO authenticated USING (public.gesco_role() IN (''ADMIN_GENERALE'',''DIRECTEUR'',''SECRETAIRE'',''FINANCE'',''CAISSIER'',''ENSEIGNANT'',''CANTINE_TRANSPORT'',''RESP_CANTINE'',''RESP_TRANSPORT'')) WITH CHECK (public.gesco_role() IS NOT NULL)', t);
  END LOOP;
END $$;
COMMIT;
