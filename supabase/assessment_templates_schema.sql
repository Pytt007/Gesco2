-- =============================================================================
-- GESCO — MODULE : MOTEUR DES MODÈLES D'ÉVALUATION (AE3b – EVALUATION TEMPLATES)
-- (PostgreSQL / Supabase — Moteur Académique / Modèles & Formules)
-- =============================================================================
-- Script DDL Idempotent : Tables, Contraintes, Index, Politiques RLS & Seed
--
-- Tables créées :
--   1. assessment_formulas           — Formules de calcul de moyenne (pilotées par la BD)
--   2. assessment_templates          — Modèles d'évaluation (type + niveau + version)
--   3. assessment_template_subjects  — Matières, barèmes et coefficients par modèle
--   4. template_formulas             — Association modèle ↔ formule de calcul
--
-- Dépendances (modules verrouillés) :
--   - school_levels         (AE1 — Structure Académique)
--   - academic_years        (AE1 — Structure Académique)
--   - subjects              (AE2 — Catalogue Pédagogique)
--   - assessment_types      (AE3 — Types d'Évaluation)
--   - profiles / schools    (Paramètres / Utilisateurs & Rôles)
--
-- Règle fondamentale :
--   AUCUNE règle pédagogique ne doit être codée en dur dans les Services ou l'UI.
--   Toutes les règles (barèmes, formules, niveaux éligibles) sont pilotées par ce schéma.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. TABLE : ASSESSMENT_FORMULAS (FORMULES DE CALCUL DE MOYENNE)
-- =============================================================================
-- Catalogue global des formules applicables dans GESCO.
-- Chaque formule encode la règle de calcul de la moyenne générale d'une évaluation.
-- Exemples ivoiriens MENA :
--   SUM_OVER_9    → SUM(notes) / 9          (CP1/CP2 — 9 matières /10)
--   SUM_OVER_8    → SUM(notes) / 8          (préscolaire ou CP allégé)
--   SUM_OVER_10   → SUM(notes) / 10         (CE1/CE2 — 10 matières /10)
--   WEIGHTED_CM1  → (SUM(coeff×note)/170)×20 (CM1 — barèmes pondérés, total max 170)
--   WEIGHTED_CM2  → (SUM(coeff×note)/180)×20 (CM2 — barèmes pondérés, total max 180)
--   APPRECIATION  → APPRECIATION_ENGINE      (Préscolaire — pas de calcul numérique)
-- =============================================================================

CREATE TABLE IF NOT EXISTS assessment_formulas (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identification
    code                VARCHAR(80) NOT NULL,             -- 'SUM_OVER_9', 'WEIGHTED_CM1', 'APPRECIATION'
    name                VARCHAR(150) NOT NULL,            -- Libellé lisible pour l'UI
    description         TEXT,

    -- Expression de calcul (interprétée par le moteur de notes)
    -- Exemples : 'SUM(grades)/9', '(SUM(coeff*grade)/170)*20', 'APPRECIATION_ENGINE'
    formula_expression  TEXT NOT NULL,

    -- Échelle du résultat produit par cette formule
    result_scale        VARCHAR(20) NOT NULL DEFAULT 'SCORE_20',
    CONSTRAINT chk_formula_result_scale
        CHECK (result_scale IN ('APPRECIATION', 'SCORE_10', 'SCORE_20')),

    -- Versioning temporel (cohérence avec les templates)
    version             INT         NOT NULL DEFAULT 1,
    effective_from      DATE,
    effective_to        DATE,
    CONSTRAINT chk_assessment_formulas_dates
        CHECK (effective_to IS NULL OR effective_to >= effective_from),

    -- État
    is_active           BOOLEAN     NOT NULL DEFAULT TRUE,

    -- Audit
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_assessment_formulas_code UNIQUE (code)
);

COMMENT ON TABLE  assessment_formulas                    IS 'Catalogue des formules de calcul de moyenne. Aucune formule ne doit être codée en dur dans le code.';
COMMENT ON COLUMN assessment_formulas.code               IS 'Identifiant technique unique. Ex : SUM_OVER_9, WEIGHTED_CM1, APPRECIATION_ENGINE.';
COMMENT ON COLUMN assessment_formulas.formula_expression IS 'Expression de calcul interprétée par le moteur de notes. Ex : SUM(grades)/9 ou (SUM(coeff*grade)/170)*20.';
COMMENT ON COLUMN assessment_formulas.result_scale       IS 'Échelle du résultat produit. APPRECIATION | SCORE_10 | SCORE_20.';
COMMENT ON COLUMN assessment_formulas.version            IS 'Numéro de version permettant l''historique des formules.';

-- =============================================================================
-- 2. TABLE : ASSESSMENT_TEMPLATES (MODÈLES D'ÉVALUATION)
-- =============================================================================
-- Un modèle définit précisément comment une évaluation est construite :
--   quel type (MONTHLY, IEP...) + quel niveau (CP1, CM2...) + quelle année scolaire.
-- Un seul modèle actif par (type, niveau, version). Versioning temporel intégré.
-- =============================================================================

CREATE TABLE IF NOT EXISTS assessment_templates (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id           UUID        REFERENCES schools(id) ON DELETE RESTRICT,

    -- Identification
    code                VARCHAR(100) NOT NULL,            -- Ex : 'CP1_MONTHLY_V1', 'CM2_IEP_V1'
    name                VARCHAR(200) NOT NULL,            -- Ex : 'CP1 — Composition Mensuelle (v1)'
    description         TEXT,

    -- Relations fonctionnelles (AE3 & AE1)
    assessment_type_id  UUID        NOT NULL REFERENCES assessment_types(id) ON DELETE RESTRICT,
    level_id            UUID        NOT NULL REFERENCES school_levels(id)    ON DELETE RESTRICT,
    academic_year_id    UUID        REFERENCES academic_years(id)            ON DELETE SET NULL,
    -- NULL = modèle par défaut valable pour toutes les années scolaires

    -- Versioning temporel
    version             INT         NOT NULL DEFAULT 1,
    effective_from      DATE,
    effective_to        DATE,
    CONSTRAINT chk_assessment_templates_dates
        CHECK (effective_to IS NULL OR effective_to >= effective_from),

    -- État & Soft Delete
    is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
    is_deleted          BOOLEAN     NOT NULL DEFAULT FALSE,
    deleted_at          TIMESTAMPTZ,

    -- Audit
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_assessment_template_school_code UNIQUE (school_id, code)
);

-- Unicité partielle : un seul modèle actif par (école, type, niveau, version)
CREATE UNIQUE INDEX IF NOT EXISTS uq_template_active_per_type_level
    ON assessment_templates(school_id, assessment_type_id, level_id, version)
    WHERE is_deleted = FALSE AND is_active = TRUE;

COMMENT ON TABLE  assessment_templates                    IS 'Modèles d''évaluation GESCO : définissent la structure exacte d''une composition pour un niveau et un type donnés.';
COMMENT ON COLUMN assessment_templates.code               IS 'Identifiant technique unique par école. Ex : CP1_MONTHLY_V1, CM2_IEP_V1.';
COMMENT ON COLUMN assessment_templates.assessment_type_id IS 'FK vers assessment_types — type d''évaluation concerné (MONTHLY, IEP, PRESCHOOL...).';
COMMENT ON COLUMN assessment_templates.level_id           IS 'FK vers school_levels (AE1) — niveau scolaire ciblé (PS, CP1, CM2...).';
COMMENT ON COLUMN assessment_templates.academic_year_id   IS 'FK optionnelle vers academic_years. NULL = modèle par défaut toutes années.';
COMMENT ON COLUMN assessment_templates.version            IS 'Numéro de version. Permet plusieurs versions actives sur des périodes différentes.';
COMMENT ON COLUMN assessment_templates.effective_from     IS 'Date d''entrée en vigueur du modèle. NULL = dès la création.';
COMMENT ON COLUMN assessment_templates.effective_to       IS 'Date de fin de validité. NULL = encore actif.';

-- =============================================================================
-- 3. TABLE : ASSESSMENT_TEMPLATE_SUBJECTS (MATIÈRES DU MODÈLE)
-- =============================================================================
-- Détaille la liste des matières, barèmes, coefficients et modes de saisie
-- pour chaque modèle d'évaluation.
-- Une matière ne peut apparaître qu'UNE seule fois par modèle (contrainte UNIQUE).
-- =============================================================================

CREATE TABLE IF NOT EXISTS assessment_template_subjects (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id     UUID        NOT NULL REFERENCES assessment_templates(id) ON DELETE CASCADE,
    subject_id      UUID        NOT NULL REFERENCES subjects(id)             ON DELETE RESTRICT,

    -- Affichage
    display_order   INT         NOT NULL DEFAULT 1,

    -- Barème
    maximum_score   NUMERIC(6, 2) NOT NULL DEFAULT 10,
    CONSTRAINT chk_ats_maximum_score_positive CHECK (maximum_score > 0),

    -- Coefficient de pondération (1 = pas de pondération)
    coefficient     NUMERIC(4, 2) NOT NULL DEFAULT 1.0,
    CONSTRAINT chk_ats_coefficient_positive CHECK (coefficient > 0),

    -- Mode de saisie de la note
    assessment_mode VARCHAR(20) NOT NULL DEFAULT 'GRADE',
    CONSTRAINT chk_ats_assessment_mode
        CHECK (assessment_mode IN ('GRADE', 'APPRECIATION')),

    -- Obligation
    is_required     BOOLEAN     NOT NULL DEFAULT TRUE,

    -- Audit
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Unicité : une matière ne peut être présente qu'une fois par modèle
    CONSTRAINT uq_template_subject UNIQUE (template_id, subject_id)
);

COMMENT ON TABLE  assessment_template_subjects                 IS 'Matières composant un modèle d''évaluation avec leurs barèmes, coefficients et modes de saisie.';
COMMENT ON COLUMN assessment_template_subjects.maximum_score   IS 'Barème maximum de la matière dans ce modèle. Positif obligatoire.';
COMMENT ON COLUMN assessment_template_subjects.coefficient     IS 'Coefficient de pondération. 1 = pas de pondération. Positif obligatoire.';
COMMENT ON COLUMN assessment_template_subjects.assessment_mode IS 'GRADE = saisie numérique ; APPRECIATION = saisie qualitative (TB/B/AB/P/I).';
COMMENT ON COLUMN assessment_template_subjects.is_required     IS 'TRUE = la note est obligatoire pour clôturer l''évaluation.';

-- =============================================================================
-- 4. TABLE : TEMPLATE_FORMULAS (ASSOCIATION MODÈLE ↔ FORMULE)
-- =============================================================================
-- Lie un modèle d'évaluation à une ou plusieurs formules de calcul.
-- Dans la grande majorité des cas, un modèle utilise une seule formule (moyenne).
-- =============================================================================

CREATE TABLE IF NOT EXISTS template_formulas (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID        NOT NULL REFERENCES assessment_templates(id)  ON DELETE CASCADE,
    formula_id  UUID        NOT NULL REFERENCES assessment_formulas(id)   ON DELETE RESTRICT,

    -- Audit
    created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_template_formula UNIQUE (template_id, formula_id)
);

COMMENT ON TABLE  template_formulas            IS 'Association many-to-many entre modèles d''évaluation et formules de calcul.';
COMMENT ON COLUMN template_formulas.template_id IS 'FK vers assessment_templates.';
COMMENT ON COLUMN template_formulas.formula_id  IS 'FK vers assessment_formulas.';

-- =============================================================================
-- INDEX DE PERFORMANCE
-- =============================================================================

-- assessment_templates
CREATE INDEX IF NOT EXISTS idx_templates_type
    ON assessment_templates(assessment_type_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_templates_level
    ON assessment_templates(level_id)           WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_templates_year
    ON assessment_templates(academic_year_id)   WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_templates_school
    ON assessment_templates(school_id)          WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_templates_version
    ON assessment_templates(version);
CREATE INDEX IF NOT EXISTS idx_templates_effective
    ON assessment_templates(effective_from, effective_to);

-- assessment_template_subjects
CREATE INDEX IF NOT EXISTS idx_tpl_subjects_template
    ON assessment_template_subjects(template_id);
CREATE INDEX IF NOT EXISTS idx_tpl_subjects_subject
    ON assessment_template_subjects(subject_id);

-- template_formulas
CREATE INDEX IF NOT EXISTS idx_tpl_formulas_template
    ON template_formulas(template_id);
CREATE INDEX IF NOT EXISTS idx_tpl_formulas_formula
    ON template_formulas(formula_id);

-- assessment_formulas
CREATE INDEX IF NOT EXISTS idx_formulas_version
    ON assessment_formulas(version);

-- =============================================================================
-- POLITIQUES DE SÉCURITÉ RLS (ROW LEVEL SECURITY)
-- =============================================================================

ALTER TABLE assessment_formulas          ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_templates         ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_template_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_formulas            ENABLE ROW LEVEL SECURITY;

-- ─── assessment_formulas ──────────────────────────────────────────────────────
CREATE POLICY "assessment_formulas_read"
    ON assessment_formulas FOR SELECT TO authenticated
    USING (is_active = TRUE);

CREATE POLICY "assessment_formulas_write"
    ON assessment_formulas FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.role IN ('ADMIN_GENERALE')
        )
    );

-- ─── assessment_templates ─────────────────────────────────────────────────────
CREATE POLICY "assessment_templates_read"
    ON assessment_templates FOR SELECT TO authenticated
    USING (is_deleted = FALSE);

CREATE POLICY "assessment_templates_write"
    ON assessment_templates FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.role IN ('ADMIN_GENERALE', 'SCOLAIRE_ENSEIGNANT')
        )
    );

