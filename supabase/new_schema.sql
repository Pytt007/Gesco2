-- =============================================================================
-- GESCO — ARCHITECTURE RELATIONNELLE CONSOLIDEÉ (POSTGRESQL / SUPABASE)
-- =============================================================================
-- Ce script définit la nouvelle architecture de base de données relationnelle
-- normalisée (3NF) pour la plateforme SaaS de gestion scolaire GESCO.
-- =============================================================================

-- Extensions requis
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. SCHÉMA MULTI-ÉTABLISSEMENT & ANNÉES SCOLAIRES
-- -----------------------------------------------------------------------------

CREATE TABLE schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    director_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    logo_url TEXT,
    
    -- Audit & Soft Delete
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIF',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID
);

CREATE TABLE school_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    label VARCHAR(20) NOT NULL, -- Ex: '2024-2025'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Audit & Soft Delete
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIF',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    
    CONSTRAINT chk_school_year_dates CHECK (end_date > start_date),
    CONSTRAINT uq_school_year_label UNIQUE (school_id, label)
);

-- -----------------------------------------------------------------------------
-- 2. GESTION DES RÔLES & PERMISSIONS
-- -----------------------------------------------------------------------------

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL, -- Ex: 'ADMIN_GENERALE', 'FINANCE', etc.
    label VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Audit & Soft Delete
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIF',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) UNIQUE NOT NULL, -- Ex: 'STUDENTS_READ', 'FINANCE_WRITE'
    label VARCHAR(100) NOT NULL,
    module VARCHAR(50) NOT NULL,
    description TEXT,
    
    -- Audit & Soft Delete
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIF',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID
);

CREATE TABLE role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    PRIMARY KEY (role_id, permission_id)
);

-- -----------------------------------------------------------------------------
-- 3. COMPTES UTILISATEURS
-- -----------------------------------------------------------------------------

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    last_login_at TIMESTAMPTZ,
    
    -- Audit & Soft Delete
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIF',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID
);

-- -----------------------------------------------------------------------------
-- 4. INFRASTRUCTURE & ORGANISATION ACADÉMIQUE
-- -----------------------------------------------------------------------------

CREATE TABLE academic_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL, -- Ex: 'PRESCOLAIRE', 'CP', 'CE', 'CM', 'COLLEGE'
    name VARCHAR(100) NOT NULL,
    sequence_order INT NOT NULL,
    
    -- Audit & Soft Delete
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIF',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    
    CONSTRAINT uq_academic_level_order UNIQUE (school_id, sequence_order)
);

CREATE TABLE classrooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    building VARCHAR(100),
    capacity INT NOT NULL CHECK (capacity > 0),
    
    -- Audit & Soft Delete
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIF',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    
    CONSTRAINT uq_classroom_name UNIQUE (school_id, name)
);

CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    coefficient NUMERIC(4, 2) NOT NULL DEFAULT 1.0 CHECK (coefficient > 0),
    max_score NUMERIC(5, 2) NOT NULL DEFAULT 20.0 CHECK (max_score > 0),
    
    -- Audit & Soft Delete
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIF',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    
    CONSTRAINT uq_subject_code UNIQUE (school_id, code)
);

-- -----------------------------------------------------------------------------
-- 5. PERSONNEL & ENSEIGNANTS
-- -----------------------------------------------------------------------------

CREATE TABLE staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    matricule VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    gender VARCHAR(10) CHECK (gender IN ('Masculin', 'Féminin')),
    staff_role VARCHAR(50) NOT NULL CHECK (staff_role IN ('Direction', 'Enseignant', 'Administratif', 'Support')),
    email VARCHAR(255),
    phone VARCHAR(50),
    subject_specialty VARCHAR(100),
    hire_date DATE,
    salary NUMERIC(12, 2) DEFAULT 0.0 CHECK (salary >= 0),
    
    -- Audit & Soft Delete
    status VARCHAR(50) NOT NULL DEFAULT 'Actif',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID
);

-- -----------------------------------------------------------------------------
-- 6. PARENTS & ÉLÈVES
-- -----------------------------------------------------------------------------

CREATE TABLE parents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    relationship VARCHAR(50) NOT NULL, -- Ex: 'Père', 'Mère', 'Tuteur'
    phone VARCHAR(50) NOT NULL,
    secondary_phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    profession VARCHAR(100),
    
    -- Audit & Soft Delete
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIF',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID
);

CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES parents(id) ON DELETE SET NULL,
    matricule VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    gender VARCHAR(10) CHECK (gender IN ('Masculin', 'Féminin')),
    date_of_birth DATE,
    address TEXT,
    medical_info TEXT,
    emergency_contact VARCHAR(100),
    photo_url TEXT,
    
    -- Audit & Soft Delete
    status VARCHAR(50) NOT NULL DEFAULT 'Actif',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID
);

-- -----------------------------------------------------------------------------
-- 7. CLASSES & INSCRIPTIONS (ENROLLMENTS)
-- -----------------------------------------------------------------------------

CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    school_year_id UUID NOT NULL REFERENCES school_years(id) ON DELETE RESTRICT,
    academic_level_id UUID NOT NULL REFERENCES academic_levels(id) ON DELETE RESTRICT,
    classroom_id UUID REFERENCES classrooms(id) ON DELETE SET NULL,
    main_teacher_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL, -- Ex: 'CP1 A', '6ème B'
    capacity INT NOT NULL DEFAULT 35 CHECK (capacity > 0),
    
    -- Audit & Soft Delete
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIF',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    
    CONSTRAINT uq_class_name_year UNIQUE (school_id, school_year_id, name)
);

CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
    school_year_id UUID NOT NULL REFERENCES school_years(id) ON DELETE RESTRICT,
    enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Audit & Soft Delete
    status VARCHAR(50) NOT NULL DEFAULT 'Actif', -- 'Actif', 'Inactif', 'Transféré', 'Abandon'
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    
    CONSTRAINT uq_student_enrollment_per_year UNIQUE (student_id, school_year_id)
);

-- -----------------------------------------------------------------------------
-- 8. INDEX DE PERFORMANCE
-- -----------------------------------------------------------------------------

-- Index multi-tenant sur school_id et filtrage Soft Delete (is_deleted = FALSE)
CREATE INDEX idx_schools_active ON schools(id) WHERE is_deleted = FALSE;
CREATE INDEX idx_school_years_school ON school_years(school_id, is_current) WHERE is_deleted = FALSE;

CREATE INDEX idx_users_school ON users(school_id, role_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_users_username ON users(username);

CREATE INDEX idx_staff_school ON staff(school_id, staff_role) WHERE is_deleted = FALSE;
CREATE INDEX idx_staff_matricule ON staff(matricule);

CREATE INDEX idx_students_school ON students(school_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_students_parent ON students(parent_id);
CREATE INDEX idx_students_matricule ON students(matricule);

CREATE INDEX idx_classes_year ON classes(school_id, school_year_id, academic_level_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_enrollments_student ON enrollments(student_id, school_year_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_enrollments_class ON enrollments(class_id, school_year_id) WHERE is_deleted = FALSE;

-- -----------------------------------------------------------------------------
-- 9. PRÉPARATION RLS (ROW LEVEL SECURITY)
-- -----------------------------------------------------------------------------

ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

-- Exemples de politiques de base préparées (isolées par établissement)
-- CREATE POLICY school_isolation_policy ON students
--     FOR ALL USING (school_id = (SELECT school_id FROM users WHERE id = auth.uid()));
