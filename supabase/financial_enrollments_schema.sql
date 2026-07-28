-- ============================================================================
-- GESCO - Student Financial Enrollment Schema
-- Tables: student_financial_enrollments, enrollment_installments
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.student_financial_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id VARCHAR(100) NOT NULL,
    student_name VARCHAR(200) NOT NULL,
    matricule VARCHAR(50) NOT NULL,
    academic_year_id VARCHAR(100) NOT NULL,
    classroom_id VARCHAR(100) NOT NULL,
    class_name VARCHAR(100) NOT NULL,
    level_code VARCHAR(20) NOT NULL,
    registration_fee NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    tuition_fee NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    discount_type VARCHAR(20) NOT NULL DEFAULT 'NONE', -- 'NONE', 'FIXED', 'PERCENTAGE'
    discount_value NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    net_total_due NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_paid NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    remaining_balance NUMERIC(12,2) GENERATED ALWAYS AS (net_total_due - total_paid) STORED,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'ARCHIVED'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_student_year_enrollment UNIQUE (student_id, academic_year_id)
);

CREATE TABLE IF NOT EXISTS public.enrollment_installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES public.student_financial_enrollments(id) ON DELETE CASCADE,
    installment_number INT NOT NULL, -- 1 to 8
    installment_label VARCHAR(50) NOT NULL, -- 'Échéance 1', ...
    due_date DATE,
    amount_due NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'PARTIAL', 'PAID'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour accélérer les recherches par élève, classe et année
CREATE INDEX IF NOT EXISTS idx_fin_enrollment_student ON public.student_financial_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_fin_enrollment_year ON public.student_financial_enrollments(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_fin_enrollment_class ON public.student_financial_enrollments(classroom_id);
