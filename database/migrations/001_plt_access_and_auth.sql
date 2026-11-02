-- =====================================================================================
-- Migración: 001_plt_access_and_auth.sql
-- Sprint: PLT-A1 — Acceso, Autenticación y Seguridad a Nivel Plataforma
-- Descripción: Infraestructura de identidad, RBAC, invitaciones, tokens de servicio
--              y auditoría de accesos sobre Supabase Auth y PostgreSQL.
-- =====================================================================================

-- Habilitar extensión pgcrypto para generación de UUIDs y hashes
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -------------------------------------------------------------------------------------
-- 1. Catálogo de Roles de la Plataforma (RBAC)
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(32) UNIQUE NOT NULL,
    name VARCHAR(64) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserción de roles canónicos
INSERT INTO public.app_roles (code, name, description) VALUES
    ('owner', 'Platform Owner', 'Control total, gestión de políticas selladas y autorización de trading en vivo'),
    ('admin', 'Administrator', 'Gestión de usuarios, auditoría, configuración de entorno y fuentes'),
    ('trader', 'Trading Operator', 'Supervisión de operaciones del robot eTrade y visualización del Experience Ledger'),
    ('reviewer', 'ETI Reviewer', 'Revisión humana de videos de YouTube, validación de reglas extraídas y DSL'),
    ('viewer', 'Auditor / Viewer', 'Acceso de solo lectura a dashboards, métricas y reportes de atribución'),
    ('service', 'Machine / Service Account', 'Identidad para workers de extracción, backtesting y robot eTrade')
ON CONFLICT (code) DO NOTHING;

-- -------------------------------------------------------------------------------------
-- 2. Perfiles de Usuario (Enlazados a auth.users de Supabase)
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(128),
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'DISABLED')),
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_enforced BOOLEAN DEFAULT FALSE,
    timezone VARCHAR(64) DEFAULT 'America/New_York',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_app_profiles_updated_at
    BEFORE UPDATE ON public.app_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- -------------------------------------------------------------------------------------
-- 3. Asignación de Roles a Usuarios
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_user_roles (
    user_id UUID REFERENCES public.app_profiles(id) ON DELETE CASCADE,
    role_id UUID REFERENCES public.app_roles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);

-- -------------------------------------------------------------------------------------
-- 4. Registro por Invitación Controlada (Sin auto-registro público)
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    role_code VARCHAR(32) NOT NULL REFERENCES public.app_roles(code),
    token_hash VARCHAR(128) NOT NULL UNIQUE,
    invited_by UUID REFERENCES auth.users(id),
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ
);

-- -------------------------------------------------------------------------------------
-- 5. Credenciales de Máquina / Tokens de Servicio (Workers y Robot)
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_service_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(64) NOT NULL UNIQUE,
    token_hash VARCHAR(128) NOT NULL UNIQUE,
    role_code VARCHAR(32) NOT NULL DEFAULT 'service' REFERENCES public.app_roles(code),
    scopes TEXT[] NOT NULL DEFAULT ARRAY['read:strategies', 'write:ledger'],
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------------------------------
-- 6. Auditoría de Eventos de Acceso y Seguridad
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_auth_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    event_type VARCHAR(64) NOT NULL, -- 'LOGIN_SUCCESS', 'LOGIN_FAILED', 'MFA_CHALLENGE', 'ROLE_CHANGE', 'SERVICE_TOKEN_AUTH'
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------------------------------
-- 7. Habilitación de Row Level Security (RLS)
-- -------------------------------------------------------------------------------------
ALTER TABLE public.app_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_service_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_auth_events ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
-- app_roles: Lectura para usuarios autenticados
CREATE POLICY "Lectura de roles para usuarios autenticados"
    ON public.app_roles FOR SELECT
    TO authenticated
    USING (true);

-- app_profiles: Cada usuario puede leer su propio perfil; admins/owners leen todos
CREATE POLICY "Lectura de propio perfil o administradores"
    ON public.app_profiles FOR SELECT
    TO authenticated
    USING (
        auth.uid() = id OR
        EXISTS (
            SELECT 1 FROM public.app_user_roles ur
            JOIN public.app_roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.code IN ('owner', 'admin')
        )
    );

-- app_service_tokens: Solo accesible por service_role (backend) o administradores
CREATE POLICY "Solo administradores pueden gestionar service tokens"
    ON public.app_service_tokens FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.app_user_roles ur
            JOIN public.app_roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.code IN ('owner', 'admin')
        )
    );

-- app_auth_events: Inserción permitida; lectura restringida a admins
CREATE POLICY "Lectura de auditoria solo para administradores"
    ON public.app_auth_events FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.app_user_roles ur
            JOIN public.app_roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.code IN ('owner', 'admin')
        )
    );
