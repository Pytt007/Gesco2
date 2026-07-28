-- =============================================================================
-- GESCO — MODULE 2 : GESTION DES ÉLÈVES (COUCHE BASE DE DONNÉES POSTGRESQL / SUPABASE)
-- =============================================================================
-- Script DDL Idempotent : Tables, Contraintes, Index, Triggers d'Historisation & RLS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. TABLE PRINCIPALE : STUDENTS (INFORMATIONS PERMANENTES DE L'ÉLÈVE)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    registration_number VARCHAR(50) UNIQUE NOT NULL, -- Matricule unique
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    gender VARCHAR(20) NOT NULL, -- 'Masculin' | 'Féminin'
    birth_date DATE NOT NULL,
    birth_place VARCHAR(150),
    nationality VARCHAR(100) DEFAULT 'Ivoirienne',
    avatar_url TEXT,
    address TEXT,
    city_district VARCHAR(100),
    neighborhood VARCHAR(100),
    
    -- Audit & Soft Delete
    status VARCHAR(50) NOT NULL DEFAULT 'Actif', -- 'Actif' | 'Inactif' | 'Suspendu' | 'Archivé' | 'Transféré'
    archived_at TIMESTAMPTZ,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

    CONSTRAINT chk_students_gender CHECK (gender IN ('Masculin', 'Féminin')),
    CONSTRAINT chk_students_status CHECK (status IN ('Actif', 'Inactif', 'Suspendu', 'Archivé', 'Transféré'))
);

-- -----------------------------------------------------------------------------
-- 2. TABLE : STUDENT_ENROLLMENTS (HISTORIQUE PAR ANNÉE SCOLAIRE ET CLASSE)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS student_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    school_year_id UUID NOT NULL REFERENCES school_years(id) ON DELETE RESTRICT,
    level_id UUID,                                     -- Référence au niveau académique (6ème, 5ème, 2nde, etc.)
    class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    enrollment_status VARCHAR(50) NOT NULL DEFAULT 'Inscrit', -- 'Inscrit' | 'Réinscrit' | 'Abandon' | 'Exclu' | 'Diplômé'
    registration_number VARCHAR(50),
    has_scholarship BOOLEAN NOT NULL DEFAULT FALSE,
    scholarship_rate NUMERIC(5,2) DEFAULT 0.00,
    observations TEXT,

    -- Audit & Soft Delete
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

    CONSTRAINT chk_enrollment_status CHECK (enrollment_status IN ('Inscrit', 'Réinscrit', 'Abandon', 'Exclu', 'Diplômé')),
    CONSTRAINT uq_student_school_year UNIQUE (student_id, school_year_id) -- 1 seule inscription active par année scolaire
);

-- -----------------------------------------------------------------------------
-- 3. TABLE : MEDICAL_RECORDS (DOSSIER MÉDICAL DE L'ÉLÈVE)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS medical_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    blood_type VARCHAR(10),                             -- Ex: 'A+', 'O+', 'AB-'
    allergies TEXT,
    known_diseases TEXT,
    treatments TEXT,
    referring_doctor VARCHAR(150),
    emergency_phone VARCHAR(50) NOT NULL,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    -- Audit & Soft Delete
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

    CONSTRAINT chk_medical_blood_type CHECK (blood_type IS NULL OR blood_type IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'))
);

-- Index d'unicité partielle : 1 seul dossier médical actif par élève
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_medical_record ON medical_records(student_id) WHERE is_active = TRUE AND is_deleted = FALSE;

-- -----------------------------------------------------------------------------
-- 4. TABLE : STUDENT_DOCUMENTS (GESTION DOCUMENTAIRE EN STOCKAGE)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS student_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    doc_name VARCHAR(255) NOT NULL,
    doc_type VARCHAR(100) NOT NULL,                    -- 'Extrait de Naissance' | 'Certificat Médical' | 'Photo' | 'Bulletin' | 'Autre'
    storage_path TEXT NOT NULL,                        -- Chemin Supabase Storage (ex: 'students/docs/ext_123.pdf')
    file_size INT,                                     -- Taille en octets
    mime_type VARCHAR(100),
    uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

    -- Audit & Soft Delete
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_doc_type CHECK (doc_type IN ('Extrait de Naissance', 'Certificat Médical', 'Photo', 'Jugement', 'Certificat Précédent', 'Autre'))
);

