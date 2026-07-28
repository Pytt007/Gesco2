-- ============================================================================
-- GESCO - Template Builder Schema
-- Tables: document_blocks, template_blocks
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.document_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'HEADER', 'IDENTITY', 'ACADEMIC', 'SUMMARY', 'VALIDATION', 'SECURITY', 'CUSTOM'
    description TEXT,
    icon VARCHAR(50) NOT NULL DEFAULT 'box',
    is_mandatory BOOLEAN NOT NULL DEFAULT false,
    default_configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.template_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES public.document_templates(id) ON DELETE CASCADE,
    block_id UUID NOT NULL REFERENCES public.document_blocks(id) ON DELETE CASCADE,
    display_order INT NOT NULL DEFAULT 0,
    visible BOOLEAN NOT NULL DEFAULT true,
    configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexation pour accélérer les chargements de maquettes
CREATE INDEX IF NOT EXISTS idx_document_blocks_code ON public.document_blocks(code);
CREATE INDEX IF NOT EXISTS idx_template_blocks_template ON public.template_blocks(template_id, display_order);

-- Insertion automatique des 22 blocs fondamentaux du catalogue GESCO
INSERT INTO public.document_blocks (code, name, category, description, is_mandatory, default_configuration)
VALUES
    ('LOGO', 'Logo Établissement', 'HEADER', 'Emblème ou logo officiel de l’école', false, '{"width":"80px","alignment":"center"}'::jsonb),
    ('HEADER', 'En-tête de Document', 'HEADER', 'Titre principal, ministère, pays et sous-titres', true, '{"fontSize":"18px","color":"#1e3a8a","alignment":"center"}'::jsonb),
    ('SCHOOL_INFORMATION', 'Informations École', 'IDENTITY', 'Coordonnées, adresse, téléphone, code école', true, '{"fontSize":"12px","layout":"grid"}'::jsonb),
    ('STUDENT_INFORMATION', 'Informations Élève', 'IDENTITY', 'Nom, prénom, matricule, classe, date de naissance', true, '{"fontSize":"13px","backgroundColor":"#eff6ff"}'::jsonb),
    ('PARENT_INFORMATION', 'Informations Parents', 'IDENTITY', 'Nom du tuteur, contact d’urgence', false, '{"fontSize":"12px"}'::jsonb),
    ('CLASS_INFORMATION', 'Informations Classe', 'IDENTITY', 'Nom de la classe, effectif, professeur principal', false, '{"fontSize":"12px"}'::jsonb),
    ('ASSESSMENT_INFORMATION', 'Infos Évaluation / Session', 'ACADEMIC', 'Type de composition, trimestre, année scolaire', false, '{"fontSize":"12px"}'::jsonb),
    ('RESULTS_TABLE', 'Tableau des Notes', 'ACADEMIC', 'Grille détaillée des matières, coefficients, notes et appréciation', true, '{"border":"1px solid #cbd5e1","showCoeff":true}'::jsonb),
    ('AVERAGE', 'Moyenne Générale', 'SUMMARY', 'Moyenne calculée de l’élève', false, '{"fontSize":"16px","fontWeight":"bold","color":"#2563eb"}'::jsonb),
    ('RANK', 'Rang de l’Élève', 'SUMMARY', 'Classement dans la classe', false, '{"fontSize":"16px","fontWeight":"bold","color":"#0d9488"}'::jsonb),
    ('MENTION', 'Mention / Distinctions', 'SUMMARY', 'Encouragements, Félicitations, Blâme', false, '{"fontSize":"14px"}'::jsonb),
    ('APPRECIATION', 'Appréciation Générale', 'SUMMARY', 'Bilan global du travail et de la conduite', false, '{"fontSize":"13px"}'::jsonb),
    ('DECISION', 'Décision Pédagogique', 'SUMMARY', 'Décision de passage, redoublement ou conseil', false, '{"fontSize":"15px","fontWeight":"bold","color":"#16a34a"}'::jsonb),
    ('SIGNATURES', 'Bloc Signatures', 'VALIDATION', 'Zone réservée aux signatures et sceaux', true, '{"layout":"horizontal"}'::jsonb),
    ('DIRECTOR_SIGNATURE', 'Signature Directeur', 'VALIDATION', 'Emplacement signature du chef d’établissement', false, '{"title":"Le Directeur"}'::jsonb),
    ('TEACHER_SIGNATURE', 'Signature Professeur', 'VALIDATION', 'Emplacement signature du professeur principal', false, '{"title":"Le Professeur Principal"}'::jsonb),
    ('STAMP', 'Sceau Officiel', 'VALIDATION', 'Tampon officiel de l’établissement', false, '{"width":"100px"}'::jsonb),
    ('QR_CODE', 'QR Code de Sécurité', 'SECURITY', 'Code QR d’authentification et de vérification par checksum', true, '{"position":"bottom-right","size":"70px"}'::jsonb),
    ('FOOTER', 'Pied de Page', 'SECURITY', 'Bas de page avec numéro, date d’édition et mentions légales', true, '{"fontSize":"11px","color":"#94a3b8","alignment":"center"}'::jsonb),
    ('CUSTOM_TEXT', 'Texte Personnalisé', 'CUSTOM', 'Zone de texte libre configurable', false, '{"text":"Saisissez votre texte ici...","fontSize":"13px"}'::jsonb),
    ('CUSTOM_TABLE', 'Tableau Personnalisé', 'CUSTOM', 'Tableau de données sur mesure', false, '{"columns":["Désignation","Valeur"]}'::jsonb),
    ('CUSTOM_IMAGE', 'Image / Filigrane', 'CUSTOM', 'Illustration ou image personnalisée', false, '{"width":"100%"}'::jsonb)
ON CONFLICT (code) DO UPDATE 
SET name = EXCLUDED.name, description = EXCLUDED.description, default_configuration = EXCLUDED.default_configuration;
