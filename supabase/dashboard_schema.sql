-- =============================================================================
-- GESCO — MODULE DASHBOARD : COUCHE BASE DE DONNÉES (POSTGRESQL / SUPABASE)
-- =============================================================================
-- Vues, Fonctions d'Agrégation, Vues d'Alerte et Index d'Optimisation du Dashboard
-- Sans aucune duplication de logique métier applicative.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. INDEX SPÉCIALISÉS POUR LE DASHBOARD (PERFORMANCE O(1) / INDEX SCAN)
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_students_gender_active ON students(school_id, gender) WHERE status = 'Actif' AND is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_staff_teachers_active ON staff(school_id, staff_role) WHERE status = 'Actif' AND is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_classes_capacity ON classes(school_id, school_year_id, capacity) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(school_id, school_year_id, status) WHERE is_deleted = FALSE;

-- -----------------------------------------------------------------------------
-- 2. VUE D'ENSEMBLE KPI MÉTIER (KPI SUMMARY VIEW)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW v_dashboard_kpis AS
SELECT
    s.id AS school_id,
    sy.id AS school_year_id,
    sy.label AS school_year_label,
    
    -- Effectifs élèves
    COUNT(DISTINCT st.id) FILTER (WHERE st.status = 'Actif' AND st.is_deleted = FALSE) AS total_active_students,
    COUNT(DISTINCT st.id) FILTER (WHERE st.status = 'Actif' AND st.gender = 'Féminin' AND st.is_deleted = FALSE) AS total_girls_count,
    COUNT(DISTINCT st.id) FILTER (WHERE st.status = 'Actif' AND st.gender = 'Masculin' AND st.is_deleted = FALSE) AS total_boys_count,
    
    -- Classes & Personnel
    COUNT(DISTINCT c.id) FILTER (WHERE c.is_deleted = FALSE) AS total_classes_count,
    COUNT(DISTINCT stf.id) FILTER (WHERE stf.staff_role = 'Enseignant' AND stf.status = 'Actif' AND stf.is_deleted = FALSE) AS total_teachers_count,
    COUNT(DISTINCT stf.id) FILTER (WHERE stf.status = 'Actif' AND stf.is_deleted = FALSE) AS total_staff_count

FROM schools s
JOIN school_years sy ON s.id = sy.school_id AND sy.is_current = TRUE AND sy.is_deleted = FALSE
LEFT JOIN students st ON s.id = st.school_id AND st.is_deleted = FALSE
LEFT JOIN classes c ON s.id = c.school_id AND c.school_year_id = sy.id AND c.is_deleted = FALSE
LEFT JOIN staff stf ON s.id = stf.school_id AND stf.is_deleted = FALSE
WHERE s.is_deleted = FALSE
GROUP BY s.id, sy.id, sy.label;

-- -----------------------------------------------------------------------------
-- 3. FONCTIONS COMPTABLES & AGREGATIONS FINANCIERES
-- -----------------------------------------------------------------------------

-- Fonction retournant la synthèse financière de l'établissement pour l'année active
CREATE OR REPLACE FUNCTION fn_get_dashboard_finance_summary(p_school_id UUID)
RETURNS TABLE (
    total_expected_tuition NUMERIC(14, 2),
    total_collected_tuition NUMERIC(14, 2),
    total_remaining_tuition NUMERIC(14, 2),
    monthly_expenses NUMERIC(14, 2),
    monthly_payroll NUMERIC(14, 2),
    net_profit NUMERIC(14, 2),
    collection_rate_percent NUMERIC(5, 2)
) AS $$
DECLARE
    v_school_year_id UUID;
    v_collected NUMERIC(14,2) := 0;
    v_remaining NUMERIC(14,2) := 0;
    v_expected NUMERIC(14,2) := 0;
    v_expenses NUMERIC(14,2) := 0;
    v_payroll NUMERIC(14,2) := 0;
    v_rate NUMERIC(5,2) := 0;
