-- ─────────────────────────────────────────────────────────────────────────────
-- GESCO V2 — SCRIPT DE NETTOYAGE / PURGE POUR PRODUCTION VIERGE
-- Ce script supprime toutes les données de test/démonstration et conserve
-- uniquement les structures système et l'Administrateur Général.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. PURGER TOUTES LES TABLES OPÉRATIONNELLES DE TEST
TRUNCATE TABLE student_financial_enrollments CASCADE;
TRUNCATE TABLE tuition_payments CASCADE;
TRUNCATE TABLE expenses CASCADE;
TRUNCATE TABLE assessment_results CASCADE;
TRUNCATE TABLE report_cards CASCADE;
TRUNCATE TABLE assessment_sessions CASCADE;
TRUNCATE TABLE canteen_enrollments CASCADE;
TRUNCATE TABLE canteen_menus CASCADE;
TRUNCATE TABLE transport_subscriptions CASCADE;
TRUNCATE TABLE transport_enrollments CASCADE;
TRUNCATE TABLE transport_routes CASCADE;
TRUNCATE TABLE student_parent_relations CASCADE;
TRUNCATE TABLE students CASCADE;
TRUNCATE TABLE parents CASCADE;
TRUNCATE TABLE staff_attendance CASCADE;
TRUNCATE TABLE staff_members CASCADE;
TRUNCATE TABLE class_subject_coefficients CASCADE;
TRUNCATE TABLE classes CASCADE;
TRUNCATE TABLE subjects CASCADE;

-- 2. CONSERVER ET RÉINITIALISER LE COMPTE ADMINISTRATEUR GÉNÉRAL UNIQUE
-- Remplacer 'admin@votre-ecole.com' par l'adresse email officielle de l'Administrateur
DELETE FROM profiles WHERE username != 'admin';

UPDATE profiles 
SET 
    username = 'admin',
    full_name = 'Administrateur Général',
    role = 'ADMIN',
    status = 'ACTIVE',
    updated_at = CURRENT_TIMESTAMP
WHERE username = 'admin';

-- 3. VERIFICATION CONSERVATION PARAMÈTRES SYSTÈME (cycles, levels, school_years, academic_terms)
-- Ces tables restent intactes pour permettre la configuration immédiate d'une nouvelle année.
