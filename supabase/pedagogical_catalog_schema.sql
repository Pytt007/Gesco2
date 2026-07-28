-- =============================================================================
-- GESCO — MODULE : CATALOGUE PÉDAGOGIQUE (MATIÈRES, DOMAINES & COMPÉTENCES)
-- (PostgreSQL / Supabase - Moteur Académique / Référentiel Pédagogique)
-- =============================================================================
-- Script DDL Idempotent : Tables, Contraintes, Index, Politiques RLS & Seed Initial
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. TABLE : SUBJECT_CATEGORIES (CATÉGORIES & DOMAINES DE MATIÈRES)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS subject_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES schools(id) ON DELETE RESTRICT,
    code VARCHAR(50) NOT NULL,                           -- Ex: 'MAIN', 'COMPLEMENTARY', 'PRESCHOOL_DOMAIN'
    name VARCHAR(100) NOT NULL,                         -- Ex: 'Principale', 'Complémentaire', 'Domaine Préscolaire'
    description TEXT,
    sort_order INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    -- Audit & Soft Delete
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_subject_categories_code UNIQUE (school_id, code)
);

-- -----------------------------------------------------------------------------
-- 2. TABLE : SUBJECTS (CATALOGUE GÉNÉRAL DES MATIÈRES)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES schools(id) ON DELETE RESTRICT,
    category_id UUID NOT NULL REFERENCES subject_categories(id) ON DELETE RESTRICT,
    code VARCHAR(50) NOT NULL,                           -- Ex: 'MATH', 'FR_READING', 'ENV_STUDY'
    name VARCHAR(150) NOT NULL,                         -- Ex: 'Mathématiques', 'Lecture', 'Étude du milieu'
    short_name VARCHAR(50),                             -- Ex: 'MATH', 'LECT', 'EDM'
    description TEXT,
    is_composite BOOLEAN NOT NULL DEFAULT FALSE,        -- Vrai pour les matières fusionnées/composées
    is_graded BOOLEAN NOT NULL DEFAULT TRUE,           -- Faux pour matières complémentaires non notées
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 1,

    -- Audit & Soft Delete
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_subjects_code UNIQUE (school_id, code)
);

-- -----------------------------------------------------------------------------
-- 3. TABLE : SUBJECT_COMPONENTS (SOUS-MATIÈRES DES MATIÈRES COMPOSÉES)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS subject_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    child_subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    sort_order INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_subject_components_no_self_ref CHECK (parent_subject_id != child_subject_id),
    CONSTRAINT uq_subject_components_parent_child UNIQUE (parent_subject_id, child_subject_id)
);

-- -----------------------------------------------------------------------------
-- 4. TABLE : LEVEL_SUBJECTS (AFFECTATION DES MATIÈRES AUX NIVEAUX SCOLAIRES)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS level_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES schools(id) ON DELETE RESTRICT,
    level_id UUID NOT NULL REFERENCES school_levels(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 1,

    -- Audit & Soft Delete
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Unicité partielle : une seule association active matière/niveau par établissement
CREATE UNIQUE INDEX IF NOT EXISTS uq_level_subject_active
    ON level_subjects(level_id, subject_id)
    WHERE is_deleted = FALSE;

-- =============================================================================
-- INDEX DE PERFORMANCE (OPTIMISATION DES RECHERCHES ET JOINTURES)
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_subjects_category ON subjects(category_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_subjects_school ON subjects(school_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_level_subjects_level ON level_subjects(level_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_level_subjects_subject ON level_subjects(subject_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_subject_components_parent ON subject_components(parent_subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_components_child ON subject_components(child_subject_id);

-- =============================================================================
-- POLITIQUES DE SÉCURITÉ RLS (ROW LEVEL SECURITY)
-- =============================================================================

ALTER TABLE subject_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE level_subjects ENABLE ROW LEVEL SECURITY;

-- 1. Policies SELECT (Authentifiés)
CREATE POLICY "Allow read access to subject_categories" ON subject_categories
    FOR SELECT TO authenticated USING (is_deleted = FALSE);

CREATE POLICY "Allow read access to subjects" ON subjects
    FOR SELECT TO authenticated USING (is_deleted = FALSE);

CREATE POLICY "Allow read access to subject_components" ON subject_components
    FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Allow read access to level_subjects" ON level_subjects
    FOR SELECT TO authenticated USING (is_deleted = FALSE);

-- 2. Policies WRITE (Admin & Enseignants)
CREATE POLICY "Allow write access to subject_categories" ON subject_categories
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.role IN ('ADMIN_GENERALE', 'SCOLAIRE_ENSEIGNANT')
        )
    );

CREATE POLICY "Allow write access to subjects" ON subjects
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.role IN ('ADMIN_GENERALE', 'SCOLAIRE_ENSEIGNANT')
        )
    );

CREATE POLICY "Allow write access to subject_components" ON subject_components
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.role IN ('ADMIN_GENERALE', 'SCOLAIRE_ENSEIGNANT')
        )
    );