-- -----------------------------------------------------------------------------
-- 5. TABLE : STUDENT_STATUS_HISTORY (HISTORIQUE AUTOMATIQUE DES STATUTS)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS student_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    previous_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,                  -- 'INSCRIPTION' | 'CHANGEMENT_CLASSE' | 'REINSCRIPTION' | 'ARCHIVAGE' | 'REACTIVATION'
    reason TEXT,
    changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 6. INDEX DE PERFORMANCE OPTIMISÉS
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_students_matricule ON students(registration_number) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_students_names ON students(last_name, first_name) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_students_school_status ON students(school_id, status) WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_enrollments_lookup ON student_enrollments(student_id, school_year_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_enrollments_class ON student_enrollments(class_id, school_year_id) WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_medical_records_student ON medical_records(student_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_documents_student ON student_documents(student_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_status_history_student ON student_status_history(student_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- 7. TRIGGERS : HISTORISATION & ALIMENTATION AUDIT_LOGS AUTOMATIQUE
-- -----------------------------------------------------------------------------

-- Trigger 7.1 : Historisation automatique des changements de statut d'un élève
CREATE OR REPLACE FUNCTION fn_track_student_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO student_status_history (
            student_id,
            school_id,
            previous_status,
            new_status,
            event_type,
            reason,
            changed_by
        ) VALUES (
            NEW.id,
            NEW.school_id,
            OLD.status,
            NEW.status,
            CASE 
                WHEN NEW.status = 'Archivé' THEN 'ARCHIVAGE'
                WHEN OLD.status = 'Archivé' AND NEW.status = 'Actif' THEN 'REACTIVATION'
                ELSE 'CHANGEMENT_STATUT'
            END,
            'Mise à jour automatique du statut élève',
            NEW.updated_by
        );

        -- Alimentation directe de la table d'audit globale audit_logs
        INSERT INTO audit_logs (
            school_id,
            user_id,
            module,
            entity,
            entity_id,
            action,
            old_values,
            new_values
        ) VALUES (
            NEW.school_id,
            NEW.updated_by,
            'Élèves',
            'students',
            NEW.id::VARCHAR,
            'UPDATE',
            jsonb_build_object('status', OLD.status),
            jsonb_build_object('status', NEW.status)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_student_status_change ON students;
CREATE TRIGGER trg_student_status_change
    AFTER UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION fn_track_student_status_change();

-- -----------------------------------------------------------------------------
-- 8. POLITIQUES RLS (ROW LEVEL SECURITY) SUR LE MODULE ÉLÈVES
-- -----------------------------------------------------------------------------

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_status_history ENABLE ROW LEVEL SECURITY;

-- Politiques `students`
DROP POLICY IF EXISTS policy_students_select ON students;
CREATE POLICY policy_students_select ON students
    FOR SELECT TO authenticated
    USING (is_deleted = FALSE);

DROP POLICY IF EXISTS policy_students_admin_all ON students;
CREATE POLICY policy_students_admin_all ON students
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
              AND r.code IN ('ADMIN_GENERALE', 'SCOLAIRE_ENSEIGNANT')
              AND ur.is_deleted = FALSE
        )
    );

-- Politiques `student_enrollments`
DROP POLICY IF EXISTS policy_enrollments_select ON student_enrollments;
CREATE POLICY policy_enrollments_select ON student_enrollments
    FOR SELECT TO authenticated
    USING (is_deleted = FALSE);

DROP POLICY IF EXISTS policy_enrollments_admin_all ON student_enrollments;
CREATE POLICY policy_enrollments_admin_all ON student_enrollments
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
              AND r.code IN ('ADMIN_GENERALE', 'SCOLAIRE_ENSEIGNANT')
        )
    );

-- Politiques `medical_records` (Accès médical restreint)
DROP POLICY IF EXISTS policy_medical_select ON medical_records;
CREATE POLICY policy_medical_select ON medical_records
    FOR SELECT TO authenticated
    USING (is_deleted = FALSE);

DROP POLICY IF EXISTS policy_medical_admin_all ON medical_records;
CREATE POLICY policy_medical_admin_all ON medical_records
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
              AND r.code IN ('ADMIN_GENERALE', 'SCOLAIRE_ENSEIGNANT')
        )
    );

-- Politiques `student_documents`
DROP POLICY IF EXISTS policy_documents_select ON student_documents;
CREATE POLICY policy_documents_select ON student_documents
    FOR SELECT TO authenticated
    USING (is_deleted = FALSE);

-- Politiques `student_status_history`
DROP POLICY IF EXISTS policy_status_history_select ON student_status_history;
CREATE POLICY policy_status_history_select ON student_status_history
    FOR SELECT TO authenticated
    USING (TRUE);
