-- ============================================================================
-- GESCO - Tuition Fees Configuration Schema
-- Tables: tuition_fee_schedules, tuition_fee_discounts
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tuition_fee_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_year_id VARCHAR(100) NOT NULL,
    level_code VARCHAR(20) NOT NULL, -- 'PS', 'MS', 'GS', 'CP1', 'CP2', 'CE1', 'CE2', 'CM1', 'CM2'
    level_name VARCHAR(100) NOT NULL,
    registration_fee NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    tuition_fee NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_annual_fee NUMERIC(12,2) GENERATED ALWAYS AS (registration_fee + tuition_fee) STORED,
    allow_fixed_discount BOOLEAN NOT NULL DEFAULT true,
    allow_percent_discount BOOLEAN NOT NULL DEFAULT true,
    max_discount_percent NUMERIC(5,2) DEFAULT 30.00,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'ARCHIVED'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tuition_fee_year_level UNIQUE (academic_year_id, level_code)
);

CREATE TABLE IF NOT EXISTS public.tuition_fee_discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    discount_type VARCHAR(20) NOT NULL, -- 'FIXED', 'PERCENTAGE'
    value NUMERIC(12,2) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour accélérer la recherche par année scolaire et niveau
CREATE INDEX IF NOT EXISTS idx_tuition_fees_year ON public.tuition_fee_schedules(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_tuition_fees_level ON public.tuition_fee_schedules(level_code);
