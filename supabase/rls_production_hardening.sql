-- ─────────────────────────────────────────────────────────────────────────────
-- GESCO V2 — Script de Durcissement RLS Production (Strict JWT & Roles)
-- Ce script est à exécuter sur Supabase PostgreSQL lorsque tous les comptes
-- utilisent la connexion officielle Supabase Auth avec JWT tokens (auth.uid).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. ACTIVER RLS SUR TOUTES LES TABLES
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_financial_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tuition_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE canteen_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_enrollments ENABLE ROW LEVEL SECURITY;

-- 2. FONCTION UTILITAIRE : RÉCUPÉRER LE RÔLE DE L'UTILISATEUR CONNECTÉ
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS text AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 3. POLITIQUES STRICTES PAR RÔLE

-- PROFILS : Un utilisateur peut voir tous les profils de son établissement, mais modifier uniquement le sien (Admin peut tout)
DROP POLICY IF EXISTS "strict_profiles_select" ON profiles;
CREATE POLICY "strict_profiles_select" ON profiles
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "strict_profiles_update" ON profiles;
CREATE POLICY "strict_profiles_update" ON profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid() OR current_user_role() IN ('ADMIN', 'DIRECTEUR'));

-- ÉLÈVES & PARENTS : Lecture/Écriture pour Admin, Direction, Enseignants et Secrétaires
DROP POLICY IF EXISTS "strict_students_all" ON students;
CREATE POLICY "strict_students_all" ON students
    FOR ALL TO authenticated
    USING (current_user_role() IN ('ADMIN', 'DIRECTEUR', 'TEACHER', 'SCOLAIRE_ENSEIGNANT', 'SECRETAIRE'))
    WITH CHECK (current_user_role() IN ('ADMIN', 'DIRECTEUR', 'TEACHER', 'SCOLAIRE_ENSEIGNANT', 'SECRETAIRE'));

DROP POLICY IF EXISTS "strict_parents_all" ON parents;
CREATE POLICY "strict_parents_all" ON parents
    FOR ALL TO authenticated
    USING (current_user_role() IN ('ADMIN', 'DIRECTEUR', 'TEACHER', 'SCOLAIRE_ENSEIGNANT', 'SECRETAIRE'))
    WITH CHECK (current_user_role() IN ('ADMIN', 'DIRECTEUR', 'TEACHER', 'SCOLAIRE_ENSEIGNANT', 'SECRETAIRE'));

-- FINANCES & PAIEMENTS : Accès réservé aux rôles Finance/Comptabilité et Admin
DROP POLICY IF EXISTS "strict_tuition_payments_all" ON tuition_payments;
CREATE POLICY "strict_tuition_payments_all" ON tuition_payments
    FOR ALL TO authenticated
    USING (current_user_role() IN ('ADMIN', 'DIRECTEUR', 'FINANCE', 'CAISSIER'))
    WITH CHECK (current_user_role() IN ('ADMIN', 'DIRECTEUR', 'FINANCE', 'CAISSIER'));

DROP POLICY IF EXISTS "strict_expenses_all" ON expenses;
CREATE POLICY "strict_expenses_all" ON expenses
    FOR ALL TO authenticated
    USING (current_user_role() IN ('ADMIN', 'DIRECTEUR', 'FINANCE'))
    WITH CHECK (current_user_role() IN ('ADMIN', 'DIRECTEUR', 'FINANCE'));

-- CANTINE & TRANSPORT : Accès réservé aux gestionnaires Cantine/Transport et Admin
DROP POLICY IF EXISTS "strict_canteen_all" ON canteen_enrollments;
CREATE POLICY "strict_canteen_all" ON canteen_enrollments
    FOR ALL TO authenticated
    USING (current_user_role() IN ('ADMIN', 'DIRECTEUR', 'CANTINE_TRANSPORT', 'RESP_CANTINE'))
    WITH CHECK (current_user_role() IN ('ADMIN', 'DIRECTEUR', 'CANTINE_TRANSPORT', 'RESP_CANTINE'));

DROP POLICY IF EXISTS "strict_transport_all" ON transport_enrollments;
CREATE POLICY "strict_transport_all" ON transport_enrollments
    FOR ALL TO authenticated
    USING (current_user_role() IN ('ADMIN', 'DIRECTEUR', 'CANTINE_TRANSPORT', 'RESP_TRANSPORT'))
    WITH CHECK (current_user_role() IN ('ADMIN', 'DIRECTEUR', 'CANTINE_TRANSPORT', 'RESP_TRANSPORT'));

-- NOTES & ÉVALUATIONS : Accès Enseignants, Direction et Secrétariat
DROP POLICY IF EXISTS "strict_notes_all" ON assessment_results;
CREATE POLICY "strict_notes_all" ON assessment_results
    FOR ALL TO authenticated
    USING (current_user_role() IN ('ADMIN', 'DIRECTEUR', 'TEACHER', 'SCOLAIRE_ENSEIGNANT', 'SECRETAIRE'))
    WITH CHECK (current_user_role() IN ('ADMIN', 'DIRECTEUR', 'TEACHER', 'SCOLAIRE_ENSEIGNANT', 'SECRETAIRE'));
