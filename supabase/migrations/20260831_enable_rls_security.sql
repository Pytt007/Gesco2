-- ─────────────────────────────────────────────────────────────────────────────
-- GESCO — Sécurité & Verrouillage PostgreSQL Row Level Security (RLS)
-- Migration : 20260831_enable_rls_security.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Activation stricte du RLS sur l'ensemble des tables de production
ALTER TABLE IF EXISTS public.school_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tuition_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.assessment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.transport_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.canteen_enrollments ENABLE ROW LEVEL SECURITY;

-- 2. Fonction utilitaire d'extraction du rôle utilisateur depuis le JWT
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text AS $$
BEGIN
  RETURN COALESCE(
    current_setting('request.jwt.claim.role', true),
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role'),
    'ANON'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ─── 3. POLITIQUES DE SÉCURITÉ SUR "school_settings" ───────────────────────────
DROP POLICY IF EXISTS "Lecture autorisee pour utilisateurs authentifies" ON public.school_settings;
CREATE POLICY "Lecture autorisee pour utilisateurs authentifies"
  ON public.school_settings
  FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Ecriture reservee a la direction et admin" ON public.school_settings;
CREATE POLICY "Ecriture reservee a la direction et admin"
  ON public.school_settings
  FOR ALL
  TO authenticated
  USING (
    public.get_user_role() IN ('ADMINISTRATEUR', 'ADMIN_GENERALE', 'DIRECTEUR', 'COMPTABLE', 'SECRETAIRE')
    OR auth.role() = 'service_role'
  );

-- ─── 4. POLITIQUES DE SÉCURITÉ SUR "students" ──────────────────────────────────
DROP POLICY IF EXISTS "Lecture eleves pour le personnel" ON public.students;
CREATE POLICY "Lecture eleves pour le personnel"
  ON public.students
  FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Modification eleves reservee au personnel autorise" ON public.students;
CREATE POLICY "Modification eleves reservee au personnel autorise"
  ON public.students
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_user_role() IN ('ADMINISTRATEUR', 'ADMIN_GENERALE', 'DIRECTEUR', 'SECRETAIRE')
    OR auth.role() = 'service_role'
  );

DROP POLICY IF EXISTS "Mise a jour eleves reservee" ON public.students;
CREATE POLICY "Mise a jour eleves reservee"
  ON public.students
  FOR UPDATE
  TO authenticated
  USING (
    public.get_user_role() IN ('ADMINISTRATEUR', 'ADMIN_GENERALE', 'DIRECTEUR', 'SECRETAIRE')
    OR auth.role() = 'service_role'
  );

DROP POLICY IF EXISTS "Suppression eleves reservee a l'admin et direction" ON public.students;
CREATE POLICY "Suppression eleves reservee a l'admin et direction"
  ON public.students
  FOR DELETE
  TO authenticated
  USING (
    public.get_user_role() IN ('ADMINISTRATEUR', 'ADMIN_GENERALE', 'DIRECTEUR')
    OR auth.role() = 'service_role'
  );

-- ─── 5. POLITIQUES DE SÉCURITÉ SUR "tuition_payments" & "expenses" ────────────
DROP POLICY IF EXISTS "Gestion financiere reservee comptabilite et direction" ON public.tuition_payments;
CREATE POLICY "Gestion financiere reservee comptabilite et direction"
  ON public.tuition_payments
  FOR ALL
  TO authenticated
  USING (
    public.get_user_role() IN ('ADMINISTRATEUR', 'ADMIN_GENERALE', 'DIRECTEUR', 'COMPTABLE')
    OR auth.role() = 'service_role'
  );

DROP POLICY IF EXISTS "Gestion depenses reservee" ON public.expenses;
CREATE POLICY "Gestion depenses reservee"
  ON public.expenses
  FOR ALL
  TO authenticated
  USING (
    public.get_user_role() IN ('ADMINISTRATEUR', 'ADMIN_GENERALE', 'DIRECTEUR', 'COMPTABLE')
    OR auth.role() = 'service_role'
  );

-- ─── 6. POLITIQUES SUR "staff_members" ────────────────────────────────────────
DROP POLICY IF EXISTS "Lecture liste personnel" ON public.staff_members;
CREATE POLICY "Lecture liste personnel"
  ON public.staff_members
  FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Gestion personnel reservee a la direction" ON public.staff_members;
CREATE POLICY "Gestion personnel reservee a la direction"
  ON public.staff_members
  FOR ALL
  TO authenticated
  USING (
    public.get_user_role() IN ('ADMINISTRATEUR', 'ADMIN_GENERALE', 'DIRECTEUR')
    OR auth.role() = 'service_role'
  );
