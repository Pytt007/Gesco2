-- ============================================================================
-- GESCO - Tuition Fee Payments & Receipt History Schema
-- Tables: tuition_payments, payment_cancellations
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tuition_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES public.student_financial_enrollments(id) ON DELETE CASCADE,
    receipt_number VARCHAR(50) NOT NULL UNIQUE,
    amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_mode VARCHAR(30) NOT NULL, -- 'CASH', 'ORANGE_MONEY', 'MTN_MONEY', 'WAVE', 'TRANSFER', 'CHECK'
    reference_number VARCHAR(100),
    remarks TEXT,
    recorded_by VARCHAR(100) NOT NULL DEFAULT 'Comptabilité',
    status VARCHAR(20) NOT NULL DEFAULT 'VALIDATED', -- 'VALIDATED', 'CANCELLED'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payment_cancellations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES public.tuition_payments(id) ON DELETE CASCADE,
    cancelled_by VARCHAR(100) NOT NULL,
    cancellation_reason TEXT NOT NULL,
    cancelled_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index d'optimisation
CREATE INDEX IF NOT EXISTS idx_tuition_payments_enrollment ON public.tuition_payments(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_tuition_payments_receipt ON public.tuition_payments(receipt_number);
CREATE INDEX IF NOT EXISTS idx_tuition_payments_date ON public.tuition_payments(payment_date);