CREATE POLICY "Allow write access to level_subjects" ON level_subjects
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.role IN ('ADMIN_GENERALE', 'SCOLAIRE_ENSEIGNANT')
        )
    );

-- =============================================================================
-- SEED DE DONNÉES INITIALES (CATÉGORIES, MATIÈRES PRÉSCOLAIRE & PRIMAIRE)
-- =============================================================================

DO $$
DECLARE
    v_school_id UUID;

    -- Category IDs
    v_cat_main UUID := '11111111-1111-4111-a111-111111111111';
    v_cat_comp UUID := '22222222-2222-4222-a222-222222222222';
    v_cat_preschool UUID := '33333333-3333-4333-a333-333333333333';

    -- Subject IDs Préscolaire
    v_sub_graphisme UUID := 'a0100000-0000-4000-a000-000000000001';
    v_sub_lecture_ps UUID := 'a0100000-0000-4000-a000-000000000002';
    v_sub_langage UUID := 'a0100000-0000-4000-a000-000000000003';
    v_sub_math_ps UUID := 'a0100000-0000-4000-a000-000000000004';
    v_sub_aem UUID := 'a0100000-0000-4000-a000-000000000005';
    v_sub_aec UUID := 'a0100000-0000-4000-a000-000000000006';

    -- Subject IDs Primaire
    v_sub_lecture UUID := 'b0200000-0000-4000-b000-000000000001';
    v_sub_ecriture UUID := 'b0200000-0000-4000-b000-000000000002';
    v_sub_copie UUID := 'b0200000-0000-4000-b000-000000000003';
    v_sub_orthographe UUID := 'b0200000-0000-4000-b000-000000000004';
    v_sub_expression UUID := 'b0200000-0000-4000-b000-000000000005';
    v_sub_math_pri UUID := 'b0200000-0000-4000-b000-000000000006';
    v_sub_etude_texte UUID := 'b0200000-0000-4000-b000-000000000007';

    -- Composite Subject (Étude du milieu) & Child Subjects
    v_sub_etude_milieu UUID := 'b0200000-0000-4000-b000-000000000008';
    v_sub_histoire UUID := 'c0300000-0000-4000-c000-000000000001';
    v_sub_geographie UUID := 'c0300000-0000-4000-c000-000000000002';
    v_sub_sciences UUID := 'c0300000-0000-4000-c000-000000000003';

    -- Matières Complémentaires / Éveil
    v_sub_chant UUID := 'b0200000-0000-4000-b000-000000000009';
    v_sub_dessin UUID := 'b0200000-0000-4000-b000-000000000010';
    v_sub_ecm UUID := 'b0200000-0000-4000-b000-000000000011';
    v_sub_anglais UUID := 'b0200000-0000-4000-b000-000000000012';
    v_sub_informatique UUID := 'b0200000-0000-4000-b000-000000000013';

    -- Level IDs
    r_level RECORD;
