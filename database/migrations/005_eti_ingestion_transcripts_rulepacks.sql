-- =====================================================================================
-- Migración 005: Panel de Ingesta, Subtítulos y Rule Packs (Addendum v2.3)
-- Base de Datos: Supabase (PostgreSQL 15+)
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1. Resoluciones de Fuentes (URLs, Handles y Búsqueda de Candidatos)
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.eti_source_resolutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    input_query TEXT NOT NULL,
    resolution_type VARCHAR(32) NOT NULL 
        CHECK (resolution_type IN ('HANDLE', 'CHANNEL_ID', 'CUSTOM_URL', 'VIDEO_URL', 'PLAYLIST_URL', 'SEARCH_QUERY')),
    resolved_channel_id VARCHAR(64),
    resolved_channel_title VARCHAR(256),
    resolved_handle VARCHAR(128),
    candidate_options JSONB DEFAULT '[]'::jsonb,
    is_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------------------------------
-- 2. Corridas de Ingesta Masiva (Backfill & Sync)
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.eti_ingestion_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES public.eti_sources(id) ON DELETE CASCADE,
    run_type VARCHAR(16) NOT NULL DEFAULT 'BACKFILL' CHECK (run_type IN ('BACKFILL', 'INCREMENTAL_SYNC', 'REPROCESS')),
    status VARCHAR(16) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED', 'FAILED')),
    validity_window_years INTEGER NOT NULL DEFAULT 3,
    budget_cap_usd NUMERIC(10, 2) NOT NULL DEFAULT 15.00,
    budget_spent_usd NUMERIC(10, 4) NOT NULL DEFAULT 0.0000,
    
    -- Embudo en vivo (Funnel metrics)
    discovered_count INTEGER NOT NULL DEFAULT 0,
    relevant_count INTEGER NOT NULL DEFAULT 0,
    discarded_out_of_window INTEGER NOT NULL DEFAULT 0,
    discarded_irrelevant INTEGER NOT NULL DEFAULT 0,
    with_text_count INTEGER NOT NULL DEFAULT 0,
    extracted_count INTEGER NOT NULL DEFAULT 0,
    reviewed_count INTEGER NOT NULL DEFAULT 0,
    approved_count INTEGER NOT NULL DEFAULT 0,
    consolidated_count INTEGER NOT NULL DEFAULT 0,
    
    current_cursor TEXT,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Estimaciones previas (Dry Run)
CREATE TABLE IF NOT EXISTS public.eti_ingestion_estimates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ingestion_run_id UUID NOT NULL REFERENCES public.eti_ingestion_runs(id) ON DELETE CASCADE,
    estimated_videos_total INTEGER NOT NULL,
    estimated_relevant_videos INTEGER NOT NULL,
    estimated_total_hours NUMERIC(8, 2) NOT NULL,
    estimated_tokens_input INTEGER NOT NULL,
    estimated_cost_usd NUMERIC(10, 2) NOT NULL,
    estimated_youtube_quota_units INTEGER NOT NULL,
    estimated_duration_minutes INTEGER NOT NULL,
    actual_cost_usd NUMERIC(10, 4),
    formula_assumptions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------------------------------
-- 3. Tipos de Contenido y Clasificación de Videos
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.eti_content_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(32) NOT NULL UNIQUE,
    name VARCHAR(64) NOT NULL,
    description TEXT,
    extraction_target VARCHAR(64) NOT NULL, -- 'EXPLICIT_RULES', 'STATED_TRADES', 'MACRO_REGIME', 'DISCARD'
    requires_chunking BOOLEAN NOT NULL DEFAULT FALSE
);

