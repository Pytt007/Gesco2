-- =============================================================================
-- GESCO — MODULE 4 : GESTION DU PERSONNEL & RESSOURCES HUMAINES (PostgreSQL / Supabase)
-- =============================================================================
-- Script DDL Idempotent : Tables, Contraintes, Index, Triggers d'Historisation & RLS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. TABLE : STAFF_DEPARTMENTS (SERVICES ET DÉPARTEMENTS ETABLISSEMENT)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS staff_departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    code VARCHAR(50) NOT NULL,                           -- Ex: 'DIRECTION', 'PEDAGOGIE', 'COMPTABILITE'
    name VARCHAR(100) NOT NULL,                         -- Ex: 'Direction', 'Pédagogie', 'Vie Scolaire'
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    -- Audit & Soft Delete
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_staff_dept_school_code UNIQUE (school_id, code)
);

-- -----------------------------------------------------------------------------
-- 2. TABLE : STAFF_POSITIONS (FONCTIONS ET POSTES DE L'ÉTABLISSEMENT)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS staff_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    department_id UUID REFERENCES staff_departments(id) ON DELETE SET NULL,
    code VARCHAR(50) NOT NULL,                           -- Ex: 'DIR_GEN', 'TEACHER', 'ACCOUNTANT', 'DRIVER'
    title VARCHAR(100) NOT NULL,                        -- Ex: 'Directeur', 'Enseignant', 'Comptable', 'Chauffeur'
    hierarchy_level INT NOT NULL DEFAULT 1,              -- Niveau de responsabilité hiérarchique (1..10)
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    -- Audit & Soft Delete
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_staff_pos_school_code UNIQUE (school_id, code)
);

-- -----------------------------------------------------------------------------
-- 3. TABLE PRINCIPALE : STAFF (MEMBRES DU PERSONNEL & RESSOURCES HUMAINES)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    employee_number VARCHAR(50) UNIQUE NOT NULL,         -- Numéro employé unique (ex: EMP-2026-001)
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    gender VARCHAR(20) NOT NULL,                         -- 'Masculin' | 'Féminin'
    birth_date DATE,
    birth_place VARCHAR(150),
    nationality VARCHAR(100) DEFAULT 'Ivoirienne',
    avatar_url TEXT,
    phone_primary VARCHAR(50) NOT NULL,
    phone_secondary VARCHAR(50),
    email VARCHAR(150),
    address TEXT,
    city_district VARCHAR(100),                          -- Commune
    neighborhood VARCHAR(100),                           -- Quartier
    hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Statut & Soft Delete
    status VARCHAR(50) NOT NULL DEFAULT 'Actif',         -- 'Actif' | 'Inactif' | 'Suspendu' | 'Archivé' | 'En congé'
    archived_at TIMESTAMPTZ,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

    CONSTRAINT chk_staff_gender CHECK (gender IN ('Masculin', 'Féminin')),
    CONSTRAINT chk_staff_status CHECK (status IN ('Actif', 'Inactif', 'Suspendu', 'Archivé', 'En congé'))
);

-- -----------------------------------------------------------------------------
-- 4. TABLE : STAFF_CONTRACTS (HISTORIQUE ET CONTRATS DE TRAVAIL)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS staff_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    position_id UUID REFERENCES staff_positions(id) ON DELETE SET NULL,
    contract_type VARCHAR(50) NOT NULL DEFAULT 'CDI',     -- 'CDI' | 'CDD' | 'Vacataire' | 'Stage' | 'Prestation'
    start_date DATE NOT NULL,
    end_date DATE,
    base_salary NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    work_schedule_type VARCHAR(50) NOT NULL DEFAULT 'Temps Plein', -- 'Temps Plein' | 'Temps Partiel' | 'Horaire Vacations'
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIF',         -- 'ACTIF' | 'RENOUVELÉ' | 'EXPIRÉ' | 'RÉSILIÉ'
    observations TEXT,

    -- Audit & Soft Delete
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

    CONSTRAINT chk_contract_type CHECK (contract_type IN ('CDI', 'CDD', 'Vacataire', 'Stage', 'Prestation')),
    CONSTRAINT chk_work_schedule CHECK (work_schedule_type IN ('Temps Plein', 'Temps Partiel', 'Horaire Vacations')),
    CONSTRAINT chk_contract_status CHECK (status IN ('ACTIF', 'RENOUVELÉ', 'EXPIRÉ', 'RÉSILIÉ'))
);

