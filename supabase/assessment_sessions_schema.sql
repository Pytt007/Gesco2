-- ─────────────────────────────────────────────────────────────────────────────
-- GESCO — Schéma Base de Données : assessment_sessions (Sessions d'Évaluation)
-- Fichier : supabase/assessment_sessions_schema.sql
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.assessment_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_year_id VARCHAR(50) NOT NULL,
    assessment_type_id VARCHAR(50) NOT NULL,
    assessment_period_id VARCHAR(50) NULL,
    assessment_template_id VARCHAR(50) NULL,
    classroom_id VARCHAR(50) NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT', -- DRAFT, OPEN, CLOSED, PUBLISHED, ARCHIVED
    locked BOOLEAN NOT NULL DEFAULT false,
    published BOOLEAN NOT NULL DEFAULT false,
    created_by VARCHAR(50) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_assessment_sessions_dates CHECK (start_date <= end_date)
);

-- Index pour accélérer les recherches par classe, année, type, statut et verrouillage
CREATE INDEX IF NOT EXISTS idx_assessment_sessions_lookup 
ON public.assessment_sessions (classroom_id, academic_year_id, assessment_type_id, status, locked, published);

-- Insertion d'une session de démonstration par défaut (en cas d'initialisation)
INSERT INTO public.assessment_sessions (
    id, academic_year_id, assessment_type_id, classroom_id, title, description, start_date, end_date, status, locked, published
) VALUES (
    'sess-demo-01', 'ay-2026', 'MONTHLY', 'cls-1', 'Composition Mensuelle N°1', 'Première évaluation mensuelle de l''année', '2026-10-01', '2026-10-05', 'OPEN', false, false
) ON CONFLICT (id) DO NOTHING;