INSERT INTO public.eti_content_types (code, name, description, extraction_target, requires_chunking)
VALUES
    ('TUTORIAL', 'Tutorial / Clase Teórica', 'Videos educativos con reglas explícitas de entrada, confirmación e indicadores.', 'EXPLICIT_RULES', FALSE),
    ('LIVE_SESSION', 'Sesión de Trading en Vivo', 'Directos de mercado (1-4 horas) con operaciones ejecutadas en tiempo real.', 'STATED_TRADES', TRUE),
    ('RECAP', 'Recapitulativa de Sesión', 'Resumen post-mercado de operaciones del día (Vía A: Replay).', 'STATED_TRADES', FALSE),
    ('MARKET_ANALYSIS', 'Análisis de Régimen / Macro', 'Niveles de Gamma (GEX), volatilidad implícita, sesgo de mercado.', 'MACRO_REGIME', FALSE),
    ('INTERVIEW', 'Entrevista / Charlas', 'Conversaciones y debates; generalmente sin reglas operativas exactas.', 'DISCARD', FALSE),
    ('PROMO', 'Promocional / Fluff', 'Venta de cursos o contenido sin sustancia técnica (descarte con motivo).', 'DISCARD', FALSE)
ON CONFLICT (code) DO NOTHING;

-- Añadir content_type a eti_videos si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='eti_videos' AND column_name='content_type') THEN
        ALTER TABLE public.eti_videos ADD COLUMN content_type VARCHAR(32) DEFAULT 'TUTORIAL';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='eti_videos' AND column_name='text_provenance') THEN
        ALTER TABLE public.eti_videos ADD COLUMN text_provenance VARCHAR(32) DEFAULT 'NONE'; -- 'USER_PROVIDED', 'OFFICIAL_CAPTION', 'NONE'
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='eti_videos' AND column_name='text_confidence') THEN
        ALTER TABLE public.eti_videos ADD COLUMN text_confidence NUMERIC(4, 2) DEFAULT 0.00;
    END IF;
END $$;