-- -----------------------------------------------------------------------------
-- 5. TABLE : STAFF_DOCUMENTS (GESTION DOCUMENTAIRE RH SUR SUPABASE STORAGE)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS staff_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    doc_name VARCHAR(255) NOT NULL,
    doc_type VARCHAR(100) NOT NULL,                    -- 'Contrat' | 'Diplôme' | 'CNI' | 'CV' | 'Photo' | 'Attestation' | 'Autre'
    storage_path TEXT NOT NULL,                        -- Chemin Supabase Storage (ex: 'staff/docs/cni_001.pdf')
    file_size INT,
    mime_type VARCHAR(100),
    uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

    -- Audit & Soft Delete
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_staff_doc_type CHECK (doc_type IN ('Contrat', 'Diplôme', 'CNI', 'CV', 'Photo', 'Attestation', 'Autre'))
);

-- -----------------------------------------------------------------------------
-- 6. TABLE : STAFF_STATUS_HISTORY (HISTORISATEUR DES CHANGEMENTS ET MOUVEMENTS)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS staff_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    previous_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,                  -- 'EMBAUCHE' | 'CHANGEMENT_POSTE' | 'CHANGEMENT_SERVICE' | 'SUSPENSION' | 'ARCHIVAGE' | 'REINTEGRATION'
    reason TEXT,
    changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 7. INDEX DE PERFORMANCE OPTIMISÉS
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_staff_emp_number ON staff(employee_number) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_staff_names ON staff(last_name, first_name) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_staff_school_status ON staff(school_id, status) WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_staff_positions_dept ON staff_positions(department_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_staff_contracts_staff ON staff_contracts(staff_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_staff_documents_staff ON staff_documents(staff_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_staff_history_staff ON staff_status_history(staff_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- 8. TRIGGERS AUTOMATIQUES ET SUIVI D'AUDIT
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_track_staff_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO staff_status_history (
            staff_id,
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
                WHEN OLD.status = 'Archivé' AND NEW.status = 'Actif' THEN 'REINTEGRATION'
                WHEN NEW.status = 'Suspendu' THEN 'SUSPENSION'
                ELSE 'CHANGEMENT_STATUT'
            END,
            'Mise à jour du statut personnel',
            NEW.updated_by
        );

        -- Journalisation centralisée audit_logs
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
            'Personnel',
            'staff',
            NEW.id::VARCHAR,
            'UPDATE',
            jsonb_build_object('status', OLD.status),
            jsonb_build_object('status', NEW.status)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_staff_status_change ON staff;
CREATE TRIGGER trg_staff_status_change
    AFTER UPDATE ON staff
    FOR EACH ROW EXECUTE FUNCTION fn_track_staff_status_change();

-- -----------------------------------------------------------------------------
-- 9. POLITIQUES RLS (ROW LEVEL SECURITY) SUR LE MODULE PERSONNEL
-- -----------------------------------------------------------------------------

ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_status_history ENABLE ROW LEVEL SECURITY;

-- Politiques de lecture et d'administration sur les employés
DROP POLICY IF EXISTS policy_staff_select ON staff;
CREATE POLICY policy_staff_select ON staff
    FOR SELECT TO authenticated
    USING (is_deleted = FALSE);

DROP POLICY IF EXISTS policy_staff_admin_all ON staff;
CREATE POLICY policy_staff_admin_all ON staff
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

-- Politiques sur les départements et positions
DROP POLICY IF EXISTS policy_staff_departments_select ON staff_departments;
CREATE POLICY policy_staff_departments_select ON staff_departments
    FOR SELECT TO authenticated
    USING (is_deleted = FALSE);

DROP POLICY IF EXISTS policy_staff_positions_select ON staff_positions;
CREATE POLICY policy_staff_positions_select ON staff_positions
    FOR SELECT TO authenticated
    USING (is_deleted = FALSE);

-- Politiques sur les contrats et documents
DROP POLICY IF EXISTS policy_staff_contracts_select ON staff_contracts;
CREATE POLICY policy_staff_contracts_select ON staff_contracts
    FOR SELECT TO authenticated
    USING (is_deleted = FALSE);

DROP POLICY IF EXISTS policy_staff_documents_select ON staff_documents;
CREATE POLICY policy_staff_documents_select ON staff_documents
    FOR SELECT TO authenticated
    USING (is_deleted = FALSE);

DROP POLICY IF EXISTS policy_staff_history_select ON staff_status_history;
CREATE POLICY policy_staff_history_select ON staff_status_history
    FOR SELECT TO authenticated
    USING (TRUE);
