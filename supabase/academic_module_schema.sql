-- =============================================================================
-- GESCO — MODULE 5 : STRUCTURE ACADÉMIQUE & DÉCOUPAGE PRÉSCOLAIRE / PRIMAIRE
-- (PostgreSQL / Supabase - Moteur Académique Socle)
-- =============================================================================
-- Script DDL Idempotent : Tables, Contraintes, Index, Seed & Politiques RLS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. TABLE : ACADEMIC_YEARS (GESTION DES ANNÉES SCOLAIRES)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS academic_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    name VARCHAR(50) NOT NULL,                           -- Ex: '2026-2027'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(50) NOT NULL DEFAULT 'Préparation',  -- 'Préparation' | 'Active' | 'Clôturée'
    
    -- Audit & Soft Delete
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

    CONSTRAINT chk_academic_year_dates CHECK (end_date > start_date),
    CONSTRAINT chk_academic_year_status CHECK (status IN ('Préparation', 'Active', 'Clôturée')),
    CONSTRAINT uq_academic_year_school_name UNIQUE (school_id, name)
);

-- Unicité partielle : Une seule année scolaire marquée comme courante (is_current = TRUE) par établissement
CREATE UNIQUE INDEX IF NOT EXISTS uq_academic_year_single_current 
    ON academic_years(school_id) 
    WHERE is_current = TRUE AND is_deleted = FALSE;

-- -----------------------------------------------------------------------------
-- 2. TABLE : SCHOOL_CYCLES (CYCLES PÉDAGOGIQUES)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS school_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    code VARCHAR(50) NOT NULL,                           -- Ex: 'PRESCHOOL', 'PRIMARY'
    name VARCHAR(100) NOT NULL,                         -- Ex: 'Préscolaire', 'Primaire'
    sort_order INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    -- Audit & Soft Delete
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_school_cycles_school_code UNIQUE (school_id, code)
);

-- -----------------------------------------------------------------------------
-- 3. TABLE : SCHOOL_LEVELS (NIVEAUX SCOLAIRES DE LA PETITE SECTION AU CM2)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS school_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    cycle_id UUID NOT NULL REFERENCES school_cycles(id) ON DELETE RESTRICT,
    code VARCHAR(50) NOT NULL,                           -- Ex: 'PS', 'MS', 'GS', 'CP1', 'CP2', 'CE1', 'CE2', 'CM1', 'CM2'
    name VARCHAR(100) NOT NULL,                         -- Ex: 'Petite Section', 'Cours Préparatoire 1ère Année'
    short_name VARCHAR(20) NOT NULL,                    -- Ex: 'PS', 'CP1', 'CM2'
    sort_order INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    -- Audit & Soft Delete
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_school_levels_school_code UNIQUE (school_id, code)
);

-- -----------------------------------------------------------------------------
-- 4. TABLE : CLASSROOMS (GESTION DES CLASSES ET SALLES)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS classrooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
    level_id UUID NOT NULL REFERENCES school_levels(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,                         -- Ex: 'PS A', 'CP1 B', 'CM2 A'
    room_name VARCHAR(100),                             -- Ex: 'Salle 102', 'Bâtiment B'
    capacity INT NOT NULL DEFAULT 35,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    -- Audit & Soft Delete
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

    CONSTRAINT chk_classroom_capacity CHECK (capacity > 0),
    CONSTRAINT uq_classrooms_year_level_name UNIQUE (school_id, academic_year_id, level_id, name)
);

-- -----------------------------------------------------------------------------
-- 5. TABLE : STUDENT_CLASS_ASSIGNMENTS (AFFECTATION DES ÉLÈVES AUX CLASSES)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS student_class_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE RESTRICT,
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
    assignment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    exit_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'Actif',         -- 'Actif' | 'Transféré' | 'Archivé'

    -- Audit & Soft Delete
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

    CONSTRAINT chk_assignment_status CHECK (status IN ('Actif', 'Transféré', 'Archivé'))
);

-- Unicité partielle : Un élève ne peut avoir qu'UNE SEULE affectation active par année scolaire
CREATE UNIQUE INDEX IF NOT EXISTS uq_student_single_active_assignment_per_year
    ON student_class_assignments(student_id, academic_year_id)
    WHERE status = 'Actif' AND is_deleted = FALSE;