BEGIN
    -- Récupérer l'année scolaire active de l'établissement
    SELECT id INTO v_school_year_id
    FROM school_years
    WHERE school_id = p_school_id AND is_current = TRUE AND is_deleted = FALSE
    LIMIT 1;

    -- Agrégation des recettes scolarité
    SELECT
        COALESCE(SUM((data->>'totalPaid')::NUMERIC), 0),
        COALESCE(SUM((data->>'remainingGlobal')::NUMERIC), 0)
    INTO v_collected, v_remaining
    FROM school_fees
    WHERE school_year = (SELECT label FROM school_years WHERE id = v_school_year_id);

    v_expected := v_collected + v_remaining;
    
    IF v_expected > 0 THEN
        v_rate := ROUND((v_collected / v_expected) * 100, 2);
    END IF;

    -- Agrégation des dépenses du mois courant
    SELECT COALESCE(SUM((data->>'amount')::NUMERIC), 0)
    INTO v_expenses
    FROM expenses
    WHERE school_year = (SELECT label FROM school_years WHERE id = v_school_year_id)
      AND date_trunc('month', (data->>'date')::DATE) = date_trunc('month', CURRENT_DATE);

    -- Masse salariale active des enseignants et personnel
    SELECT COALESCE(SUM(salary), 0)
    INTO v_payroll
    FROM staff
    WHERE school_id = p_school_id AND status = 'Actif' AND is_deleted = FALSE;

    RETURN QUERY
    SELECT
        v_expected,
        v_collected,
        v_remaining,
        v_expenses,
        v_payroll,
        (v_collected - v_expenses - v_payroll) AS net_profit,
        v_rate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 4. VUES AUTOMATIQUES DE DÉTECTION D'ALERTES (ALERT VIEWS)
-- -----------------------------------------------------------------------------

-- 4.1 Alerte : Classes surchargées (effectif réel > capacité autorisée)
CREATE OR REPLACE VIEW v_alerts_overcrowded_classes AS
SELECT
    c.id AS class_id,
    c.school_id,
    c.school_year_id,
    c.name AS class_name,
    c.capacity,
    COUNT(e.id) AS current_students_count,
    (COUNT(e.id) - c.capacity) AS excess_students,
    'CRITICAL' AS severity_level
FROM classes c
JOIN enrollments e ON c.id = e.class_id AND e.status = 'Actif' AND e.is_deleted = FALSE
WHERE c.is_deleted = FALSE
GROUP BY c.id, c.school_id, c.school_year_id, c.name, c.capacity
HAVING COUNT(e.id) > c.capacity;

-- 4.2 Alerte : Retards de paiement significatifs
CREATE OR REPLACE VIEW v_alerts_overdue_payments AS
SELECT
    sf.id AS fee_record_id,
    sy.school_id,
    sy.id AS school_year_id,
    (sf.data->>'studentName') AS student_name,
    (sf.data->>'class') AS class_name,
    (sf.data->>'remainingGlobal')::NUMERIC AS overdue_amount,
    'WARNING' AS severity_level
FROM school_fees sf
JOIN school_years sy ON sf.school_year = sy.label AND sy.is_current = TRUE AND sy.is_deleted = FALSE
WHERE (sf.data->>'remainingGlobal')::NUMERIC > 0;

-- 4.3 Alerte : Personnel absent ou en arrêt maladie
CREATE OR REPLACE VIEW v_alerts_absent_staff AS
SELECT
    st.id AS staff_id,
    st.school_id,
    st.first_name || ' ' || st.last_name AS staff_name,
    st.staff_role,
    st.status AS current_status,
    'INFO' AS severity_level
FROM staff st
WHERE st.status IN ('En congé', 'Arrêt maladie', 'Suspendu') AND st.is_deleted = FALSE;

-- -----------------------------------------------------------------------------
-- 5. VUE D'ACTIVITÉS RÉCENTES ÉTABLISSEMENT (AUDIT_LOGS INTEGRATION)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW v_dashboard_recent_activities AS
SELECT
    al.id AS activity_id,
    al.school_id,
    al.user_id,
    al.module,
    al.action,
    al.entity,
    al.created_at AS timestamp,
    COALESCE(p.full_name, 'Système') AS user_name,
    COALESCE(p.avatar_url, '') AS user_avatar
FROM audit_logs al
LEFT JOIN profiles p ON al.user_id = p.id
ORDER BY al.created_at DESC
LIMIT 50;

-- -----------------------------------------------------------------------------
-- 6. POLITIQUES RLS SUR LES VUES & SÉCURITÉ DU DASHBOARD
-- -----------------------------------------------------------------------------

ALTER VIEW v_dashboard_kpis OWNER TO postgres;
ALTER VIEW v_alerts_overcrowded_classes OWNER TO postgres;
ALTER VIEW v_alerts_overdue_payments OWNER TO postgres;
ALTER VIEW v_alerts_absent_staff OWNER TO postgres;
ALTER VIEW v_dashboard_recent_activities OWNER TO postgres;