BEGIN
    SELECT id INTO v_school_id FROM schools LIMIT 1;
    IF v_school_id IS NULL THEN
        v_school_id := '00000000-0000-0000-0000-000000000001';
    END IF;

    -- 1. SEED CATÉGORIES
    INSERT INTO subject_categories (id, school_id, code, name, description, sort_order)
    VALUES
        (v_cat_main, v_school_id, 'MAIN', 'Principale', 'Matières principales fondamentales', 1),
        (v_cat_comp, v_school_id, 'COMPLEMENTARY', 'Complémentaire', 'Matières d''éveil et activités artistiques/sportives', 2),
        (v_cat_preschool, v_school_id, 'PRESCHOOL_DOMAIN', 'Domaine Préscolaire', 'Domaines d''activités du préscolaire', 3)
    ON CONFLICT (school_id, code) DO UPDATE SET name = EXCLUDED.name;

    -- 2. SEED MATIÈRES PRÉSCOLAIRE
    INSERT INTO subjects (id, school_id, category_id, code, name, short_name, is_composite, is_graded, sort_order)
    VALUES
        (v_sub_graphisme, v_school_id, v_cat_preschool, 'PRE_GRAPH', 'Graphisme', 'GRAPH', FALSE, TRUE, 1),
        (v_sub_lecture_ps, v_school_id, v_cat_preschool, 'PRE_LECT', 'Lecture / Pré-lecture', 'LECT_PS', FALSE, TRUE, 2),
        (v_sub_langage, v_school_id, v_cat_preschool, 'PRE_LANG', 'Langage & Communication', 'LANG', FALSE, TRUE, 3),
        (v_sub_math_ps, v_school_id, v_cat_preschool, 'PRE_MATH', 'Mathématiques Préscolaire', 'MATH_PS', FALSE, TRUE, 4),
        (v_sub_aem, v_school_id, v_cat_preschool, 'PRE_AEM', 'Activités d''Éveil et de Manipulation (AEM)', 'AEM', FALSE, TRUE, 5),
        (v_sub_aec, v_school_id, v_cat_preschool, 'PRE_AEC', 'Activités d''Éveil et de Création (AEC)', 'AEC', FALSE, TRUE, 6)
    ON CONFLICT (school_id, code) DO UPDATE SET name = EXCLUDED.name;

    -- 3. SEED MATIÈRES PRIMAIRE
    INSERT INTO subjects (id, school_id, category_id, code, name, short_name, is_composite, is_graded, sort_order)
    VALUES
        (v_sub_lecture, v_school_id, v_cat_main, 'PRI_LECT', 'Lecture', 'LECT', FALSE, TRUE, 10),
        (v_sub_ecriture, v_school_id, v_cat_main, 'PRI_ECRIT', 'Écriture', 'ECRIT', FALSE, TRUE, 11),
        (v_sub_copie, v_school_id, v_cat_main, 'PRI_COPIE', 'Copie', 'COPIE', FALSE, TRUE, 12),
        (v_sub_orthographe, v_school_id, v_cat_main, 'PRI_ORTHO', 'Orthographe / Dictée', 'ORTHO', FALSE, TRUE, 13),
        (v_sub_expression, v_school_id, v_cat_main, 'PRI_EXPR', 'Expression écrite', 'EXPR', FALSE, TRUE, 14),
        (v_sub_math_pri, v_school_id, v_cat_main, 'PRI_MATH', 'Mathématiques', 'MATH', FALSE, TRUE, 15),
        (v_sub_etude_texte, v_school_id, v_cat_main, 'PRI_EDT', 'Étude de texte', 'EDT', FALSE, TRUE, 16),
        (v_sub_etude_milieu, v_school_id, v_cat_main, 'PRI_EDM', 'Étude du milieu', 'EDM', TRUE, TRUE, 17),
        (v_sub_histoire, v_school_id, v_cat_main, 'SUB_HIST', 'Histoire', 'HIST', FALSE, TRUE, 18),
        (v_sub_geographie, v_school_id, v_cat_main, 'SUB_GEO', 'Géographie', 'GEO', FALSE, TRUE, 19),
        (v_sub_sciences, v_school_id, v_cat_main, 'SUB_SCI', 'Sciences & Technologie', 'SCI', FALSE, TRUE, 20),
        (v_sub_chant, v_school_id, v_cat_comp, 'COMP_CHANT', 'Chant & Récitation', 'CHANT', FALSE, TRUE, 21),
        (v_sub_dessin, v_school_id, v_cat_comp, 'COMP_DESSIN', 'Dessin / Arts Visuels', 'DESSIN', FALSE, TRUE, 22),
        (v_sub_ecm, v_school_id, v_cat_comp, 'COMP_ECM', 'Instruction Civique et Morale', 'ECM', FALSE, TRUE, 23),
        (v_sub_anglais, v_school_id, v_cat_comp, 'COMP_ANG', 'Anglais', 'ANG', FALSE, TRUE, 24),
        (v_sub_informatique, v_school_id, v_cat_comp, 'COMP_INFO', 'Informatique', 'INFO', FALSE, FALSE, 25)
    ON CONFLICT (school_id, code) DO UPDATE SET name = EXCLUDED.name;

    -- 4. SEED COMPOSANTS (Étude du milieu ➔ Histoire, Géographie, Sciences)
    INSERT INTO subject_components (parent_subject_id, child_subject_id, sort_order)
    VALUES
        (v_sub_etude_milieu, v_sub_histoire, 1),
        (v_sub_etude_milieu, v_sub_geographie, 2),
        (v_sub_etude_milieu, v_sub_sciences, 3)
    ON CONFLICT (parent_subject_id, child_subject_id) DO NOTHING;

    -- 5. SEED NIVEAUX / MATIÈRES (LEVEL_SUBJECTS)
    -- Associer les matières Préscolaire aux niveaux PS, MS, GS
    FOR r_level IN SELECT id FROM school_levels WHERE code IN ('PS', 'MS', 'GS') LOOP
        INSERT INTO level_subjects (school_id, level_id, subject_id, is_required, sort_order)
        VALUES
            (v_school_id, r_level.id, v_sub_graphisme, TRUE, 1),
            (v_school_id, r_level.id, v_sub_lecture_ps, TRUE, 2),
            (v_school_id, r_level.id, v_sub_langage, TRUE, 3),
            (v_school_id, r_level.id, v_sub_math_ps, TRUE, 4),
            (v_school_id, r_level.id, v_sub_aem, TRUE, 5),
            (v_school_id, r_level.id, v_sub_aec, TRUE, 6)
        ON CONFLICT DO NOTHING;
    END LOOP;

    -- Associer les matières Primaire aux niveaux CP1, CP2, CE1, CE2, CM1, CM2
    FOR r_level IN SELECT id FROM school_levels WHERE code IN ('CP1', 'CP2', 'CE1', 'CE2', 'CM1', 'CM2') LOOP
        INSERT INTO level_subjects (school_id, level_id, subject_id, is_required, sort_order)
        VALUES
            (v_school_id, r_level.id, v_sub_lecture, TRUE, 1),
            (v_school_id, r_level.id, v_sub_ecriture, TRUE, 2),
            (v_school_id, r_level.id, v_sub_copie, TRUE, 3),
            (v_school_id, r_level.id, v_sub_orthographe, TRUE, 4),
            (v_school_id, r_level.id, v_sub_expression, TRUE, 5),
            (v_school_id, r_level.id, v_sub_math_pri, TRUE, 6),
            (v_school_id, r_level.id, v_sub_etude_texte, TRUE, 7),
            (v_school_id, r_level.id, v_sub_etude_milieu, TRUE, 8),
            (v_school_id, r_level.id, v_sub_chant, FALSE, 9),
            (v_school_id, r_level.id, v_sub_dessin, FALSE, 10),
            (v_school_id, r_level.id, v_sub_ecm, TRUE, 11),
            (v_school_id, r_level.id, v_sub_anglais, FALSE, 12),
            (v_school_id, r_level.id, v_sub_informatique, FALSE, 13)
        ON CONFLICT DO NOTHING;
    END LOOP;

END $$;