-- ─── assessment_template_subjects ─────────────────────────────────────────────
CREATE POLICY "template_subjects_read"
    ON assessment_template_subjects FOR SELECT TO authenticated
    USING (TRUE);

CREATE POLICY "template_subjects_write"
    ON assessment_template_subjects FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.role IN ('ADMIN_GENERALE', 'SCOLAIRE_ENSEIGNANT')
        )
    );

-- ─── template_formulas ────────────────────────────────────────────────────────
CREATE POLICY "template_formulas_read"
    ON template_formulas FOR SELECT TO authenticated
    USING (TRUE);

CREATE POLICY "template_formulas_write"
    ON template_formulas FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.role IN ('ADMIN_GENERALE', 'SCOLAIRE_ENSEIGNANT')
        )
    );

-- =============================================================================
-- SEED — DONNÉES INITIALES DU MOTEUR PÉDAGOGIQUE GESCO (MENA / Côte d'Ivoire)
-- =============================================================================

DO $$
DECLARE
    v_school_id UUID;

    -- ── UUIDs stables — Assessment Types (depuis AE3) ────────────────────────
    v_type_pre     UUID := 'e2000000-0000-4000-e000-000000000001';  -- PRESCHOOL
    v_type_monthly UUID := 'e2000000-0000-4000-e000-000000000002';  -- MONTHLY
    v_type_iep     UUID := 'e2000000-0000-4000-e000-000000000003';  -- IEP
    v_type_mock    UUID := 'e2000000-0000-4000-e000-000000000004';  -- MOCK_EXAM

    -- ── UUIDs stables — Formules ─────────────────────────────────────────────
    v_f_appre   UUID := 'f1000000-0000-4000-f000-000000000001';  -- APPRECIATION_ENGINE
    v_f_sum8    UUID := 'f1000000-0000-4000-f000-000000000002';  -- SUM_OVER_8
    v_f_sum9    UUID := 'f1000000-0000-4000-f000-000000000003';  -- SUM_OVER_9
    v_f_sum10   UUID := 'f1000000-0000-4000-f000-000000000004';  -- SUM_OVER_10
    v_f_w170    UUID := 'f1000000-0000-4000-f000-000000000005';  -- WEIGHTED_170 (CM1)
    v_f_w180    UUID := 'f1000000-0000-4000-f000-000000000006';  -- WEIGHTED_180 (CM2)

    -- ── UUIDs stables — Assessment Templates ─────────────────────────────────
    v_tpl_ps_pre    UUID := 'f2000000-0000-4000-f000-000000000001';  -- PS Préscolaire
    v_tpl_ms_pre    UUID := 'f2000000-0000-4000-f000-000000000002';  -- MS Préscolaire
    v_tpl_gs_pre    UUID := 'f2000000-0000-4000-f000-000000000003';  -- GS Préscolaire
    v_tpl_cp1_mo    UUID := 'f2000000-0000-4000-f000-000000000004';  -- CP1 Mensuelle
    v_tpl_cp1_iep   UUID := 'f2000000-0000-4000-f000-000000000005';  -- CP1 IEP
    v_tpl_cp2_mo    UUID := 'f2000000-0000-4000-f000-000000000006';  -- CP2 Mensuelle
    v_tpl_cp2_iep   UUID := 'f2000000-0000-4000-f000-000000000007';  -- CP2 IEP
    v_tpl_ce1_mo    UUID := 'f2000000-0000-4000-f000-000000000008';  -- CE1 Mensuelle
    v_tpl_ce1_iep   UUID := 'f2000000-0000-4000-f000-000000000009';  -- CE1 IEP
    v_tpl_ce2_mo    UUID := 'f2000000-0000-4000-f000-000000000010';  -- CE2 Mensuelle
    v_tpl_ce2_iep   UUID := 'f2000000-0000-4000-f000-000000000011';  -- CE2 IEP
    v_tpl_cm1_mo    UUID := 'f2000000-0000-4000-f000-000000000012';  -- CM1 Mensuelle
    v_tpl_cm1_iep   UUID := 'f2000000-0000-4000-f000-000000000013';  -- CM1 IEP
    v_tpl_cm2_iep   UUID := 'f2000000-0000-4000-f000-000000000014';  -- CM2 IEP
    v_tpl_cm2_mock  UUID := 'f2000000-0000-4000-f000-000000000015';  -- CM2 Examen Blanc

    -- ── Niveaux scolaires (résolus dynamiquement depuis AE1) ─────────────────
    v_lvl_ps  UUID; v_lvl_ms  UUID; v_lvl_gs  UUID;
    v_lvl_cp1 UUID; v_lvl_cp2 UUID;
    v_lvl_ce1 UUID; v_lvl_ce2 UUID;
    v_lvl_cm1 UUID; v_lvl_cm2 UUID;

    -- ── Matières (résolues dynamiquement depuis AE2) ─────────────────────────
    -- Préscolaire
    v_s_graphisme UUID; v_s_lect_ps UUID; v_s_langage UUID;
    v_s_math_ps   UUID; v_s_aem     UUID; v_s_aec     UUID;
    -- Primaire
    v_s_lecture   UUID; v_s_ecriture UUID; v_s_copie    UUID;
    v_s_ortho     UUID; v_s_expr     UUID; v_s_math_pri UUID;
    v_s_edt       UUID; v_s_edm      UUID;
    -- Sous-matières composées (EDM)
    v_s_histoire  UUID; v_s_geo      UUID; v_s_sciences UUID;
    -- Complémentaires
    v_s_chant     UUID; v_s_dessin   UUID; v_s_ecm      UUID;
    v_s_anglais   UUID; v_s_info     UUID;

BEGIN
    -- Récupérer l'école par défaut
    SELECT id INTO v_school_id FROM schools LIMIT 1;
    IF v_school_id IS NULL THEN
        v_school_id := '00000000-0000-0000-0000-000000000001';
    END IF;

    -- ── Résoudre les Niveaux (AE1) ────────────────────────────────────────────
    SELECT id INTO v_lvl_ps  FROM school_levels WHERE code = 'PS'  LIMIT 1;
    SELECT id INTO v_lvl_ms  FROM school_levels WHERE code = 'MS'  LIMIT 1;
    SELECT id INTO v_lvl_gs  FROM school_levels WHERE code = 'GS'  LIMIT 1;
    SELECT id INTO v_lvl_cp1 FROM school_levels WHERE code = 'CP1' LIMIT 1;
    SELECT id INTO v_lvl_cp2 FROM school_levels WHERE code = 'CP2' LIMIT 1;
    SELECT id INTO v_lvl_ce1 FROM school_levels WHERE code = 'CE1' LIMIT 1;
    SELECT id INTO v_lvl_ce2 FROM school_levels WHERE code = 'CE2' LIMIT 1;
    SELECT id INTO v_lvl_cm1 FROM school_levels WHERE code = 'CM1' LIMIT 1;
    SELECT id INTO v_lvl_cm2 FROM school_levels WHERE code = 'CM2' LIMIT 1;

    -- ── Résoudre les Matières (AE2) ──────────────────────────────────────────
    -- Préscolaire
    SELECT id INTO v_s_graphisme FROM subjects WHERE code = 'PRE_GRAPH' LIMIT 1;
    SELECT id INTO v_s_lect_ps   FROM subjects WHERE code = 'PRE_LECT'  LIMIT 1;
    SELECT id INTO v_s_langage   FROM subjects WHERE code = 'PRE_LANG'  LIMIT 1;
    SELECT id INTO v_s_math_ps   FROM subjects WHERE code = 'PRE_MATH'  LIMIT 1;
    SELECT id INTO v_s_aem       FROM subjects WHERE code = 'PRE_AEM'   LIMIT 1;
    SELECT id INTO v_s_aec       FROM subjects WHERE code = 'PRE_AEC'   LIMIT 1;
    -- Primaire principal
    SELECT id INTO v_s_lecture   FROM subjects WHERE code = 'PRI_LECT'  LIMIT 1;
    SELECT id INTO v_s_ecriture  FROM subjects WHERE code = 'PRI_ECRIT' LIMIT 1;
    SELECT id INTO v_s_copie     FROM subjects WHERE code = 'PRI_COPIE' LIMIT 1;
    SELECT id INTO v_s_ortho     FROM subjects WHERE code = 'PRI_ORTHO' LIMIT 1;
    SELECT id INTO v_s_expr      FROM subjects WHERE code = 'PRI_EXPR'  LIMIT 1;
    SELECT id INTO v_s_math_pri  FROM subjects WHERE code = 'PRI_MATH'  LIMIT 1;
    SELECT id INTO v_s_edt       FROM subjects WHERE code = 'PRI_EDT'   LIMIT 1;
    SELECT id INTO v_s_edm       FROM subjects WHERE code = 'PRI_EDM'   LIMIT 1;
    -- Sous-matières EDM
    SELECT id INTO v_s_histoire  FROM subjects WHERE code = 'SUB_HIST'  LIMIT 1;
    SELECT id INTO v_s_geo       FROM subjects WHERE code = 'SUB_GEO'   LIMIT 1;
    SELECT id INTO v_s_sciences  FROM subjects WHERE code = 'SUB_SCI'   LIMIT 1;
    -- Complémentaires
    SELECT id INTO v_s_chant     FROM subjects WHERE code = 'COMP_CHANT'  LIMIT 1;
    SELECT id INTO v_s_dessin    FROM subjects WHERE code = 'COMP_DESSIN' LIMIT 1;
    SELECT id INTO v_s_ecm       FROM subjects WHERE code = 'COMP_ECM'    LIMIT 1;
    SELECT id INTO v_s_anglais   FROM subjects WHERE code = 'COMP_ANG'    LIMIT 1;
    SELECT id INTO v_s_info      FROM subjects WHERE code = 'COMP_INFO'   LIMIT 1;

    -- ══════════════════════════════════════════════════════════════════════════
    -- SEED 1 : ASSESSMENT_FORMULAS
    -- ══════════════════════════════════════════════════════════════════════════
    --
    -- Règles MENA / Côte d'Ivoire :
    --   CP1/CP2 Mensuelle   : 9 matières /10 → moyenne = SUM/9   → résultat /10 (×2 = /20)
    --   CP1/CP2 IEP         : 8 matières /10 + coeff → SUM_OVER_8
    --   CE1/CE2 Mensuelle   : 10 matières /10 → SUM/10 → résultat /10
    --   CE1/CE2 IEP         : 10 matières /10 → SUM/10
    --   CM1 Mensuelle/IEP   : 15 matières, 2 avec coeff=2 → max pondéré=170 → (SUM/170)×20
    --   CM2 IEP/ExBlanc     : 15 matières, 3 avec coeff=2 → max pondéré=180 → (SUM/180)×20
    --   Préscolaire         : APPRECIATION_ENGINE (pas de calcul numérique)
    --
    INSERT INTO assessment_formulas (id, code, name, description, formula_expression, result_scale, version, effective_from)
    VALUES
        (
            v_f_appre,
            'APPRECIATION_ENGINE',
            'Moteur d''Appréciation Préscolaire',
            'Évaluation qualitative par domaines de compétences. Pas de calcul numérique. '
            'Mentions : TB (Très Bien), B (Bien), AB (Assez Bien), P (Passable), I (Insuffisant).',
            'APPRECIATION_ENGINE',
            'APPRECIATION',
            1, '2024-09-01'
        ),
        (
            v_f_sum8,
            'SUM_OVER_8',
            'Moyenne SUM / 8 (IEP CP1/CP2)',
            'Somme des 8 notes /10 divisée par 8. Résultat exprimé sur 10. '
            'Applicable aux Compositions IEP CP1 et CP2 (8 matières principales).',
            'SUM(grades)/8',
            'SCORE_10',
            1, '2024-09-01'
        ),
        (
            v_f_sum9,
            'SUM_OVER_9',
            'Moyenne SUM / 9 (Mensuelle CP1/CP2)',
            'Somme des 9 notes /10 divisée par 9. Résultat exprimé sur 10. '
            'Applicable aux Compositions Mensuelles CP1 et CP2 (9 matières dont ECM).',
            'SUM(grades)/9',
            'SCORE_10',
            1, '2024-09-01'
        ),
        (
            v_f_sum10,
            'SUM_OVER_10',
            'Moyenne SUM / 10 (CE1/CE2)',
            'Somme des 10 notes /10 divisée par 10. Résultat exprimé sur 10. '
            'Applicable aux Compositions Mensuelles et IEP CE1 et CE2 (10 matières).',
            'SUM(grades)/10',
            'SCORE_10',
            1, '2024-09-01'
        ),
        (
            v_f_w170,
            'WEIGHTED_OVER_170',
            'Moyenne pondérée / 170 × 20 (CM1)',
            'Somme pondérée (coeff × note) ramenée sur 20. '
            'CM1 : 15 matières /10, dont Lecture (coeff=2) et Mathématiques (coeff=2). '
            'Maximum pondéré = 17×10 = 170. Formule : (SUM(coeff×grade)/170)×20.',
            '(SUM(coeff*grade)/170)*20',
            'SCORE_20',
            1, '2024-09-01'
        ),
        (
            v_f_w180,
            'WEIGHTED_OVER_180',
            'Moyenne pondérée / 180 × 20 (CM2)',
            'Somme pondérée (coeff × note) ramenée sur 20. '
            'CM2 : 15 matières /10, dont Lecture (coeff=2), Mathématiques (coeff=2) et Orthographe (coeff=2). '
            'Maximum pondéré = 18×10 = 180. Formule : (SUM(coeff×grade)/180)×20.',
            '(SUM(coeff*grade)/180)*20',
            'SCORE_20',
            1, '2024-09-01'
        )
    ON CONFLICT (code) DO UPDATE SET
        name               = EXCLUDED.name,
        description        = EXCLUDED.description,
        formula_expression = EXCLUDED.formula_expression,
        result_scale       = EXCLUDED.result_scale,
        updated_at         = CURRENT_TIMESTAMP;

    -- ══════════════════════════════════════════════════════════════════════════
    -- SEED 2 : ASSESSMENT_TEMPLATES
    -- ══════════════════════════════════════════════════════════════════════════

    -- ── PRÉSCOLAIRE : PS, MS, GS ──────────────────────────────────────────────
    IF v_lvl_ps IS NOT NULL THEN
        INSERT INTO assessment_templates (id, school_id, code, name, description, assessment_type_id, level_id, version, effective_from)
        VALUES (v_tpl_ps_pre, v_school_id, 'PS_PRESCHOOL_V1', 'PS — Évaluation Préscolaire (v1)',
                'Bilan de développement par domaines de compétences. Appréciation qualitative.',
                v_type_pre, v_lvl_ps, 1, '2024-09-01')
        ON CONFLICT (school_id, code) DO NOTHING;
    END IF;

    IF v_lvl_ms IS NOT NULL THEN
        INSERT INTO assessment_templates (id, school_id, code, name, description, assessment_type_id, level_id, version, effective_from)
        VALUES (v_tpl_ms_pre, v_school_id, 'MS_PRESCHOOL_V1', 'MS — Évaluation Préscolaire (v1)',
                'Bilan de développement par domaines de compétences. Appréciation qualitative.',
                v_type_pre, v_lvl_ms, 1, '2024-09-01')
        ON CONFLICT (school_id, code) DO NOTHING;
    END IF;

    IF v_lvl_gs IS NOT NULL THEN
        INSERT INTO assessment_templates (id, school_id, code, name, description, assessment_type_id, level_id, version, effective_from)
        VALUES (v_tpl_gs_pre, v_school_id, 'GS_PRESCHOOL_V1', 'GS — Évaluation Préscolaire (v1)',
                'Bilan de développement par domaines de compétences. Appréciation qualitative.',
                v_type_pre, v_lvl_gs, 1, '2024-09-01')
        ON CONFLICT (school_id, code) DO NOTHING;
    END IF;

    -- ── CP1 ───────────────────────────────────────────────────────────────────
    IF v_lvl_cp1 IS NOT NULL THEN
        INSERT INTO assessment_templates (id, school_id, code, name, description, assessment_type_id, level_id, version, effective_from)
        VALUES
            (v_tpl_cp1_mo, v_school_id, 'CP1_MONTHLY_V1', 'CP1 — Composition Mensuelle (v1)',
             '9 matières /10. Moyenne = SUM/9. Résultat exprimé sur 10.',
             v_type_monthly, v_lvl_cp1, 1, '2024-09-01'),
            (v_tpl_cp1_iep, v_school_id, 'CP1_IEP_V1', 'CP1 — Composition IEP (v1)',
             '8 matières /10 (sans Copie). Moyenne = SUM/8. Résultat exprimé sur 10.',
             v_type_iep, v_lvl_cp1, 1, '2024-09-01')
        ON CONFLICT (school_id, code) DO NOTHING;
    END IF;

    -- ── CP2 ───────────────────────────────────────────────────────────────────
    IF v_lvl_cp2 IS NOT NULL THEN
        INSERT INTO assessment_templates (id, school_id, code, name, description, assessment_type_id, level_id, version, effective_from)
        VALUES
            (v_tpl_cp2_mo, v_school_id, 'CP2_MONTHLY_V1', 'CP2 — Composition Mensuelle (v1)',
             '9 matières /10. Moyenne = SUM/9. Résultat exprimé sur 10.',
             v_type_monthly, v_lvl_cp2, 1, '2024-09-01'),
            (v_tpl_cp2_iep, v_school_id, 'CP2_IEP_V1', 'CP2 — Composition IEP (v1)',
             '8 matières /10 (sans Copie). Moyenne = SUM/8. Résultat exprimé sur 10.',
             v_type_iep, v_lvl_cp2, 1, '2024-09-01')
        ON CONFLICT (school_id, code) DO NOTHING;
    END IF;

    -- ── CE1 ───────────────────────────────────────────────────────────────────
    IF v_lvl_ce1 IS NOT NULL THEN
        INSERT INTO assessment_templates (id, school_id, code, name, description, assessment_type_id, level_id, version, effective_from)
        VALUES
            (v_tpl_ce1_mo, v_school_id, 'CE1_MONTHLY_V1', 'CE1 — Composition Mensuelle (v1)',
             '10 matières /10 (dont Étude du milieu). Moyenne = SUM/10.',
             v_type_monthly, v_lvl_ce1, 1, '2024-09-01'),
            (v_tpl_ce1_iep, v_school_id, 'CE1_IEP_V1', 'CE1 — Composition IEP (v1)',
             '10 matières /10 (dont Étude du milieu). Moyenne = SUM/10.',
             v_type_iep, v_lvl_ce1, 1, '2024-09-01')
        ON CONFLICT (school_id, code) DO NOTHING;
    END IF;

    -- ── CE2 ───────────────────────────────────────────────────────────────────
    IF v_lvl_ce2 IS NOT NULL THEN
        INSERT INTO assessment_templates (id, school_id, code, name, description, assessment_type_id, level_id, version, effective_from)
        VALUES
            (v_tpl_ce2_mo, v_school_id, 'CE2_MONTHLY_V1', 'CE2 — Composition Mensuelle (v1)',
             '10 matières /10 (dont Étude du milieu). Moyenne = SUM/10.',
             v_type_monthly, v_lvl_ce2, 1, '2024-09-01'),
            (v_tpl_ce2_iep, v_school_id, 'CE2_IEP_V1', 'CE2 — Composition IEP (v1)',
             '10 matières /10 (dont Étude du milieu). Moyenne = SUM/10.',
             v_type_iep, v_lvl_ce2, 1, '2024-09-01')
        ON CONFLICT (school_id, code) DO NOTHING;
    END IF;

    -- ── CM1 ───────────────────────────────────────────────────────────────────
    IF v_lvl_cm1 IS NOT NULL THEN
        INSERT INTO assessment_templates (id, school_id, code, name, description, assessment_type_id, level_id, version, effective_from)
        VALUES
            (v_tpl_cm1_mo, v_school_id, 'CM1_MONTHLY_V1', 'CM1 — Composition Mensuelle (v1)',
             '15 matières /10. Lecture(×2) et Maths(×2). Max pondéré = 170. Moyenne = (SUM/170)×20.',
             v_type_monthly, v_lvl_cm1, 1, '2024-09-01'),
            (v_tpl_cm1_iep, v_school_id, 'CM1_IEP_V1', 'CM1 — Composition IEP (v1)',
             '15 matières /10. Lecture(×2) et Maths(×2). Max pondéré = 170. Moyenne = (SUM/170)×20.',
             v_type_iep, v_lvl_cm1, 1, '2024-09-01')
        ON CONFLICT (school_id, code) DO NOTHING;
    END IF;

    -- ── CM2 ───────────────────────────────────────────────────────────────────
    IF v_lvl_cm2 IS NOT NULL THEN
        INSERT INTO assessment_templates (id, school_id, code, name, description, assessment_type_id, level_id, version, effective_from)
        VALUES
            (v_tpl_cm2_iep, v_school_id, 'CM2_IEP_V1', 'CM2 — Composition IEP (v1)',
             '15 matières /10. Lecture(×2), Maths(×2) et Orthographe(×2). Max = 180. Moyenne = (SUM/180)×20.',
             v_type_iep, v_lvl_cm2, 1, '2024-09-01'),
            (v_tpl_cm2_mock, v_school_id, 'CM2_MOCK_EXAM_V1', 'CM2 — Examen Blanc CEPE (v1)',
             'Simulation officielle du CEPE. 15 matières /10. Même barème que l''IEP CM2. Moyenne = (SUM/180)×20.',
             v_type_mock, v_lvl_cm2, 1, '2024-09-01')
        ON CONFLICT (school_id, code) DO NOTHING;
    END IF;

    -- ══════════════════════════════════════════════════════════════════════════
    -- SEED 3 : ASSESSMENT_TEMPLATE_SUBJECTS (Matières par Modèle)
    -- ══════════════════════════════════════════════════════════════════════════
    --
    -- Structure MENA Côte d'Ivoire :
    --
    -- PRÉSCOLAIRE (PS/MS/GS) — 6 domaines, APPRECIATION
    --   Graphisme, Lecture/Pré-lecture, Langage, Mathématiques, AEM, AEC
    --
    -- CP1/CP2 MENSUELLE — 9 matières /10 (coeff=1)
    --   Lecture, Écriture, Copie, Orthographe, Expression écrite,
    --   Mathématiques, Chant-Récitation, Dessin, ECM
    --
    -- CP1/CP2 IEP — 8 matières /10 (sans Copie)
    --   Lecture, Écriture, Orthographe, Expression écrite,
    --   Mathématiques, Chant-Récitation, Dessin, ECM
    --
    -- CE1/CE2 MENSUELLE & IEP — 10 matières /10
    --   Lecture, Écriture, Copie, Orthographe, Expression écrite,
    --   Mathématiques, Étude de texte, Étude du milieu (composée : HIST+GEO+SCI),
    --   Dessin, ECM
    --
    -- CM1 MENSUELLE & IEP — 15 matières /10 avec coefficients
    --   Lecture(×2), Écriture, Copie, Orthographe, Expression écrite,
    --   Mathématiques(×2), Étude de texte, Histoire, Géographie, Sciences,
    --   Chant-Récitation, Dessin, ECM, Anglais
    --   MAX pondéré = (2+1+1+1+1+2+1+1+1+1+1+1+1+1) × 10 = 17 × 10 = 170
    --
    -- CM2 IEP & MOCK_EXAM — 15 matières /10 avec coefficients
    --   Lecture(×2), Écriture, Copie, Orthographe(×2), Expression écrite,
    --   Mathématiques(×2), Étude de texte, Histoire, Géographie, Sciences,
    --   Chant-Récitation, Dessin, ECM, Anglais
    --   MAX pondéré = (2+1+1+2+1+2+1+1+1+1+1+1+1+1) × 10 = 18 × 10 = 180
    --

    -- ── PRÉSCOLAIRE (PS / MS / GS) ────────────────────────────────────────────
    -- Insérer pour chaque template préscolaire les 6 domaines en APPRECIATION
    INSERT INTO assessment_template_subjects
        (template_id, subject_id, display_order, maximum_score, coefficient, assessment_mode, is_required)
    SELECT t.id,
           unnest(ARRAY[v_s_graphisme, v_s_lect_ps, v_s_langage, v_s_math_ps, v_s_aem, v_s_aec]),
           generate_series(1, 6),
           10, 1.0, 'APPRECIATION', TRUE
    FROM assessment_templates t
    WHERE t.id IN (v_tpl_ps_pre, v_tpl_ms_pre, v_tpl_gs_pre)
      AND EXISTS (SELECT 1 FROM subjects s WHERE s.id = v_s_graphisme)
    ON CONFLICT (template_id, subject_id) DO NOTHING;

    -- ── CP1 MENSUELLE — 9 matières /10, coeff=1 ──────────────────────────────
    IF v_tpl_cp1_mo IS NOT NULL AND v_s_lecture IS NOT NULL THEN
        INSERT INTO assessment_template_subjects
            (template_id, subject_id, display_order, maximum_score, coefficient, assessment_mode, is_required)
        VALUES
            (v_tpl_cp1_mo, v_s_lecture,   1, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_cp1_mo, v_s_ecriture,  2, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_cp1_mo, v_s_copie,     3, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_cp1_mo, v_s_ortho,     4, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_cp1_mo, v_s_expr,      5, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_cp1_mo, v_s_math_pri,  6, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_cp1_mo, v_s_chant,     7, 10, 1.0, 'GRADE', FALSE),
            (v_tpl_cp1_mo, v_s_dessin,    8, 10, 1.0, 'GRADE', FALSE),
            (v_tpl_cp1_mo, v_s_ecm,       9, 10, 1.0, 'GRADE', TRUE)
        ON CONFLICT (template_id, subject_id) DO NOTHING;
    END IF;

    -- ── CP2 MENSUELLE — identique CP1 ─────────────────────────────────────────
    IF v_tpl_cp2_mo IS NOT NULL AND v_s_lecture IS NOT NULL THEN
        INSERT INTO assessment_template_subjects
            (template_id, subject_id, display_order, maximum_score, coefficient, assessment_mode, is_required)
        VALUES
            (v_tpl_cp2_mo, v_s_lecture,   1, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_cp2_mo, v_s_ecriture,  2, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_cp2_mo, v_s_copie,     3, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_cp2_mo, v_s_ortho,     4, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_cp2_mo, v_s_expr,      5, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_cp2_mo, v_s_math_pri,  6, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_cp2_mo, v_s_chant,     7, 10, 1.0, 'GRADE', FALSE),
            (v_tpl_cp2_mo, v_s_dessin,    8, 10, 1.0, 'GRADE', FALSE),
            (v_tpl_cp2_mo, v_s_ecm,       9, 10, 1.0, 'GRADE', TRUE)
        ON CONFLICT (template_id, subject_id) DO NOTHING;
    END IF;

    -- ── CP1 IEP — 8 matières /10, sans Copie ─────────────────────────────────
    IF v_tpl_cp1_iep IS NOT NULL AND v_s_lecture IS NOT NULL THEN
        INSERT INTO assessment_template_subjects
            (template_id, subject_id, display_order, maximum_score, coefficient, assessment_mode, is_required)
        VALUES
            (v_tpl_cp1_iep, v_s_lecture,   1, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_cp1_iep, v_s_ecriture,  2, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_cp1_iep, v_s_ortho,     3, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_cp1_iep, v_s_expr,      4, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_cp1_iep, v_s_math_pri,  5, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_cp1_iep, v_s_chant,     6, 10, 1.0, 'GRADE', FALSE),
            (v_tpl_cp1_iep, v_s_dessin,    7, 10, 1.0, 'GRADE', FALSE),
            (v_tpl_cp1_iep, v_s_ecm,       8, 10, 1.0, 'GRADE', TRUE)
        ON CONFLICT (template_id, subject_id) DO NOTHING;
    END IF;

    -- ── CP2 IEP — identique CP1 IEP ───────────────────────────────────────────
    IF v_tpl_cp2_iep IS NOT NULL AND v_s_lecture IS NOT NULL THEN
        INSERT INTO assessment_template_subjects
            (template_id, subject_id, display_order, maximum_score, coefficient, assessment_mode, is_required)
        VALUES
            (v_tpl_cp2_iep, v_s_lecture,   1, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_cp2_iep, v_s_ecriture,  2, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_cp2_iep, v_s_ortho,     3, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_cp2_iep, v_s_expr,      4, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_cp2_iep, v_s_math_pri,  5, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_cp2_iep, v_s_chant,     6, 10, 1.0, 'GRADE', FALSE),
            (v_tpl_cp2_iep, v_s_dessin,    7, 10, 1.0, 'GRADE', FALSE),
            (v_tpl_cp2_iep, v_s_ecm,       8, 10, 1.0, 'GRADE', TRUE)
        ON CONFLICT (template_id, subject_id) DO NOTHING;
    END IF;

    -- ── CE1 MENSUELLE — 10 matières /10, dont EDM composée ───────────────────
    IF v_tpl_ce1_mo IS NOT NULL AND v_s_lecture IS NOT NULL THEN
        INSERT INTO assessment_template_subjects
            (template_id, subject_id, display_order, maximum_score, coefficient, assessment_mode, is_required)
        VALUES
            (v_tpl_ce1_mo, v_s_lecture,   1, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_ce1_mo, v_s_ecriture,  2, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_ce1_mo, v_s_copie,     3, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_ce1_mo, v_s_ortho,     4, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_ce1_mo, v_s_expr,      5, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_ce1_mo, v_s_math_pri,  6, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_ce1_mo, v_s_edt,       7, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_ce1_mo, v_s_edm,       8, 10, 1.0, 'GRADE', TRUE),  -- EDM = composée (HIST+GEO+SCI)
            (v_tpl_ce1_mo, v_s_dessin,    9, 10, 1.0, 'GRADE', FALSE),
            (v_tpl_ce1_mo, v_s_ecm,      10, 10, 1.0, 'GRADE', TRUE)
        ON CONFLICT (template_id, subject_id) DO NOTHING;
    END IF;

    -- ── CE1 IEP — identique CE1 Mensuelle ────────────────────────────────────
    IF v_tpl_ce1_iep IS NOT NULL AND v_s_lecture IS NOT NULL THEN
        INSERT INTO assessment_template_subjects
            (template_id, subject_id, display_order, maximum_score, coefficient, assessment_mode, is_required)
        VALUES
            (v_tpl_ce1_iep, v_s_lecture,   1, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_ce1_iep, v_s_ecriture,  2, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_ce1_iep, v_s_copie,     3, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_ce1_iep, v_s_ortho,     4, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_ce1_iep, v_s_expr,      5, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_ce1_iep, v_s_math_pri,  6, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_ce1_iep, v_s_edt,       7, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_ce1_iep, v_s_edm,       8, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_ce1_iep, v_s_dessin,    9, 10, 1.0, 'GRADE', FALSE),
            (v_tpl_ce1_iep, v_s_ecm,      10, 10, 1.0, 'GRADE', TRUE)
        ON CONFLICT (template_id, subject_id) DO NOTHING;
    END IF;

    -- ── CE2 MENSUELLE & IEP — identique CE1 ──────────────────────────────────
    IF v_tpl_ce2_mo IS NOT NULL AND v_s_lecture IS NOT NULL THEN
        INSERT INTO assessment_template_subjects
            (template_id, subject_id, display_order, maximum_score, coefficient, assessment_mode, is_required)
        VALUES
            (v_tpl_ce2_mo, v_s_lecture,   1, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_ce2_mo, v_s_ecriture,  2, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_ce2_mo, v_s_copie,     3, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_ce2_mo, v_s_ortho,     4, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_ce2_mo, v_s_expr,      5, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_ce2_mo, v_s_math_pri,  6, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_ce2_mo, v_s_edt,       7, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_ce2_mo, v_s_edm,       8, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_ce2_mo, v_s_dessin,    9, 10, 1.0, 'GRADE', FALSE),
            (v_tpl_ce2_mo, v_s_ecm,      10, 10, 1.0, 'GRADE', TRUE)
        ON CONFLICT (template_id, subject_id) DO NOTHING;
    END IF;

    IF v_tpl_ce2_iep IS NOT NULL AND v_s_lecture IS NOT NULL THEN
        INSERT INTO assessment_template_subjects
            (template_id, subject_id, display_order, maximum_score, coefficient, assessment_mode, is_required)
        VALUES
            (v_tpl_ce2_iep, v_s_lecture,   1, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_ce2_iep, v_s_ecriture,  2, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_ce2_iep, v_s_copie,     3, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_ce2_iep, v_s_ortho,     4, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_ce2_iep, v_s_expr,      5, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_ce2_iep, v_s_math_pri,  6, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_ce2_iep, v_s_edt,       7, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_ce2_iep, v_s_edm,       8, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_ce2_iep, v_s_dessin,    9, 10, 1.0, 'GRADE', FALSE),
            (v_tpl_ce2_iep, v_s_ecm,      10, 10, 1.0, 'GRADE', TRUE)
        ON CONFLICT (template_id, subject_id) DO NOTHING;
    END IF;

    -- ── CM1 MENSUELLE — 15 matières, Lecture(×2), Maths(×2) → max=170 ────────
    -- Détail sous-matières EDM : Histoire, Géographie, Sciences (3 lignes séparées)
    IF v_tpl_cm1_mo IS NOT NULL AND v_s_lecture IS NOT NULL THEN
        INSERT INTO assessment_template_subjects
            (template_id, subject_id, display_order, maximum_score, coefficient, assessment_mode, is_required)
        VALUES
            (v_tpl_cm1_mo, v_s_lecture,   1, 10, 2.0, 'GRADE', TRUE),  -- ×2 → 20 max
            (v_tpl_cm1_mo, v_s_ecriture,  2, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_cm1_mo, v_s_copie,     3, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_cm1_mo, v_s_ortho,     4, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_cm1_mo, v_s_expr,      5, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_cm1_mo, v_s_math_pri,  6, 10, 2.0, 'GRADE', TRUE),  -- ×2 → 20 max
            (v_tpl_cm1_mo, v_s_edt,       7, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_cm1_mo, v_s_histoire,  8, 10, 1.0, 'GRADE', TRUE),  -- EDM décomposé
            (v_tpl_cm1_mo, v_s_geo,       9, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_cm1_mo, v_s_sciences, 10, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_cm1_mo, v_s_chant,    11, 10, 1.0, 'GRADE', FALSE),
            (v_tpl_cm1_mo, v_s_dessin,   12, 10, 1.0, 'GRADE', FALSE),
            (v_tpl_cm1_mo, v_s_ecm,      13, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_cm1_mo, v_s_anglais,  14, 10, 1.0, 'GRADE', FALSE),
            (v_tpl_cm1_mo, v_s_info,     15, 10, 1.0, 'GRADE', FALSE)
        ON CONFLICT (template_id, subject_id) DO NOTHING;
    END IF;

    -- ── CM1 IEP — identique CM1 Mensuelle ────────────────────────────────────
    IF v_tpl_cm1_iep IS NOT NULL AND v_s_lecture IS NOT NULL THEN
        INSERT INTO assessment_template_subjects
            (template_id, subject_id, display_order, maximum_score, coefficient, assessment_mode, is_required)
        VALUES
            (v_tpl_cm1_iep, v_s_lecture,   1, 10, 2.0, 'GRADE', TRUE),
            (v_tpl_cm1_iep, v_s_ecriture,  2, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_cm1_iep, v_s_copie,     3, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_cm1_iep, v_s_ortho,     4, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_cm1_iep, v_s_expr,      5, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_cm1_iep, v_s_math_pri,  6, 10, 2.0, 'GRADE', TRUE),
            (v_tpl_cm1_iep, v_s_edt,       7, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_cm1_iep, v_s_histoire,  8, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_cm1_iep, v_s_geo,       9, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_cm1_iep, v_s_sciences, 10, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_cm1_iep, v_s_chant,    11, 10, 1.0, 'GRADE', FALSE),
            (v_tpl_cm1_iep, v_s_dessin,   12, 10, 1.0, 'GRADE', FALSE),
            (v_tpl_cm1_iep, v_s_ecm,      13, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_cm1_iep, v_s_anglais,  14, 10, 1.0, 'GRADE', FALSE),
            (v_tpl_cm1_iep, v_s_info,     15, 10, 1.0, 'GRADE', FALSE)
        ON CONFLICT (template_id, subject_id) DO NOTHING;
    END IF;

    -- ── CM2 IEP — 15 matières, Lecture(×2) + Ortho(×2) + Maths(×2) → max=180 ─
    IF v_tpl_cm2_iep IS NOT NULL AND v_s_lecture IS NOT NULL THEN
        INSERT INTO assessment_template_subjects
            (template_id, subject_id, display_order, maximum_score, coefficient, assessment_mode, is_required)
        VALUES
            (v_tpl_cm2_iep, v_s_lecture,   1, 10, 2.0, 'GRADE', TRUE),  -- ×2
            (v_tpl_cm2_iep, v_s_ecriture,  2, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_cm2_iep, v_s_copie,     3, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_cm2_iep, v_s_ortho,     4, 10, 2.0, 'GRADE', TRUE),  -- ×2
            (v_tpl_cm2_iep, v_s_expr,      5, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_cm2_iep, v_s_math_pri,  6, 10, 2.0, 'GRADE', TRUE),  -- ×2
            (v_tpl_cm2_iep, v_s_edt,       7, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_cm2_iep, v_s_histoire,  8, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_cm2_iep, v_s_geo,       9, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_cm2_iep, v_s_sciences, 10, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_cm2_iep, v_s_chant,    11, 10, 1.0, 'GRADE', FALSE),
            (v_tpl_cm2_iep, v_s_dessin,   12, 10, 1.0, 'GRADE', FALSE),
            (v_tpl_cm2_iep, v_s_ecm,      13, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_cm2_iep, v_s_anglais,  14, 10, 1.0, 'GRADE', FALSE),
            (v_tpl_cm2_iep, v_s_info,     15, 10, 1.0, 'GRADE', FALSE)
        ON CONFLICT (template_id, subject_id) DO NOTHING;
    END IF;

    -- ── CM2 EXAMEN BLANC — identique CM2 IEP ─────────────────────────────────
    IF v_tpl_cm2_mock IS NOT NULL AND v_s_lecture IS NOT NULL THEN
        INSERT INTO assessment_template_subjects
            (template_id, subject_id, display_order, maximum_score, coefficient, assessment_mode, is_required)
        VALUES
            (v_tpl_cm2_mock, v_s_lecture,   1, 10, 2.0, 'GRADE', TRUE),
            (v_tpl_cm2_mock, v_s_ecriture,  2, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_cm2_mock, v_s_copie,     3, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_cm2_mock, v_s_ortho,     4, 10, 2.0, 'GRADE', TRUE),
            (v_tpl_cm2_mock, v_s_expr,      5, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_cm2_mock, v_s_math_pri,  6, 10, 2.0, 'GRADE', TRUE),
            (v_tpl_cm2_mock, v_s_edt,       7, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_cm2_mock, v_s_histoire,  8, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_cm2_mock, v_s_geo,       9, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_cm2_mock, v_s_sciences, 10, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_cm2_mock, v_s_chant,    11, 10, 1.0, 'GRADE', FALSE),
            (v_tpl_cm2_mock, v_s_dessin,   12, 10, 1.0, 'GRADE', FALSE),
            (v_tpl_cm2_mock, v_s_ecm,      13, 10, 1.0, 'GRADE', TRUE),
            (v_tpl_cm2_mock, v_s_anglais,  14, 10, 1.0, 'GRADE', FALSE),
            (v_tpl_cm2_mock, v_s_info,     15, 10, 1.0, 'GRADE', FALSE)
        ON CONFLICT (template_id, subject_id) DO NOTHING;
    END IF;

    -- ══════════════════════════════════════════════════════════════════════════
    -- SEED 4 : TEMPLATE_FORMULAS (Association Modèles ↔ Formules)
    -- ══════════════════════════════════════════════════════════════════════════

    -- Préscolaire → APPRECIATION_ENGINE
    INSERT INTO template_formulas (template_id, formula_id)
    SELECT t.id, v_f_appre
    FROM assessment_templates t
    WHERE t.id IN (v_tpl_ps_pre, v_tpl_ms_pre, v_tpl_gs_pre)
    ON CONFLICT (template_id, formula_id) DO NOTHING;

    -- CP1/CP2 Mensuelle → SUM_OVER_9
    INSERT INTO template_formulas (template_id, formula_id)
    SELECT t.id, v_f_sum9
    FROM assessment_templates t
    WHERE t.id IN (v_tpl_cp1_mo, v_tpl_cp2_mo)
    ON CONFLICT (template_id, formula_id) DO NOTHING;

    -- CP1/CP2 IEP → SUM_OVER_8
    INSERT INTO template_formulas (template_id, formula_id)
    SELECT t.id, v_f_sum8
    FROM assessment_templates t
    WHERE t.id IN (v_tpl_cp1_iep, v_tpl_cp2_iep)
    ON CONFLICT (template_id, formula_id) DO NOTHING;

    -- CE1/CE2 Mensuelle & IEP → SUM_OVER_10
    INSERT INTO template_formulas (template_id, formula_id)
    SELECT t.id, v_f_sum10
    FROM assessment_templates t
    WHERE t.id IN (v_tpl_ce1_mo, v_tpl_ce1_iep, v_tpl_ce2_mo, v_tpl_ce2_iep)
    ON CONFLICT (template_id, formula_id) DO NOTHING;

    -- CM1 Mensuelle & IEP → WEIGHTED_OVER_170
    INSERT INTO template_formulas (template_id, formula_id)
    SELECT t.id, v_f_w170
    FROM assessment_templates t
    WHERE t.id IN (v_tpl_cm1_mo, v_tpl_cm1_iep)
    ON CONFLICT (template_id, formula_id) DO NOTHING;

    -- CM2 IEP & Examen Blanc → WEIGHTED_OVER_180
    INSERT INTO template_formulas (template_id, formula_id)
    SELECT t.id, v_f_w180
    FROM assessment_templates t
    WHERE t.id IN (v_tpl_cm2_iep, v_tpl_cm2_mock)
    ON CONFLICT (template_id, formula_id) DO NOTHING;

END $$;
