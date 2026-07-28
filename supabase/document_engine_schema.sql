-- ============================================================================
-- GESCO - Document Engine Schema
-- Tables: document_templates, document_template_sections, generated_documents
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.document_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'ACADEMIC', 'FINANCE', 'ADMINISTRATIVE', 'REPORT'
    description TEXT,
    version INT NOT NULL DEFAULT 1,
    school_id VARCHAR(100) NULL,
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.document_template_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES public.document_templates(id) ON DELETE CASCADE,
    section_type VARCHAR(50) NOT NULL, -- 'HEADER', 'SCHOOL_INFO', 'STUDENT_INFO', 'GRADES_TABLE', 'STATISTICS', 'SIGNATURES', 'QR_CODE', 'FOOTER'
    display_order INT NOT NULL DEFAULT 0,
    configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.generated_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES public.document_templates(id) ON DELETE SET NULL,
    document_type VARCHAR(50) NOT NULL, -- 'BULLETIN', 'SCHOOL_RECEIPT', 'CANTEEN_RECEIPT', 'TRANSPORT_RECEIPT', 'CERTIFICATE', 'ATTESTATION', 'ATTENDANCE_LIST', 'REPORT'
    entity_type VARCHAR(50) NOT NULL, -- 'STUDENT', 'CLASSROOM', 'PAYMENT', 'USER'
    entity_id VARCHAR(100) NOT NULL,
    generated_by VARCHAR(100) NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    pdf_url TEXT NULL,
    checksum VARCHAR(128) NOT NULL
);

-- Index pour accélérer les requêtes d'historique et de recherche de modèles
CREATE INDEX IF NOT EXISTS idx_doc_templates_code ON public.document_templates(code);
CREATE INDEX IF NOT EXISTS idx_doc_templates_category ON public.document_templates(category);
CREATE INDEX IF NOT EXISTS idx_doc_template_sections_template ON public.document_template_sections(template_id, display_order);
CREATE INDEX IF NOT EXISTS idx_generated_docs_entity ON public.generated_documents(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_generated_docs_type ON public.generated_documents(document_type);
