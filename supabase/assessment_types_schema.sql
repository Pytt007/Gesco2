-- =============================================================================
-- GESCO — MODULE : MOTEUR DES TYPES D'ÉVALUATION (AE3 – ASSESSMENT ENGINE)
-- (PostgreSQL / Supabase — Moteur Académique / Types & Règles d'Évaluation)
-- =============================================================================
-- Script DDL Idempotent : Tables, Contraintes, Index, Politiques RLS & Seed
--
-- Tables créées :
--   1. assessment_scales          — Échelles de notation disponibles
--   2. assessment_types           — Définition des types d'évaluation
--   3. assessment_type_levels     — Niveaux scolaires éligibles par type
--   4. assessment_type_rules      — Règles métier pilotées par la BD (no hard-coding)
--
-- Dépendances :
--   - school_levels               (AE1 — Structure Académique)
--   - profiles                    (Utilisateurs & Rôles)
--   - schools                     (Paramètres)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. TABLE : ASSESSMENT_SCALES (ÉCHELLES DE NOTATION DISPONIBLES)
-- =============================================================================
-- Référentiel des modes de notation : Appréciation littérale, Note sur 10, Note sur 20.
-- Indépendante de school_id : globale à toute l'instance GESCO.
-- =============================================================================

CREATE TABLE IF NOT EXISTS assessment_scales (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identifiant technique
    code        VARCHAR(50)  NOT NULL,               -- 'APPRECIATION', 'SCORE_10', 'SCORE_20'
    name        VARCHAR(100) NOT NULL,               -- 'Appréciation', 'Note sur 10', 'Note sur 20'
    description TEXT,

    -- Bornes numériques (NULL pour APPRECIATION)
    minimum_value NUMERIC(6, 2),                     -- 0 pour SCORE_10 / SCORE_20, NULL pour APPRECIATION
    maximum_value NUMERIC(6, 2),                     -- 10 ou 20, NULL pour APPRECIATION

    -- État
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,

    -- Audit
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_assessment_scales_code UNIQUE (code)
);

COMMENT ON TABLE  assessment_scales                IS 'Référentiel des échelles de notation disponibles dans GESCO (Appréciation, /10, /20).';
COMMENT ON COLUMN assessment_scales.code           IS 'Identifiant technique unique. Valeurs : APPRECIATION, SCORE_10, SCORE_20.';
COMMENT ON COLUMN assessment_scales.minimum_value  IS 'Borne inférieure de l''échelle numérique. NULL pour APPRECIATION.';
COMMENT ON COLUMN assessment_scales.maximum_value  IS 'Borne supérieure de l''échelle numérique. NULL pour APPRECIATION.';

-- =============================================================================
-- 2. TABLE : ASSESSMENT_TYPES (TYPES D'ÉVALUATION)
-- =============================================================================
-- Chaque enregistrement décrit un type d'évaluation (ex : Composition Mensuelle).
-- Pilotage intégral par la BD — aucune règle codée en dur dans les Services/UI.
-- Versioning temporel : version + effective_from / effective_to.
-- =============================================================================

CREATE TABLE IF NOT EXISTS assessment_types (
    id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id                UUID         REFERENCES schools(id) ON DELETE RESTRICT,

    -- Identification
    code                     VARCHAR(50)  NOT NULL,               -- 'MONTHLY', 'IEP', 'PRESCHOOL', 'MOCK_EXAM'
    name                     VARCHAR(150) NOT NULL,               -- 'Composition Mensuelle', 'Composition IEP'...
    description              TEXT,

    -- Échelle de notation par défaut pour ce type
    scale_type               VARCHAR(20)  NOT NULL DEFAULT 'SCORE_20',  -- FK logique vers assessment_scales.code
    -- Contrainte sur les valeurs autorisées
    CONSTRAINT chk_assessment_types_scale_type
        CHECK (scale_type IN ('APPRECIATION', 'SCORE_10', 'SCORE_20')),

    -- Fonctionnalités globales
    ranking_enabled          BOOLEAN      NOT NULL DEFAULT TRUE,  -- Ce type génère un classement
    promotion_enabled        BOOLEAN      NOT NULL DEFAULT TRUE,  -- Ce type conditionne la promotion

    -- Occurrences
    max_occurrences_per_year INT          CHECK (max_occurrences_per_year IS NULL OR max_occurrences_per_year > 0),
    -- NULL = illimité (géré par assessment_type_rules.unlimited_occurrences)

    -- Affichage
    default_display_order    INT          NOT NULL DEFAULT 1,

    -- Versioning temporel (historique des règles par période scolaire)
    version                  INT          NOT NULL DEFAULT 1,
    effective_from           DATE,                                -- Date de première application
    effective_to             DATE,                                -- Date de fin d'application (NULL = actif)
    CONSTRAINT chk_assessment_types_dates
        CHECK (effective_to IS NULL OR effective_to >= effective_from),

    -- État & Soft Delete
    is_active                BOOLEAN      NOT NULL DEFAULT TRUE,
    is_deleted               BOOLEAN      NOT NULL DEFAULT FALSE,
    deleted_at               TIMESTAMPTZ,

    -- Audit
    created_at               TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at               TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_assessment_types_school_code UNIQUE (school_id, code)
);

COMMENT ON TABLE  assessment_types                        IS 'Types d''évaluation pilotés par la BD (Composition Mensuelle, IEP, Préscolaire, Examen Blanc...).';
COMMENT ON COLUMN assessment_types.code                   IS 'Identifiant technique unique par école. Ex : MONTHLY, IEP, PRESCHOOL, MOCK_EXAM.';
COMMENT ON COLUMN assessment_types.scale_type             IS 'Mode de notation par défaut : APPRECIATION | SCORE_10 | SCORE_20.';
COMMENT ON COLUMN assessment_types.ranking_enabled        IS 'Si TRUE, ce type génère un classement des élèves.';
COMMENT ON COLUMN assessment_types.promotion_enabled      IS 'Si TRUE, ce type conditionne la promotion de classe.';
COMMENT ON COLUMN assessment_types.max_occurrences_per_year IS 'Nombre maximum de sessions autorisées par an. NULL = illimité.';
COMMENT ON COLUMN assessment_types.version                IS 'Numéro de version permettant le versioning temporel des règles.';
COMMENT ON COLUMN assessment_types.effective_from         IS 'Date d''entrée en vigueur de cette version du type.';
COMMENT ON COLUMN assessment_types.effective_to           IS 'Date de fin de validité. NULL si encore actif.';

-- =============================================================================
-- 3. TABLE : ASSESSMENT_TYPE_LEVELS (NIVEAUX SCOLAIRES PAR TYPE D'ÉVALUATION)
-- =============================================================================
-- Détermine quels niveaux scolaires sont éligibles à chaque type d'évaluation.
-- Ex : PRESCHOOL → PS, MS, GS  /  MONTHLY → CP1, CP2, CE1, CE2, CM1
--      IEP → CP1..CM2          /  MOCK_EXAM → CM2 uniquement
-- =============================================================================

CREATE TABLE IF NOT EXISTS assessment_type_levels (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_type_id   UUID        NOT NULL REFERENCES assessment_types(id) ON DELETE CASCADE,
    level_id             UUID        NOT NULL REFERENCES school_levels(id)    ON DELETE CASCADE,

    -- Audit
    created_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_assessment_type_level UNIQUE (assessment_type_id, level_id)
);

COMMENT ON TABLE  assessment_type_levels                    IS 'Association des niveaux scolaires éligibles à chaque type d''évaluation.';
COMMENT ON COLUMN assessment_type_levels.assessment_type_id IS 'FK vers assessment_types — type d''évaluation concerné.';
COMMENT ON COLUMN assessment_type_levels.level_id           IS 'FK vers school_levels (AE1) — niveau scolaire associé.';

-- =============================================================================
-- 4. TABLE : ASSESSMENT_TYPE_RULES (RÈGLES MÉTIER PAR TYPE D'ÉVALUATION)
-- =============================================================================
-- Centralise toutes les règles de gestion (génération classement, moyenne,
-- promotion, absences, occurrences...) en base. Versioning temporel identique
-- à assessment_types. Aucune règle ne doit être codée en dur dans le code.
-- =============================================================================

CREATE TABLE IF NOT EXISTS assessment_type_rules (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_type_id    UUID        NOT NULL REFERENCES assessment_types(id) ON DELETE CASCADE,

    -- Règles de génération de résultats
    generates_ranking     BOOLEAN     NOT NULL DEFAULT TRUE,   -- Génère un classement des élèves
    generates_average     BOOLEAN     NOT NULL DEFAULT TRUE,   -- Génère une moyenne générale
    affects_promotion     BOOLEAN     NOT NULL DEFAULT TRUE,   -- Impacte la décision de promotion

    -- Règles de gestion des absences
    allows_absence_status BOOLEAN     NOT NULL DEFAULT TRUE,   -- Peut marquer un élève absent
    allows_excused_absence BOOLEAN    NOT NULL DEFAULT TRUE,   -- Peut marquer une absence justifiée

    -- Règles d'occurrence
    unlimited_occurrences BOOLEAN     NOT NULL DEFAULT FALSE,  -- TRUE = pas de plafond annuel

    -- Notes complémentaires / instructions pédagogiques
    notes                 TEXT,

    -- Versioning temporel (cohérence avec assessment_types)
    version               INT         NOT NULL DEFAULT 1,
    effective_from        DATE,
    effective_to          DATE,
    CONSTRAINT chk_assessment_type_rules_dates
        CHECK (effective_to IS NULL OR effective_to >= effective_from),

    -- Audit
    created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE  assessment_type_rules                     IS 'Règles métier pilotées par la BD pour chaque type d''évaluation. Aucune règle ne doit être codée en dur.';
COMMENT ON COLUMN assessment_type_rules.generates_ranking   IS 'TRUE = un classement est produit après chaque session.';
COMMENT ON COLUMN assessment_type_rules.generates_average   IS 'TRUE = une moyenne générale est calculée.';
COMMENT ON COLUMN assessment_type_rules.affects_promotion   IS 'TRUE = les résultats conditionnent la décision de passage.';
COMMENT ON COLUMN assessment_type_rules.allows_absence_status IS 'TRUE = un statut d''absence peut être enregistré sur la feuille de notes.';
COMMENT ON COLUMN assessment_type_rules.allows_excused_absence IS 'TRUE = une absence justifiée est distinguée de l''absence non justifiée.';
COMMENT ON COLUMN assessment_type_rules.unlimited_occurrences IS 'TRUE = aucun plafond annuel. Supplante max_occurrences_per_year de assessment_types.';
COMMENT ON COLUMN assessment_type_rules.version             IS 'Numéro de version correspondant à assessment_types.version.';
COMMENT ON COLUMN assessment_type_rules.effective_from      IS 'Date d''entrée en vigueur de ces règles.';
COMMENT ON COLUMN assessment_type_rules.effective_to        IS 'Date de fin de validité. NULL si encore actif.';

-- =============================================================================
-- INDEX DE PERFORMANCE (OPTIMISATION DES RECHERCHES ET JOINTURES)
-- =============================================================================

-- assessment_types
CREATE INDEX IF NOT EXISTS idx_assessment_types_school
    ON assessment_types(school_id)              WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_assessment_types_code
    ON assessment_types(code)                   WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_assessment_types_scale_type
    ON assessment_types(scale_type)             WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_assessment_types_version
    ON assessment_types(version);
CREATE INDEX IF NOT EXISTS idx_assessment_types_effective
    ON assessment_types(effective_from, effective_to);

-- assessment_type_levels
CREATE INDEX IF NOT EXISTS idx_assessment_type_levels_type
    ON assessment_type_levels(assessment_type_id);
CREATE INDEX IF NOT EXISTS idx_assessment_type_levels_level
    ON assessment_type_levels(level_id);

-- assessment_type_rules
CREATE INDEX IF NOT EXISTS idx_assessment_type_rules_type
    ON assessment_type_rules(assessment_type_id);
CREATE INDEX IF NOT EXISTS idx_assessment_type_rules_version
    ON assessment_type_rules(version);
CREATE INDEX IF NOT EXISTS idx_assessment_type_rules_effective
    ON assessment_type_rules(effective_from, effective_to);

-- =============================================================================
-- POLITIQUES DE SÉCURITÉ RLS (ROW LEVEL SECURITY)
-- =============================================================================

ALTER TABLE assessment_scales      ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_types       ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_type_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_type_rules  ENABLE ROW LEVEL SECURITY;

-- ─── assessment_scales ────────────────────────────────────────────────────────
-- Lecture : tout utilisateur authentifié (échelles globales, pas de school_id)
CREATE POLICY "assessment_scales_read"
    ON assessment_scales FOR SELECT
    TO authenticated
    USING (is_active = TRUE);

-- Écriture : Admin uniquement (référentiel système)
CREATE POLICY "assessment_scales_write"
    ON assessment_scales FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.role IN ('ADMIN_GENERALE')
        )
    );

-- ─── assessment_types ─────────────────────────────────────────────────────────
-- Lecture : tout utilisateur authentifié (types visibles pour la saisie de notes)
CREATE POLICY "assessment_types_read"
    ON assessment_types FOR SELECT
    TO authenticated
    USING (is_deleted = FALSE);

-- Écriture : Admin général et coordinateur scolaire
CREATE POLICY "assessment_types_write"
    ON assessment_types FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.role IN ('ADMIN_GENERALE', 'SCOLAIRE_ENSEIGNANT')
        )
    );

-- ─── assessment_type_levels ───────────────────────────────────────────────────
-- Lecture : tout utilisateur authentifié
CREATE POLICY "assessment_type_levels_read"
    ON assessment_type_levels FOR SELECT
    TO authenticated
    USING (TRUE);

-- Écriture : Admin général et coordinateur scolaire
CREATE POLICY "assessment_type_levels_write"
    ON assessment_type_levels FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.role IN ('ADMIN_GENERALE', 'SCOLAIRE_ENSEIGNANT')
        )
    );