-- -----------------------------------------------------------------------------
-- 6. INDEX DE PERFORMANCE OPTIMISÉS
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_academic_years_school ON academic_years(school_id, is_current) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_school_cycles_order ON school_cycles(school_id, sort_order) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_school_levels_cycle ON school_levels(cycle_id, sort_order) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_classrooms_year_level ON classrooms(academic_year_id, level_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_student_assignments_student ON student_class_assignments(student_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_student_assignments_classroom ON student_class_assignments(classroom_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_student_assignments_year_status ON student_class_assignments(academic_year_id, status) WHERE is_deleted = FALSE;

-- -----------------------------------------------------------------------------
-- 7. POLITIQUES RLS (ROW LEVEL SECURITY)
-- -----------------------------------------------------------------------------

ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_class_assignments ENABLE ROW LEVEL SECURITY;

-- Policy Lecture Authentifiée sur la structure académique
DROP POLICY IF EXISTS policy_academic_years_select ON academic_years;
CREATE POLICY policy_academic_years_select ON academic_years FOR SELECT TO authenticated USING (is_deleted = FALSE);

DROP POLICY IF EXISTS policy_school_cycles_select ON school_cycles;
CREATE POLICY policy_school_cycles_select ON school_cycles FOR SELECT TO authenticated USING (is_deleted = FALSE);

DROP POLICY IF EXISTS policy_school_levels_select ON school_levels;
CREATE POLICY policy_school_levels_select ON school_levels FOR SELECT TO authenticated USING (is_deleted = FALSE);

DROP POLICY IF EXISTS policy_classrooms_select ON classrooms;
CREATE POLICY policy_classrooms_select ON classrooms FOR SELECT TO authenticated USING (is_deleted = FALSE);

DROP POLICY IF EXISTS policy_student_assignments_select ON student_class_assignments;
CREATE POLICY policy_student_assignments_select ON student_class_assignments FOR SELECT TO authenticated USING (is_deleted = FALSE);

-- Policy Modification Administration RBAC
DROP POLICY IF EXISTS policy_academic_admin_all ON academic_years;
CREATE POLICY policy_academic_admin_all ON academic_years FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() 
          AND r.code IN ('ADMIN_GENERALE', 'SCOLAIRE_ENSEIGNANT')
          AND ur.is_deleted = FALSE
    )
);

DROP POLICY IF EXISTS policy_classrooms_admin_all ON classrooms;
CREATE POLICY policy_classrooms_admin_all ON classrooms FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() 
          AND r.code IN ('ADMIN_GENERALE', 'SCOLAIRE_ENSEIGNANT')
          AND ur.is_deleted = FALSE
    )
);

DROP POLICY IF EXISTS policy_assignments_admin_all ON student_class_assignments;
CREATE POLICY policy_assignments_admin_all ON student_class_assignments FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() 
          AND r.code IN ('ADMIN_GENERALE', 'SCOLAIRE_ENSEIGNANT')
          AND ur.is_deleted = FALSE
    )
);

-- -----------------------------------------------------------------------------
-- 8. DONNÉES INITIALES (SEED DE LA STRUCTURE IVOIRIENNE PRÉSCOLAIRE & PRIMAIRE)
-- -----------------------------------------------------------------------------

DO $$
DECLARE
    v_school_id UUID;
    v_preschool_cycle_id UUID;
    v_primary_cycle_id UUID;
    v_academic_year_id UUID;
BEGIN
    -- Récupération de l'établissement par défaut ou création si non existant
    SELECT id INTO v_school_id FROM schools LIMIT 1;
    IF v_school_id IS NULL THEN
        v_school_id := '00000000-0000-0000-0000-000000000001'::UUID;
        INSERT INTO schools (id, code, name) VALUES (v_school_id, 'SCH-DEFAULT', 'Établissement Pilote GESCO')
        ON CONFLICT (code) DO NOTHING;
    END IF;

    -- 1. Seed des Cycles Pédagogiques
    INSERT INTO school_cycles (school_id, code, name, sort_order)
    VALUES 
        (v_school_id, 'PRESCHOOL', 'Préscolaire', 1),
        (v_school_id, 'PRIMARY', 'Primaire', 2)
    ON CONFLICT (school_id, code) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_preschool_cycle_id;

    SELECT id INTO v_preschool_cycle_id FROM school_cycles WHERE school_id = v_school_id AND code = 'PRESCHOOL';
    SELECT id INTO v_primary_cycle_id FROM school_cycles WHERE school_id = v_school_id AND code = 'PRIMARY';

    -- 2. Seed des Niveaux Scolaires
    -- Cycle Préscolaire
    INSERT INTO school_levels (school_id, cycle_id, code, name, short_name, sort_order)
    VALUES
        (v_school_id, v_preschool_cycle_id, 'PS', 'Petite Section', 'PS', 1),
        (v_school_id, v_preschool_cycle_id, 'MS', 'Moyenne Section', 'MS', 2),
        (v_school_id, v_preschool_cycle_id, 'GS', 'Grande Section', 'GS', 3)
    ON CONFLICT (school_id, code) DO NOTHING;

    -- Cycle Primaire
    INSERT INTO school_levels (school_id, cycle_id, code, name, short_name, sort_order)
    VALUES
        (v_school_id, v_primary_cycle_id, 'CP1', 'Cours Préparatoire 1ère Année', 'CP1', 4),
        (v_school_id, v_primary_cycle_id, 'CP2', 'Cours Préparatoire 2ème Année', 'CP2', 5),
        (v_school_id, v_primary_cycle_id, 'CE1', 'Cours Élémentaire 1ère Année', 'CE1', 6),
        (v_school_id, v_primary_cycle_id, 'CE2', 'Cours Élémentaire 2ème Année', 'CE2', 7),
        (v_school_id, v_primary_cycle_id, 'CM1', 'Cours Moyen 1ère Année', 'CM1', 8),
        (v_school_id, v_primary_cycle_id, 'CM2', 'Cours Moyen 2ème Année', 'CM2', 9)
    ON CONFLICT (school_id, code) DO NOTHING;

    -- 3. Seed Année Scolaire Courante (2026-2027)
    INSERT INTO academic_years (school_id, name, start_date, end_date, is_current, status)
    VALUES (v_school_id, '2026-2027', '2026-09-15', '2027-06-30', TRUE, 'Active')
    ON CONFLICT (school_id, name) DO NOTHING;

END $$;
