-- =============================================================================
-- GESCO — MODULE UTILISATEURS & RÔLES : COUCHE BASE DE DONNÉES (POSTGRESQL / SUPABASE)
-- =============================================================================
-- Ce script DDL et RLS configure la gestion des utilisateurs, rôles, permissions
-- et politiques de sécurité (Row Level Security) pour la plateforme GESCO.
-- =============================================================================

-- Extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. CREATION DES TABLES DU MODULE UTILISATEURS & ROLES
-- -----------------------------------------------------------------------------

-- Table des Rôles
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL, -- Ex: 'ADMIN_GENERALE', 'FINANCE', 'SCOLAIRE_ENSEIGNANT', 'CANTINE_TRANSPORT'
    label VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Audit & Soft Delete
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIF',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID
);

-- Table des Permissions Granulaires
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) UNIQUE NOT NULL, -- Ex: 'USERS_READ', 'USERS_WRITE', 'SETTINGS_MANAGE'
    label VARCHAR(100) NOT NULL,
    module VARCHAR(50) NOT NULL,       -- Ex: 'UTILISATEURS', 'FINANCE', 'PARAMETRES'
    description TEXT,
    
    -- Audit & Soft Delete
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIF',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID
);

-- Table de Jonction : Attribuer des Permissions aux Rôles (N:N)
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    
    -- Audit & Soft Delete
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIF',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    PRIMARY KEY (role_id, permission_id)
);

-- Table des Profils Utilisateurs (Liaison 1:1 avec auth.users de Supabase)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    phone VARCHAR(50),
    school_id UUID, -- Référence multi-tenant à la table schools
    
    -- Audit & Soft Delete
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIF',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID
);

-- Table de Jonction : Attribuer des Rôles aux Utilisateurs (N:N)
CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    
    -- Audit & Soft Delete
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIF',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    PRIMARY KEY (user_id, role_id)
);

-- -----------------------------------------------------------------------------
-- 2. INDEX DE PERFORMANCE
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_roles_active ON roles(code) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module, code) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_profiles_school ON profiles(school_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_user_roles_lookup ON user_roles(user_id, role_id) WHERE is_deleted = FALSE;

-- -----------------------------------------------------------------------------
-- 3. TRIGGER SYNCHRONISATION AUTOMATIQUE AUTH.USERS -> PROFILES
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, full_name, avatar_url, school_id)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://api.dicebear.com/7.x/adventurer/svg?seed=' || NEW.id),
        (NEW.raw_user_meta_data->>'school_id')::UUID
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger d'écoute sur la création d'un utilisateur Supabase Auth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 4. FONCTIONS HELPER POUR LE CONTROLE D'ACCES (RLS)
-- -----------------------------------------------------------------------------

-- Vérifie si l'utilisateur connecté est Administrateur Général
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = user_uuid
          AND r.code = 'ADMIN_GENERALE'
          AND ur.is_deleted = FALSE
          AND r.is_deleted = FALSE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Vérifie si l'utilisateur possède une permission spécifique
CREATE OR REPLACE FUNCTION public.has_permission(user_uuid UUID, perm_code VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    -- L'Admin Général dispose de toutes les permissions
    IF public.is_admin(user_uuid) THEN
        RETURN TRUE;
    END IF;

    RETURN EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.role_permissions rp ON ur.role_id = rp.role_id
        JOIN public.permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = user_uuid
          AND p.code = perm_code
          AND ur.is_deleted = FALSE
          AND rp.is_deleted = FALSE
          AND p.is_deleted = FALSE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 5. POLITIKES RLS (ROW LEVEL SECURITY)
-- -----------------------------------------------------------------------------

-- Activation RLS sur les tables
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- ─── 5.1 Politiques sur `roles` ──────────────────────────────────────────────

-- Politique 1.1 : Lecture des rôles autorisée pour tous les utilisateurs authentifiés
CREATE POLICY policy_roles_select ON roles
    FOR SELECT TO authenticated
    USING (is_deleted = FALSE);

-- Politique 1.2 : Modification/Insertion/Suppression des rôles réservée à l'Admin Général
CREATE POLICY policy_roles_admin_all ON roles
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- ─── 5.2 Politiques sur `permissions` ────────────────────────────────────────

-- Politique 2.1 : Lecture des permissions autorisée pour tous les utilisateurs authentifiés
CREATE POLICY policy_permissions_select ON permissions
    FOR SELECT TO authenticated
    USING (is_deleted = FALSE);

-- Politique 2.2 : Gestion des permissions réservée à l'Admin Général
CREATE POLICY policy_permissions_admin_all ON permissions
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- ─── 5.3 Politiques sur `role_permissions` ───────────────────────────────────

-- Politique 3.1 : Lecture des associations rôle-permission pour tous les authentifiés
CREATE POLICY policy_role_permissions_select ON role_permissions
    FOR SELECT TO authenticated
    USING (is_deleted = FALSE);

-- Politique 3.2 : Administration des associations réservée à l'Admin Général
CREATE POLICY policy_role_permissions_admin_all ON role_permissions
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- ─── 5.4 Politiques sur `profiles` ───────────────────────────────────────────

-- Politique 4.1 : Un utilisateur peut consulter uniquement son propre profil (OU l'Admin Général peut tout lire)
CREATE POLICY policy_profiles_select ON profiles
    FOR SELECT TO authenticated
    USING (
        is_deleted = FALSE AND (
            id = auth.uid() OR
            public.is_admin(auth.uid()) OR
            public.has_permission(auth.uid(), 'USERS_READ')
        )
    );

-- Politique 4.2 : Un utilisateur peut modifier son propre profil (changement nom, avatar, tel)
CREATE POLICY policy_profiles_update_self ON profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid() AND is_deleted = FALSE)
    WITH CHECK (id = auth.uid());

-- Politique 4.3 : L'Admin Général peut tout insérer, modifier et supprimer sur les profils
CREATE POLICY policy_profiles_admin_all ON profiles
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- ─── 5.5 Politiques sur `user_roles` ─────────────────────────────────────────

-- Politique 5.1 : Un utilisateur peut voir ses propres rôles attribués
CREATE POLICY policy_user_roles_select_self ON user_roles
    FOR SELECT TO authenticated
    USING (
        is_deleted = FALSE AND (
            user_id = auth.uid() OR
            public.is_admin(auth.uid()) OR
            public.has_permission(auth.uid(), 'USERS_READ')
        )
    );

-- Politique 5.2 : L'attribution et la modification des rôles est réservée exclusivement à l'Admin Général
CREATE POLICY policy_user_roles_admin_all ON user_roles
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));