-- ─── assessment_type_rules ────────────────────────────────────────────────────
-- Lecture : tout utilisateur authentifié (nécessaire pour le moteur de notes)
CREATE POLICY "assessment_type_rules_read"
    ON assessment_type_rules FOR SELECT
    TO authenticated
    USING (TRUE);

-- Écriture : Admin général uniquement (règles métier critiques)
CREATE POLICY "assessment_type_rules_write"
    ON assessment_type_rules FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.role IN ('ADMIN_GENERALE')
        )
    );

-- =============================================================================
-- SEED DE DONNÉES INITIALES
-- Données pilotées par la BD — aucune valeur codée en dur dans les Services/UI.
-- =============================================================================

DO $$
DECLARE
    v_school_id UUID;

    -- ── UUIDs Stables Assessment Scales ──────────────────────────────────────
    v_scale_appre  UUID := 'e1000000-0000-4000-e000-000000000001';  -- APPRECIATION
    v_scale_10     UUID := 'e1000000-0000-4000-e000-000000000002';  -- SCORE_10
    v_scale_20     UUID := 'e1000000-0000-4000-e000-000000000003';  -- SCORE_20

    -- ── UUIDs Stables Assessment Types ───────────────────────────────────────
    v_type_pre     UUID := 'e2000000-0000-4000-e000-000000000001';  -- PRESCHOOL
    v_type_monthly UUID := 'e2000000-0000-4000-e000-000000000002';  -- MONTHLY
    v_type_iep     UUID := 'e2000000-0000-4000-e000-000000000003';  -- IEP
    v_type_mock    UUID := 'e2000000-0000-4000-e000-000000000004';  -- MOCK_EXAM

    -- ── Niveau IDs (from AE1 school_levels seed) ─────────────────────────────
    v_lvl_ps    UUID;
    v_lvl_ms    UUID;
    v_lvl_gs    UUID;
    v_lvl_cp1   UUID;
    v_lvl_cp2   UUID;
    v_lvl_ce1   UUID;
    v_lvl_ce2   UUID;
    v_lvl_cm1   UUID;
    v_lvl_cm2   UUID;

