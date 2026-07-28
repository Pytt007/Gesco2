-- ─────────────────────────────────────────────────────────────────────────────
-- GESCO — Schéma Base de Données : assessment_results & assessment_scores
-- Fichier : supabase/assessment_results_schema.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Table des résultats globaux d'élèves par session d'évaluation
CREATE TABLE IF NOT EXISTS public.assessment_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_session_id VARCHAR(50) NOT NULL,
    student_id VARCHAR(50) NOT NULL,
    correction_status VARCHAR(30) NOT NULL DEFAULT 'NOT_STARTED', -- NOT_STARTED, IN_PROGRESS, COMPLETED, VALIDATED, PUBLISHED
    is_completed BOOLEAN NOT NULL DEFAULT false,
    total NUMERIC(7, 2) NULL,
    average NUMERIC(5, 2) NULL,
    rank INT NULL,
    appreciation TEXT NULL,
    mention VARCHAR(50) NULL,
    decision VARCHAR(50) NULL,
    published BOOLEAN NOT NULL DEFAULT false,
    validated_by VARCHAR(50) NULL,
    validated_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unq_session_student UNIQUE (assessment_session_id, student_id)
);

-- 2. Table des notes détaillées par matière d'élève
CREATE TABLE IF NOT EXISTS public.assessment_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_result_id UUID NOT NULL REFERENCES public.assessment_results(id) ON DELETE CASCADE,
    subject_id VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'NOT_STARTED', -- NOT_STARTED, IN_PROGRESS, COMPLETED, VALIDATED, PUBLISHED
    score NUMERIC(5, 2) NULL,
    appreciation VARCHAR(100) NULL,
    comment TEXT NULL,
    absence_status VARCHAR(30) NOT NULL DEFAULT 'PRESENT', -- PRESENT, ABSENT, EXCUSED_ABSENT
    corrected_by VARCHAR(50) NULL,
    corrected_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unq_result_subject UNIQUE (assessment_result_id, subject_id)
);

-- Index de performance
CREATE INDEX IF NOT EXISTS idx_assessment_results_lookup
ON public.assessment_results (assessment_session_id, student_id, correction_status, published);

CREATE INDEX IF NOT EXISTS idx_assessment_scores_lookup
ON public.assessment_scores (assessment_result_id, subject_id, status, absence_status);
