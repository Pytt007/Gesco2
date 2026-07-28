-- ─────────────────────────────────────────────────────────────────────────────
-- GESCO — Schéma Base de Données : decision_rules (Règles de Décision Pédagogique)
-- Fichier : supabase/decision_rules_schema.sql
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.decision_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    assessment_type_id VARCHAR(50) NULL,
    level_id VARCHAR(50) NULL,
    minimum_average NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    maximum_average NUMERIC(5, 2) NOT NULL DEFAULT 20.00,
    minimum_rank INT NULL,
    maximum_rank INT NULL,
    decision VARCHAR(50) NOT NULL, -- ACQUIS, PASSE, REDOUBLE, AJOURNÉ, EN_ATTENTE, NON_APPLICABLE
    description TEXT NULL,
    color VARCHAR(20) NOT NULL DEFAULT '#3b82f6',
    icon VARCHAR(50) NOT NULL DEFAULT 'check-circle',
    sort_order INT NOT NULL DEFAULT 1,
    version INT NOT NULL DEFAULT 1,
    effective_from TIMESTAMPTZ NULL,
    effective_to TIMESTAMPTZ NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour accélérer les recherches par niveau, type d'évaluation et statut actif
CREATE INDEX IF NOT EXISTS idx_decision_rules_lookup 
ON public.decision_rules (level_id, assessment_type_id, is_active, sort_order);

-- Insertion des règles par défaut pour le système primaire ivoirien
INSERT INTO public.decision_rules (code, level_id, minimum_average, maximum_average, decision, description, color, icon, sort_order)
VALUES 
    ('RULE_PRIM_PASSE', NULL, 10.00, 20.00, 'PASSE', 'Admis en classe supérieure (Moyenne >= 10/20)', '#10b981', 'check-circle', 1),
    ('RULE_PRIM_REDOUBLE', NULL, 0.00, 9.99, 'REDOUBLE', 'Proposé au redoublement (Moyenne < 10/20)', '#ef4444', 'alert-triangle', 2),
    ('RULE_PRESCHOOL_ACQUIS', NULL, 0.00, 20.00, 'ACQUIS', 'Compétences du préscolaire validées', '#3b82f6', 'award', 1)
ON CONFLICT (code) DO NOTHING;
