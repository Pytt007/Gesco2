-- =============================================================================
-- GESCO — CONSOLIDATION & RENFORCEMENT SCHEMA POSTGRESQL / SUPABASE
-- Module Utilisateurs, Rôles, Établissement et Audit Logs (Script Idempotent)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. TABLE SCHOOLS (ÉTABLISSEMENT & APPARTENANCE MULTI-TENANT)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    logo TEXT,
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Côte d''Ivoire',
    phone VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(255),
    currency VARCHAR(10) DEFAULT 'FCFA',
    language VARCHAR(10) DEFAULT 'fr',
    timezone VARCHAR(50) DEFAULT 'GMT',
    
    -- Audit & Soft Delete
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,

    CONSTRAINT chk_schools_status CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'ARCHIVED'))
);

-- Complétion des colonnes si la table existait déjà dans une version simplifiée
ALTER TABLE schools ADD COLUMN IF NOT EXISTS logo TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE schools ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'Côte d''Ivoire';
ALTER TABLE schools ADD COLUMN IF NOT EXISTS website VARCHAR(255);
ALTER TABLE schools ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'FCFA';
ALTER TABLE schools ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'fr';
ALTER TABLE schools ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'GMT';
ALTER TABLE schools ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE';

-- -----------------------------------------------------------------------------
-- 2. TABLE PROFILES (PROFILS UTILISATEURS SYNCHRONISÉS)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    phone VARCHAR(50),
    school_id UUID REFERENCES schools(id) ON DELETE RESTRICT,
    
    -- Audit & Soft Delete
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,

    CONSTRAINT chk_profiles_status CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'ARCHIVED'))
);

-- Ajout propre de la contrainte FK sur school_id si non présente
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_profiles_school' AND table_name = 'profiles'
    ) THEN
        ALTER TABLE profiles 
        ADD CONSTRAINT fk_profiles_school 
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE RESTRICT;
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3. TABLES ROLES & PERMISSIONS
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    label VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Audit & Soft Delete
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,

    CONSTRAINT chk_roles_status CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'ARCHIVED'))
);

CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) UNIQUE NOT NULL,
    label VARCHAR(100) NOT NULL,
    module VARCHAR(50) NOT NULL,
    description TEXT,
    
    -- Audit & Soft Delete
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,

    CONSTRAINT chk_permissions_status CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'ARCHIVED'))
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    
    -- Audit & Soft Delete
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,

    PRIMARY KEY (role_id, permission_id),
    CONSTRAINT chk_role_permissions_status CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'ARCHIVED'))
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    
    -- Audit & Soft Delete
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,

    PRIMARY KEY (user_id, role_id),
    CONSTRAINT chk_user_roles_status CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'ARCHIVED'))
);

-- -----------------------------------------------------------------------------
-- 4. CONTRAINTES FOREIGN KEYS CREATED_BY / UPDATED_BY (AUTO-RÉFÉRANCE)
-- -----------------------------------------------------------------------------

DO $$
BEGIN
    -- profiles -> created_by / updated_by
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_profiles_created_by') THEN
        ALTER TABLE profiles ADD CONSTRAINT fk_profiles_created_by FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_profiles_updated_by') THEN
        ALTER TABLE profiles ADD CONSTRAINT fk_profiles_updated_by FOREIGN KEY (updated_by) REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;

    -- roles -> created_by / updated_by
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_roles_created_by') THEN
        ALTER TABLE roles ADD CONSTRAINT fk_roles_created_by FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_roles_updated_by') THEN
        ALTER TABLE roles ADD CONSTRAINT fk_roles_updated_by FOREIGN KEY (updated_by) REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 5. ANNÉE SCOLAIRE ACTIVE DANS SCHOOLS & SCHOOL_YEARS
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS school_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    label VARCHAR(20) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN NOT NULL DEFAULT FALSE,
    
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    CONSTRAINT chk_school_years_status CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'ARCHIVED')),
    CONSTRAINT chk_school_year_dates CHECK (end_date > start_date),
    CONSTRAINT uq_school_year_label UNIQUE (school_id, label)
);

-- Colonne d'année scolaire active directement portée sur l'établissement
ALTER TABLE schools ADD COLUMN IF NOT EXISTS active_school_year_id UUID REFERENCES school_years(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- 6. TABLE GLOBALE AUDIT_LOGS
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    module VARCHAR(50) NOT NULL,
    entity VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100),
    action VARCHAR(50) NOT NULL, -- Ex: 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_audit_logs_action CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'IMPORT'))
);

-- -----------------------------------------------------------------------------
-- 7. INDEX DE PERFORMANCE OPTIMISÉS
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_schools_code ON schools(code) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_schools_status ON schools(status, is_deleted);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_profiles_school_id ON profiles(school_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status, is_deleted);

CREATE INDEX IF NOT EXISTS idx_roles_code ON roles(code) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_permissions_code ON permissions(code) WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id) WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_role_permissions_perm_id ON role_permissions(permission_id) WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_audit_logs_lookup ON audit_logs(school_id, user_id, module, created_at DESC);

-- -----------------------------------------------------------------------------
-- 8. TRIGGER IDEMPOTENT ET ENRICHI HANDLE_NEW_USER()
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        username,
        full_name,
        avatar_url,
        phone,
        school_id,
        status,
        updated_at
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://api.dicebear.com/7.x/adventurer/svg?seed=' || NEW.id),
        NEW.raw_user_meta_data->>'phone',
        (NEW.raw_user_meta_data->>'school_id')::UUID,
        'ACTIVE',
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        full_name = EXCLUDED.full_name,
        avatar_url = EXCLUDED.avatar_url,
        phone = COALESCE(EXCLUDED.phone, profiles.phone),
        school_id = COALESCE(EXCLUDED.school_id, profiles.school_id),
        updated_at = CURRENT_TIMESTAMP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 9. SÉCURITÉ RLS SUR LES NOUVELLES TABLES (SCHOOLS & AUDIT_LOGS)
-- -----------------------------------------------------------------------------

ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Politique Schools 1 : Tout utilisateur authentifié peut consulter les détails de son propre établissement
DROP POLICY IF EXISTS policy_schools_select ON schools;
CREATE POLICY policy_schools_select ON schools
    FOR SELECT TO authenticated
    USING (
        is_deleted = FALSE AND (
            id = (SELECT school_id FROM profiles WHERE id = auth.uid()) OR
            EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                WHERE ur.user_id = auth.uid() AND r.code = 'ADMIN_GENERALE'
            )
        )
    );

-- Politique Schools 2 : Seul l'Administrateur Général peut modifier ou insérer un établissement
DROP POLICY IF EXISTS policy_schools_admin_all ON schools;
CREATE POLICY policy_schools_admin_all ON schools
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.code = 'ADMIN_GENERALE'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.code = 'ADMIN_GENERALE'
        )
    );

-- Politique Audit Logs 1 : Seuls les administrateurs généraux peuvent lire les logs de leur établissement
DROP POLICY IF EXISTS policy_audit_logs_select ON audit_logs;
CREATE POLICY policy_audit_logs_select ON audit_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.code = 'ADMIN_GENERALE'
        )
    );

-- Politique Audit Logs 2 : Tout système/service authentifié peut insérer un log d'audit
DROP POLICY IF EXISTS policy_audit_logs_insert ON audit_logs;
CREATE POLICY policy_audit_logs_insert ON audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (TRUE);