BEGIN
    -- Récupérer l'école par défaut
    SELECT id INTO v_school_id FROM schools LIMIT 1;
    IF v_school_id IS NULL THEN
        v_school_id := '00000000-0000-0000-0000-000000000001';
    END IF;

    -- Résoudre les IDs des niveaux depuis AE1
    SELECT id INTO v_lvl_ps  FROM school_levels WHERE code = 'PS'  LIMIT 1;
    SELECT id INTO v_lvl_ms  FROM school_levels WHERE code = 'MS'  LIMIT 1;
    SELECT id INTO v_lvl_gs  FROM school_levels WHERE code = 'GS'  LIMIT 1;
    SELECT id INTO v_lvl_cp1 FROM school_levels WHERE code = 'CP1' LIMIT 1;
    SELECT id INTO v_lvl_cp2 FROM school_levels WHERE code = 'CP2' LIMIT 1;
    SELECT id INTO v_lvl_ce1 FROM school_levels WHERE code = 'CE1' LIMIT 1;
    SELECT id INTO v_lvl_ce2 FROM school_levels WHERE code = 'CE2' LIMIT 1;
    SELECT id INTO v_lvl_cm1 FROM school_levels WHERE code = 'CM1' LIMIT 1;
    SELECT id INTO v_lvl_cm2 FROM school_levels WHERE code = 'CM2' LIMIT 1;

    -- ══════════════════════════════════════════════════════════════════════════
    -- 1. SEED : ASSESSMENT_SCALES
    -- ══════════════════════════════════════════════════════════════════════════

    INSERT INTO assessment_scales (id, code, name, description, minimum_value, maximum_value, is_active)
    VALUES
        (
            v_scale_appre,
            'APPRECIATION',
            'Appréciation',
            'Évaluation qualitative par mention : TB (Très Bien), B (Bien), AB (Assez Bien), P (Passable), I (Insuffisant)',
            NULL,
            NULL,
            TRUE
        ),
        (
            v_scale_10,
            'SCORE_10',
            'Note sur 10',
            'Notation numérique sur une échelle de 0 à 10.',
            0,
            10,
            TRUE
        ),
        (
            v_scale_20,
            'SCORE_20',
            'Note sur 20',
            'Notation numérique sur une échelle de 0 à 20. Standard pédagogique ivoirien (MENA).',
            0,
            20,
            TRUE
        )
    ON CONFLICT (code) DO UPDATE SET
        name          = EXCLUDED.name,
        description   = EXCLUDED.description,
        minimum_value = EXCLUDED.minimum_value,
        maximum_value = EXCLUDED.maximum_value;

    -- ══════════════════════════════════════════════════════════════════════════
    -- 2. SEED : ASSESSMENT_TYPES
    -- ══════════════════════════════════════════════════════════════════════════

    INSERT INTO assessment_types (
        id, school_id, code, name, description,
        scale_type, ranking_enabled, promotion_enabled,
        max_occurrences_per_year, default_display_order,
        version, effective_from, is_active
    )
    VALUES
        -- ── TYPE 1 : PRESCHOOL (Évaluation Préscolaire — Appréciation uniquement) ──
        (
            v_type_pre,
            v_school_id,
            'PRESCHOOL',
            'Évaluation Préscolaire',
            'Évaluation qualitative par mention (TB/B/AB/P/I) destinée aux niveaux PS, MS et GS. '
            'Pas de classement ni de note numérique. Bilan de développement de l''enfant.',
            'APPRECIATION',
            FALSE,   -- ranking_enabled
            FALSE,   -- promotion_enabled
            NULL,    -- max_occurrences_per_year (illimité — voir rules)
            1,       -- default_display_order
            1,
            '2024-09-01',
            TRUE
        ),
        -- ── TYPE 2 : MONTHLY (Composition Mensuelle — /20) ──────────────────
        (
            v_type_monthly,
            v_school_id,
            'MONTHLY',
            'Composition Mensuelle',
            'Évaluation mensuelle notée sur 20 pour les niveaux CP1 à CM1. '
            'Génère un classement et contribue à la moyenne annuelle. '
            'Soumis au calendrier scolaire officiel ivoirien.',
            'SCORE_20',
            TRUE,    -- ranking_enabled
            FALSE,   -- promotion_enabled (la promotion est décidée par le Conseil de classe)
            9,       -- max_occurrences_per_year (environ 9 mois scolaires)
            2,       -- default_display_order
            1,
            '2024-09-01',
            TRUE
        ),
        -- ── TYPE 3 : IEP (Composition IEP — Intermédiaire Évaluation Périodique) ──
        (
            v_type_iep,
            v_school_id,
            'IEP',
            'Composition IEP',
            'Évaluation périodique intermédiaire notée sur 20 pour CP1 à CM2. '
            'Organisée par l''Inspection de l''Éducation Nationale. '
            'Génère un classement officiel. Contribue à la décision de promotion.',
            'SCORE_20',
            TRUE,    -- ranking_enabled
            TRUE,    -- affects_promotion
            3,       -- max_occurrences_per_year (environ 3 par an — T1, T2, T3)
            3,       -- default_display_order
            1,
            '2024-09-01',
            TRUE
        ),
        -- ── TYPE 4 : MOCK_EXAM (Examen Blanc — CM2 uniquement) ───────────────
        (
            v_type_mock,
            v_school_id,
            'MOCK_EXAM',
            'Examen Blanc',
            'Simulation d''examen officiel (CEPE) réservée exclusivement aux élèves de CM2. '
            'Notation sur 20. Génère un classement. Déterminant pour la préparation au CEPE.',
            'SCORE_20',
            TRUE,    -- ranking_enabled
            FALSE,   -- promotion_enabled (résultat consultatif)
            2,       -- max_occurrences_per_year
            4,       -- default_display_order
            1,
            '2024-09-01',
            TRUE
        )
    ON CONFLICT (school_id, code) DO UPDATE SET
        name                     = EXCLUDED.name,
        description              = EXCLUDED.description,
        scale_type               = EXCLUDED.scale_type,
        ranking_enabled          = EXCLUDED.ranking_enabled,
        promotion_enabled        = EXCLUDED.promotion_enabled,
        max_occurrences_per_year = EXCLUDED.max_occurrences_per_year,
        default_display_order    = EXCLUDED.default_display_order,
        updated_at               = CURRENT_TIMESTAMP;

    -- ══════════════════════════════════════════════════════════════════════════
    -- 3. SEED : ASSESSMENT_TYPE_LEVELS (Liaisons Niveaux ↔ Types)
    -- ══════════════════════════════════════════════════════════════════════════

    -- PRESCHOOL → PS, MS, GS
    IF v_lvl_ps IS NOT NULL THEN
        INSERT INTO assessment_type_levels (assessment_type_id, level_id)
        VALUES (v_type_pre, v_lvl_ps)
        ON CONFLICT (assessment_type_id, level_id) DO NOTHING;
    END IF;
    IF v_lvl_ms IS NOT NULL THEN
        INSERT INTO assessment_type_levels (assessment_type_id, level_id)
        VALUES (v_type_pre, v_lvl_ms)
        ON CONFLICT (assessment_type_id, level_id) DO NOTHING;
    END IF;
    IF v_lvl_gs IS NOT NULL THEN
        INSERT INTO assessment_type_levels (assessment_type_id, level_id)
        VALUES (v_type_pre, v_lvl_gs)
        ON CONFLICT (assessment_type_id, level_id) DO NOTHING;
    END IF;

    -- MONTHLY → CP1, CP2, CE1, CE2, CM1 (exclut CM2 — remplacé par IEP/ExBlanc)
    IF v_lvl_cp1 IS NOT NULL THEN
        INSERT INTO assessment_type_levels (assessment_type_id, level_id)
        VALUES (v_type_monthly, v_lvl_cp1)
        ON CONFLICT (assessment_type_id, level_id) DO NOTHING;
    END IF;
    IF v_lvl_cp2 IS NOT NULL THEN
        INSERT INTO assessment_type_levels (assessment_type_id, level_id)
        VALUES (v_type_monthly, v_lvl_cp2)
        ON CONFLICT (assessment_type_id, level_id) DO NOTHING;
    END IF;
    IF v_lvl_ce1 IS NOT NULL THEN
        INSERT INTO assessment_type_levels (assessment_type_id, level_id)
        VALUES (v_type_monthly, v_lvl_ce1)
        ON CONFLICT (assessment_type_id, level_id) DO NOTHING;
    END IF;
    IF v_lvl_ce2 IS NOT NULL THEN
        INSERT INTO assessment_type_levels (assessment_type_id, level_id)
        VALUES (v_type_monthly, v_lvl_ce2)
        ON CONFLICT (assessment_type_id, level_id) DO NOTHING;
    END IF;
    IF v_lvl_cm1 IS NOT NULL THEN
        INSERT INTO assessment_type_levels (assessment_type_id, level_id)
        VALUES (v_type_monthly, v_lvl_cm1)
        ON CONFLICT (assessment_type_id, level_id) DO NOTHING;
    END IF;

    -- IEP → CP1, CP2, CE1, CE2, CM1, CM2 (tous les niveaux primaires)
    IF v_lvl_cp1 IS NOT NULL THEN
        INSERT INTO assessment_type_levels (assessment_type_id, level_id)
        VALUES (v_type_iep, v_lvl_cp1)
        ON CONFLICT (assessment_type_id, level_id) DO NOTHING;
    END IF;
    IF v_lvl_cp2 IS NOT NULL THEN
        INSERT INTO assessment_type_levels (assessment_type_id, level_id)
        VALUES (v_type_iep, v_lvl_cp2)
        ON CONFLICT (assessment_type_id, level_id) DO NOTHING;
    END IF;
    IF v_lvl_ce1 IS NOT NULL THEN
        INSERT INTO assessment_type_levels (assessment_type_id, level_id)
        VALUES (v_type_iep, v_lvl_ce1)
        ON CONFLICT (assessment_type_id, level_id) DO NOTHING;
    END IF;
    IF v_lvl_ce2 IS NOT NULL THEN
        INSERT INTO assessment_type_levels (assessment_type_id, level_id)
        VALUES (v_type_iep, v_lvl_ce2)
        ON CONFLICT (assessment_type_id, level_id) DO NOTHING;
    END IF;
    IF v_lvl_cm1 IS NOT NULL THEN
        INSERT INTO assessment_type_levels (assessment_type_id, level_id)
        VALUES (v_type_iep, v_lvl_cm1)
        ON CONFLICT (assessment_type_id, level_id) DO NOTHING;
    END IF;
    IF v_lvl_cm2 IS NOT NULL THEN
        INSERT INTO assessment_type_levels (assessment_type_id, level_id)
        VALUES (v_type_iep, v_lvl_cm2)
        ON CONFLICT (assessment_type_id, level_id) DO NOTHING;
    END IF;

    -- MOCK_EXAM → CM2 uniquement
    IF v_lvl_cm2 IS NOT NULL THEN
        INSERT INTO assessment_type_levels (assessment_type_id, level_id)
        VALUES (v_type_mock, v_lvl_cm2)
        ON CONFLICT (assessment_type_id, level_id) DO NOTHING;
    END IF;

    -- ══════════════════════════════════════════════════════════════════════════
    -- 4. SEED : ASSESSMENT_TYPE_RULES (Règles Métier par Type)
    -- ══════════════════════════════════════════════════════════════════════════

    -- Règles PRESCHOOL
    INSERT INTO assessment_type_rules (
        assessment_type_id,
        generates_ranking,
        generates_average,
        affects_promotion,
        allows_absence_status,
        allows_excused_absence,
        unlimited_occurrences,
        notes,
        version,
        effective_from
    )
    VALUES (
        v_type_pre,
        FALSE,   -- generates_ranking  : pas de classement en préscolaire
        FALSE,   -- generates_average  : pas de moyenne numérique
        FALSE,   -- affects_promotion  : passage automatique en préscolaire
        TRUE,    -- allows_absence_status
        TRUE,    -- allows_excused_absence
        TRUE,    -- unlimited_occurrences : appréciation continue tout au long de l'année
        'Évaluation bienveillante par domaines de développement. '
        'Aucun classement. Passage automatique en classe supérieure. '
        'Le bulletin préscolaire utilise des appréciations (TB, B, AB, P, I).',
        1,
        '2024-09-01'
    )
    ON CONFLICT DO NOTHING;

    -- Règles MONTHLY
    INSERT INTO assessment_type_rules (
        assessment_type_id,
        generates_ranking,
        generates_average,
        affects_promotion,
        allows_absence_status,
        allows_excused_absence,
        unlimited_occurrences,
        notes,
        version,
        effective_from
    )
    VALUES (
        v_type_monthly,
        TRUE,    -- generates_ranking
        TRUE,    -- generates_average
        FALSE,   -- affects_promotion : mensuelle = évaluation formative, pas déterminante
        TRUE,    -- allows_absence_status
        TRUE,    -- allows_excused_absence
        FALSE,   -- unlimited_occurrences (plafonné à 9/an)
        'Composition mensuelle conforme au calendrier scolaire ivoirien. '
        'Génère un classement et contribue à la moyenne du trimestre. '
        'Les résultats sont communiqués aux parents chaque mois via le bulletin.',
        1,
        '2024-09-01'
    )
    ON CONFLICT DO NOTHING;

    -- Règles IEP
    INSERT INTO assessment_type_rules (
        assessment_type_id,
        generates_ranking,
        generates_average,
        affects_promotion,
        allows_absence_status,
        allows_excused_absence,
        unlimited_occurrences,
        notes,
        version,
        effective_from
    )
    VALUES (
        v_type_iep,
        TRUE,    -- generates_ranking
        TRUE,    -- generates_average
        TRUE,    -- affects_promotion : IEP conditionne le passage
        TRUE,    -- allows_absence_status
        TRUE,    -- allows_excused_absence
        FALSE,   -- unlimited_occurrences (3/an)
        'Composition officielle organisée par l''Inspection de l''Éducation et de la Formation (IEF). '
        'Les résultats sont déterminants pour la décision de promotion en conseil de classe. '
        'Trois sessions par an (T1, T2, T3). Bulletins officiels obligatoires.',
        1,
        '2024-09-01'
    )
    ON CONFLICT DO NOTHING;

    -- Règles MOCK_EXAM
    INSERT INTO assessment_type_rules (
        assessment_type_id,
        generates_ranking,
        generates_average,
        affects_promotion,
        allows_absence_status,
        allows_excused_absence,
        unlimited_occurrences,
        notes,
        version,
        effective_from
    )
    VALUES (
        v_type_mock,
        TRUE,    -- generates_ranking
        TRUE,    -- generates_average
        FALSE,   -- affects_promotion : consultatif, décision finale par le jury CEPE
        TRUE,    -- allows_absence_status
        TRUE,    -- allows_excused_absence
        FALSE,   -- unlimited_occurrences (2/an maximum)
        'Simulation de l''examen officiel du CEPE (Certificat d''Études Primaires Élémentaires). '
        'Réservé exclusivement aux élèves de CM2. '
        'Résultats consultatifs — la promotion officielle est accordée par le jury national. '
        'Maximum 2 examens blancs par année scolaire.',
        1,
        '2024-09-01'
    )
    ON CONFLICT DO NOTHING;

END $$;
