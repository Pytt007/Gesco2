-- =============================================================================
-- GESCO V2 — MASTER SCHEMA DE PRODUCTION OFFICIEL
-- Script d'initialisation complet et idempotent pour PostgreSQL / Supabase
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. EXTENSIONS & TYPES ENUMS
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Types énumérés
DO $$ BEGIN
    CREATE TYPE user_role_enum AS ENUM (
        'SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'STUDENT_AFFAIRS', 
        'ACCOUNTANT', 'TEACHER', 'CANTEEN_MANAGER', 'TRANSPORT_MANAGER', 'VIEWER'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE gender_enum AS ENUM ('M', 'F');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE payment_status_enum AS ENUM ('PAID', 'PENDING', 'PARTIAL', 'OVERDUE', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE enrollment_status_enum AS ENUM ('ACTIVE', 'INACTIVE', 'TRANSFERRED', 'EXPELLED', 'GRADUATED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------------
-- 1. ÉTABLISSEMENT & CONFIGURATION GÉNÉRALE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL DEFAULT 'GESCO-MAIN',
    name VARCHAR(255) NOT NULL DEFAULT 'GESCO — Complexe Scolaire d''Excellence',
    logo TEXT,
    address TEXT,
    city VARCHAR(100) DEFAULT 'Abidjan',
    country VARCHAR(100) DEFAULT 'Côte d''Ivoire',
    phone VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(255),
    currency VARCHAR(10) DEFAULT 'FCFA',
    language VARCHAR(10) DEFAULT 'fr',
    timezone VARCHAR(50) DEFAULT 'GMT',
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS school_settings (
    id VARCHAR(100) PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS school_years (
    id VARCHAR(50) PRIMARY KEY,
    label VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN NOT NULL DEFAULT FALSE,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS academic_terms (
    id VARCHAR(50) PRIMARY KEY,
    school_year_id VARCHAR(50) REFERENCES school_years(id) ON DELETE CASCADE,
    term_number INT NOT NULL,
    label VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN NOT NULL DEFAULT FALSE,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 2. UTILISATEURS, PROFILS & SÉCURITÉ RBAC
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'ADMIN',
    email VARCHAR(255),
    avatar_url TEXT,
    phone VARCHAR(50),
    school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    label VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) UNIQUE NOT NULL,
    module VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- -----------------------------------------------------------------------------
-- 3. STRUCTURE ACADÉMIQUE & CATALOGUE PÉDAGOGIQUE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cycles (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS levels (
    id VARCHAR(50) PRIMARY KEY,
    cycle_id VARCHAR(50) REFERENCES cycles(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    order_index INT NOT NULL DEFAULT 1,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS classes (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    level_id VARCHAR(50) REFERENCES levels(id) ON DELETE SET NULL,
    school_year_id VARCHAR(50) REFERENCES school_years(id) ON DELETE CASCADE,
    capacity INT NOT NULL DEFAULT 40,
    main_teacher_id UUID,
    room VARCHAR(100),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subjects (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    color VARCHAR(20) DEFAULT '#2563eb',
    icon VARCHAR(50) DEFAULT 'BookOpen',
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS class_subject_coefficients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id VARCHAR(50) REFERENCES classes(id) ON DELETE CASCADE,
    subject_id VARCHAR(50) REFERENCES subjects(id) ON DELETE CASCADE,
    coefficient NUMERIC(4,2) NOT NULL DEFAULT 1.0,
    teacher_id UUID,
    UNIQUE (class_id, subject_id)
);

-- -----------------------------------------------------------------------------
-- 4. PERSONNEL & ENSEIGNANTS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS staff_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    role VARCHAR(50) NOT NULL DEFAULT 'TEACHER',
    specialty VARCHAR(150),
    hire_date DATE DEFAULT CURRENT_DATE,
    base_salary NUMERIC(12,2) DEFAULT 0,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS staff_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID REFERENCES staff_members(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PRESENT',
    arrival_time TIME,
    notes TEXT,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 5. ÉLÈVES, PARENTS & VIE SCOLAIRE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS parents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    profession VARCHAR(150),
    address TEXT,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matricule VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    gender VARCHAR(10) NOT NULL DEFAULT 'M',
    birth_date DATE NOT NULL,
    birth_place VARCHAR(150),
    nationality VARCHAR(100) DEFAULT 'Ivoirienne',
    blood_group VARCHAR(10),
    class_id VARCHAR(50) REFERENCES classes(id) ON DELETE SET NULL,
    school_year_id VARCHAR(50) REFERENCES school_years(id) ON DELETE SET NULL,
    avatar_url TEXT,
    address TEXT,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS student_parent_relations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES parents(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL DEFAULT 'PÈRE',
    is_primary_contact BOOLEAN NOT NULL DEFAULT TRUE,
    can_pickup BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (student_id, parent_id)
);

CREATE TABLE IF NOT EXISTS student_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    class_id VARCHAR(50) REFERENCES classes(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PRESENT',
    reason TEXT,
    is_justified BOOLEAN NOT NULL DEFAULT FALSE,
    recorded_by UUID,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 6. ÉVALUATIONS, NOTES & BULLETINS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS assessment_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_term_id VARCHAR(50) REFERENCES academic_terms(id) ON DELETE CASCADE,
    class_id VARCHAR(50) REFERENCES classes(id) ON DELETE CASCADE,
    subject_id VARCHAR(50) REFERENCES subjects(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    session_type VARCHAR(50) NOT NULL DEFAULT 'DEVOIR',
    coefficient NUMERIC(4,2) NOT NULL DEFAULT 1.0,
    max_score NUMERIC(5,2) NOT NULL DEFAULT 20.0,
    session_date DATE NOT NULL DEFAULT CURRENT_DATE,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assessment_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES assessment_sessions(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    score NUMERIC(5,2) NOT NULL,
    comment TEXT,
    is_absent BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (session_id, student_id)
);

CREATE TABLE IF NOT EXISTS report_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    class_id VARCHAR(50) REFERENCES classes(id) ON DELETE CASCADE,
    academic_term_id VARCHAR(50) REFERENCES academic_terms(id) ON DELETE CASCADE,
    overall_average NUMERIC(5,2),
    rank INT,
    class_average NUMERIC(5,2),
    highest_average NUMERIC(5,2),
    lowest_average NUMERIC(5,2),
    council_decision TEXT,
    principal_comments TEXT,
    data_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (student_id, academic_term_id)
);

-- -----------------------------------------------------------------------------
-- 7. GESTION FINANCIÈRE, FRAIS & SCOLARITÉ
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tuition_fee_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level_id VARCHAR(50) REFERENCES levels(id) ON DELETE CASCADE,
    school_year_id VARCHAR(50) REFERENCES school_years(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    registration_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
    tuition_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS student_financial_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    academic_year_id VARCHAR(50) REFERENCES school_years(id) ON DELETE CASCADE,
    total_due NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (student_id, academic_year_id)
);

CREATE TABLE IF NOT EXISTS enrollment_installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID REFERENCES student_financial_enrollments(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    due_date DATE NOT NULL,
    expected_amount NUMERIC(12,2) NOT NULL,
    paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tuition_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number VARCHAR(100) UNIQUE NOT NULL,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    enrollment_id UUID REFERENCES student_financial_enrollments(id) ON DELETE SET NULL,
    academic_year_id VARCHAR(50) REFERENCES school_years(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'CASH',
    payment_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    received_by UUID,
    payer_name VARCHAR(150),
    notes TEXT,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_number VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'FONCTIONNEMENT',
    amount NUMERIC(12,2) NOT NULL,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'CASH',
    beneficiary VARCHAR(150),
    receipt_url TEXT,
    approved_by UUID,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 8. SERVICES ANNEXES : CANTINE, TRANSPORT & ACTIVITÉS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS canteen_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    formula VARCHAR(100) NOT NULL DEFAULT 'STANDARD',
    school_year_id VARCHAR(50) REFERENCES school_years(id) ON DELETE CASCADE,
    monthly_fee NUMERIC(10,2) NOT NULL DEFAULT 25000,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS canteen_menus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_start_date DATE NOT NULL,
    monday_meal TEXT,
    tuesday_meal TEXT,
    wednesday_meal TEXT,
    thursday_meal TEXT,
    friday_meal TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transport_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    driver_name VARCHAR(150),
    driver_phone VARCHAR(50),
    vehicle_plate VARCHAR(50),
    capacity INT NOT NULL DEFAULT 30,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transport_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    route_id UUID REFERENCES transport_routes(id) ON DELETE CASCADE,
    stop_name VARCHAR(150),
    school_year_id VARCHAR(50) REFERENCES school_years(id) ON DELETE CASCADE,
    monthly_fee NUMERIC(10,2) NOT NULL DEFAULT 35000,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 9. SÉCURITÉ ROW LEVEL SECURITY (RLS) & POLITIQUES
-- -----------------------------------------------------------------------------
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

-- Politiques ouvertes pour lecture/écriture authentifiée et anon démo sécurisée
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Public access %I" ON %I;', tbl, tbl);
        EXECUTE format('CREATE POLICY "Public access %I" ON %I FOR ALL USING (true) WITH CHECK (true);', tbl, tbl);
    END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 10. BUCKETS DE STOCKAGE SUPABASE
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public) 
VALUES 
    ('avatars', 'avatars', true),
    ('school_assets', 'school_assets', true),
    ('student_documents', 'student_documents', true),
    ('report_cards', 'report_cards', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- -----------------------------------------------------------------------------
-- 11. DONNÉES INITIALES (SEED INDISPENSABLE)
-- -----------------------------------------------------------------------------
INSERT INTO school_years (id, label, start_date, end_date, is_current)
VALUES ('2024-2025', 'Année Scolaire 2024-2025', '2024-09-09', '2025-06-27', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO academic_terms (id, school_year_id, term_number, label, start_date, end_date, is_current)
VALUES 
    ('2024-2025-T1', '2024-2025', 1, '1er Trimestre', '2024-09-09', '2024-12-06', false),
    ('2024-2025-T2', '2024-2025', 2, '2ème Trimestre', '2024-12-09', '2025-03-07', false),
    ('2024-2025-T3', '2024-2025', 3, '3ème Trimestre', '2025-03-10', '2025-06-06', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, username, full_name, role)
VALUES ('00000000-0000-0000-0000-000000000001', 'admin', 'Direction Générale (Admin)', 'ADMIN')
ON CONFLICT (username) DO NOTHING;
