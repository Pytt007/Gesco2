-- =============================================================================
-- GESCO V2 — SCHEMA COMPLETION PATCH (PRODUCTION FIX)
-- À exécuter dans l'éditeur SQL Supabase pour aligner 100% des tables
-- =============================================================================

-- 1. Colonnes de compatibilité sur les tables existantes
ALTER TABLE IF EXISTS students 
    ADD COLUMN IF NOT EXISTS school_year VARCHAR(50) DEFAULT '2024-2025';

ALTER TABLE IF EXISTS assessment_sessions 
    ADD COLUMN IF NOT EXISTS academic_year_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS assessment_type_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS assessment_period_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS classroom_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS locked BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT FALSE;

-- 2. Vue de compatibilité classes <-> classrooms
CREATE OR REPLACE VIEW classrooms AS 
SELECT 
    id,
    name,
    level_id,
    school_year_id AS academic_year_id,
    capacity,
    main_teacher_id,
    room AS room_name,
    school_id,
    CASE WHEN status = 'ACTIVE' THEN true ELSE false END AS is_active,
    created_at,
    updated_at
FROM classes;

-- 3. Vue de compatibilité school_years <-> academic_years
CREATE OR REPLACE VIEW academic_years AS 
SELECT 
    id,
    school_id,
    label AS name,
    start_date,
    end_date,
    is_current,
    'ACTIVE' AS status,
    false AS is_deleted,
    created_at,
    updated_at
FROM school_years;

-- 4. Tables Abonnements & Périodes Cantine
CREATE TABLE IF NOT EXISTS canteen_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    student_name VARCHAR(255),
    matricule VARCHAR(50),
    photo_url TEXT,
    class_name VARCHAR(100),
    level_code VARCHAR(50),
    parent_sponsor VARCHAR(255),
    parent_phone VARCHAR(50),
    academic_year_id VARCHAR(50) DEFAULT '2024-2025',
    annual_rate NUMERIC(12,2) NOT NULL DEFAULT 0,
    periods_count INT NOT NULL DEFAULT 3,
    discount_type VARCHAR(50) DEFAULT 'NONE',
    discount_value NUMERIC(10,2) DEFAULT 0,
    discount_amount NUMERIC(12,2) DEFAULT 0,
    net_amount_due NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
    remaining_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
    subscription_status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS canteen_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID REFERENCES canteen_enrollments(id) ON DELETE CASCADE,
    period_number INT NOT NULL,
    period_label VARCHAR(100),
    amount_due NUMERIC(12,2) NOT NULL DEFAULT 0,
    amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    due_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tables Circuits, Arrêts & Abonnements Transport
CREATE TABLE IF NOT EXISTS transport_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    driver_name VARCHAR(150),
    driver_phone VARCHAR(50),
    vehicle_plate VARCHAR(50),
    capacity INT NOT NULL DEFAULT 30,
    academic_year_id VARCHAR(50) DEFAULT '2024-2025',
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transport_stops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    line_id UUID REFERENCES transport_lines(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    pickup_time TIME,
    dropoff_time TIME,
    fee_monthly NUMERIC(10,2) DEFAULT 25000,
    order_index INT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS transport_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    student_name VARCHAR(255),
    matricule VARCHAR(50),
    photo_url TEXT,
    class_name VARCHAR(100),
    level_code VARCHAR(50),
    parent_sponsor VARCHAR(255),
    parent_phone VARCHAR(50),
    line_id UUID REFERENCES transport_lines(id) ON DELETE SET NULL,
    stop_id UUID REFERENCES transport_stops(id) ON DELETE SET NULL,
    academic_year_id VARCHAR(50) DEFAULT '2024-2025',
    annual_rate NUMERIC(12,2) NOT NULL DEFAULT 0,
    periods_count INT NOT NULL DEFAULT 3,
    discount_type VARCHAR(50) DEFAULT 'NONE',
    discount_value NUMERIC(10,2) DEFAULT 0,
    discount_amount NUMERIC(12,2) DEFAULT 0,
    net_amount_due NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
    remaining_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
    subscription_status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transport_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID REFERENCES transport_enrollments(id) ON DELETE CASCADE,
    period_number INT NOT NULL,
    period_label VARCHAR(100),
    amount_due NUMERIC(12,2) NOT NULL DEFAULT 0,
    amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    due_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. Activation RLS & Politiques de Sécurité Permissives (Production)
ALTER TABLE canteen_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE canteen_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_periods ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "canteen_enrollments_all" ON canteen_enrollments;
    CREATE POLICY "canteen_enrollments_all" ON canteen_enrollments FOR ALL USING (true) WITH CHECK (true);
    
    DROP POLICY IF EXISTS "canteen_periods_all" ON canteen_periods;
    CREATE POLICY "canteen_periods_all" ON canteen_periods FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "transport_lines_all" ON transport_lines;
    CREATE POLICY "transport_lines_all" ON transport_lines FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "transport_stops_all" ON transport_stops;
    CREATE POLICY "transport_stops_all" ON transport_stops FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "transport_enrollments_all" ON transport_enrollments;
    CREATE POLICY "transport_enrollments_all" ON transport_enrollments FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "transport_periods_all" ON transport_periods;
    CREATE POLICY "transport_periods_all" ON transport_periods FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN NULL; END $$;