-- -------------------------------------------------------------------------------------
-- 4. Carga Masiva de Subtítulos (TranscriptProvider / UserUploadProvider)
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.eti_transcript_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES public.eti_sources(id) ON DELETE CASCADE,
    file_name VARCHAR(256) NOT NULL,
    file_format VARCHAR(16) NOT NULL CHECK (file_format IN ('SRT', 'VTT', 'TXT', 'JSON')),
    file_hash VARCHAR(64) NOT NULL,
    matched_video_id UUID REFERENCES public.eti_videos(id) ON DELETE SET NULL,
    match_method VARCHAR(32) DEFAULT 'EXACT_VIDEO_ID' CHECK (match_method IN ('EXACT_VIDEO_ID', 'TITLE_FUZZY', 'MANUAL_SELECTION', 'UNMATCHED')),
    match_confidence NUMERIC(4, 2) DEFAULT 1.00,
    text_content TEXT, -- Efímero o persistido según decisión
    segments_count INTEGER DEFAULT 0,
    status VARCHAR(16) NOT NULL DEFAULT 'MATCHED' CHECK (status IN ('PENDING_CONFIRMATION', 'MATCHED', 'PROCESSED', 'REJECTED')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------------------------------
-- 5. Glosario de Dominio Financiero (Normalización de Transcripciones)
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.eti_glossary_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canonical_term VARCHAR(64) NOT NULL UNIQUE,
    category VARCHAR(32) NOT NULL, -- 'OPTIONS', 'GREEKS', 'INDICATOR', 'TICKER'
    common_misspellings TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.eti_glossary_terms (canonical_term, category, common_misspellings, description)
VALUES
    ('0DTE', 'OPTIONS', ARRAY['cero dte', '0 dte', 'zero dte', 'cero de te e'], 'Zero Days to Expiration (Opciones que expiran el mismo día)'),
    ('SPX', 'TICKER', ARRAY['s px', 'sp x', 's p x', 'espe equis'], 'S&P 500 Index (European style cash-settled)'),
    ('SPY', 'TICKER', ARRAY['s py', 'sp y', 'espe i'], 'SPDR S&P 500 ETF Trust'),
    ('QQQ', 'TICKER', ARRAY['q q q', 'cu cu cu', 'triple q'], 'Invesco QQQ Trust (Nasdaq 100)'),
    ('GEX', 'OPTIONS', ARRAY['g ex', 'ge x', 'gamma exposure', 'ye x'], 'Gamma Exposure de los creadores de mercado'),
    ('VWAP', 'INDICATOR', ARRAY['v wap', 'uve wap', 'b wap', 'vwap'], 'Volume Weighted Average Price'),
    ('Delta', 'GREEKS', ARRAY['del ta'], 'Sensibilidad del precio de la opción respecto al subyacente'),
    ('Theta', 'GREEKS', ARRAY['te ta', 'teta'], 'Decaimiento temporal de la opción por día'),
    ('Moneyness', 'OPTIONS', ARRAY['manines', 'money ness'], 'Relación entre strike y precio spot (ATM, ITM, OTM)')
ON CONFLICT (canonical_term) DO NOTHING;

-- -------------------------------------------------------------------------------------
-- 6. Lotes de Revisión Humana con Muestreo de Auditoría
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.eti_review_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reviewer_id UUID REFERENCES public.app_profiles(id),
    total_items INTEGER NOT NULL,
    audit_sample_pct NUMERIC(4, 2) NOT NULL DEFAULT 15.00, -- 15% de muestra obligatoria
    audit_sample_size INTEGER NOT NULL,
    audit_errors_found INTEGER NOT NULL DEFAULT 0,
    error_threshold_pct NUMERIC(4, 2) NOT NULL DEFAULT 5.00,
    batch_status VARCHAR(16) NOT NULL DEFAULT 'PENDING_AUDIT' CHECK (batch_status IN ('PENDING_AUDIT', 'APPROVED', 'REJECTED_AUDIT_FAILED')),
    decision_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------------------------------
-- 7. Rule Packs Canónicos Versionados (Artefactos Inmutables para el Robot)
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.eti_rule_packs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID NOT NULL REFERENCES public.eti_topics(id) ON DELETE CASCADE,
    code VARCHAR(64) NOT NULL UNIQUE, -- 'RP_OPTIONS_INTRADAY_V1'
    name VARCHAR(128) NOT NULL,
    horizon VARCHAR(16) NOT NULL DEFAULT 'INTRADAY' CHECK (horizon IN ('SCALP', 'INTRADAY', 'SWING', 'POSITION')),
    consumer_module VARCHAR(64) NOT NULL DEFAULT 'APEX_OPTIONS_MODULE',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.eti_rule_pack_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_pack_id UUID NOT NULL REFERENCES public.eti_rule_packs(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    hash VARCHAR(64) NOT NULL,
    lifecycle_status VARCHAR(16) NOT NULL DEFAULT 'DRAFT'
        CHECK (lifecycle_status IN ('DRAFT', 'SHADOW', 'INFORMATIVE', 'WEIGHTED', 'SUPERSEDED', 'SUSPENDED')),
    published_by UUID REFERENCES public.app_profiles(id),
    published_at TIMESTAMPTZ,
    notes TEXT,
    rules_payload JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(rule_pack_id, version_number)
);

CREATE TABLE IF NOT EXISTS public.eti_rule_pack_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_pack_version_id UUID NOT NULL REFERENCES public.eti_rule_pack_versions(id) ON DELETE CASCADE,
    playbook_rule_id UUID REFERENCES public.eti_playbook_rules(id) ON DELETE SET NULL,
    rule_code VARCHAR(64) NOT NULL,
    rule_type VARCHAR(32) NOT NULL,
    rule_nature VARCHAR(32) NOT NULL DEFAULT 'STANDARD_CONSENSUS',
    evidence_level VARCHAR(16) NOT NULL DEFAULT 'E2',
    dsl_definition JSONB NOT NULL,
    applicability_regimes TEXT[] NOT NULL DEFAULT ARRAY['ALL']::TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed de Rule Pack inicial de Opciones
INSERT INTO public.eti_rule_packs (code, name, horizon, consumer_module, topic_id)
SELECT 'RP_OPTIONS_INTRADAY_V1', 'Rule Pack de Opciones Intradía (0DTE/SPY/QQQ)', 'INTRADAY', 'APEX_OPTIONS_MODULE', id
FROM public.eti_topics WHERE code = 'OPTIONS'
ON CONFLICT (code) DO NOTHING;
