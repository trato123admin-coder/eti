-- =====================================================================================
-- Migración: 002_eti_core_schema.sql
-- Sprint: ETI-S1 — Core Data Model, Migraciones y Base ETI
-- Descripción: Tablas canónicas para canales de YouTube, videos, segmentación,
--              estrategias extraídas, reglas estándar vs excepciones y operaciones.
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1. Canales y Creadores de Contenido (Fuentes de Conocimiento)
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.eti_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform VARCHAR(32) NOT NULL DEFAULT 'YOUTUBE',
    channel_id VARCHAR(128) NOT NULL UNIQUE,
    channel_title VARCHAR(255) NOT NULL,
    channel_url TEXT NOT NULL,
    description TEXT,
    language VARCHAR(10) DEFAULT 'en',
    trader_archetype VARCHAR(64), -- 'MOMENTUM_SCALPER', 'SMART_MONEY', 'GEX_FLOW', 'MEAN_REVERSION', 'RISK_SPREADS'
    priority_weight NUMERIC(3, 2) DEFAULT 1.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sync_cursor TEXT,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER trg_eti_sources_updated_at
    BEFORE UPDATE ON public.eti_sources
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- -------------------------------------------------------------------------------------
-- 2. Videos Catalogados y Filtro Inteligente L1
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.eti_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES public.eti_sources(id) ON DELETE CASCADE,
    external_video_id VARCHAR(64) NOT NULL UNIQUE, -- YouTube Video ID
    title TEXT NOT NULL,
    description TEXT,
    published_at TIMESTAMPTZ NOT NULL,
    duration_seconds INTEGER,
    video_url TEXT NOT NULL,
    relevance_score NUMERIC(5, 2) DEFAULT 0.00, -- 0 a 100
    processing_status VARCHAR(32) NOT NULL DEFAULT 'DISCOVERED'
        CHECK (processing_status IN ('DISCOVERED', 'FILTER_REJECTED', 'TRANSCRIPT_PENDING', 'TRANSCRIPT_READY', 'EXTRACTING', 'EXTRACTED', 'ERROR')),
    discard_reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eti_videos_source_status ON public.eti_videos(source_id, processing_status);
CREATE INDEX IF NOT EXISTS idx_eti_videos_relevance ON public.eti_videos(relevance_score DESC);

-- -------------------------------------------------------------------------------------
-- 3. Segmentos Operativos de Video (L3 Chunking)
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.eti_video_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES public.eti_videos(id) ON DELETE CASCADE,
    start_seconds INTEGER NOT NULL,
    end_seconds INTEGER NOT NULL,
    topic VARCHAR(64), -- 'OPTIONS_ENTRY', 'STOP_LOSS', 'RECAP_TRADE', 'MARKET_REGIME', 'RISK_RULE'
    summary TEXT,
    text_sample TEXT,
    confidence NUMERIC(4, 3) DEFAULT 0.000,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eti_segments_video ON public.eti_video_segments(video_id);

-- -------------------------------------------------------------------------------------
-- 4. Estrategias Canónicas y Clasificación Consenso vs. Excepción
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.eti_strategies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(128) NOT NULL UNIQUE,
    underlying VARCHAR(32) NOT NULL DEFAULT 'SPY',
    direction VARCHAR(16) NOT NULL CHECK (direction IN ('CALL', 'PUT', 'BOTH', 'NEUTRAL')),
    primary_timeframe VARCHAR(16) DEFAULT '5m',
    nature VARCHAR(32) NOT NULL DEFAULT 'STANDARD_CONSENSUS'
        CHECK (nature IN ('STANDARD_CONSENSUS', 'UNIQUE_EXCEPTION')),
    description TEXT,
    lifecycle_status VARCHAR(32) NOT NULL DEFAULT 'DISCOVERED'
        CHECK (lifecycle_status IN ('DISCOVERED', 'STRUCTURED', 'BACKTEST_PASSED', 'PAPER_TRADING', 'VALIDATED', 'SUSPENDED', 'REJECTED')),
    evidence_level VARCHAR(16) NOT NULL DEFAULT 'E0'
        CHECK (evidence_level IN ('E0', 'E1', 'E2', 'E3', 'E4', 'E5', 'E6')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Versiones inmutables de la estrategia
CREATE TABLE IF NOT EXISTS public.eti_strategy_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    strategy_id UUID NOT NULL REFERENCES public.eti_strategies(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    dsl_definition JSONB NOT NULL,
    hash VARCHAR(64) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(strategy_id, version_number)
);

-- -------------------------------------------------------------------------------------
-- 5. Reglas de Trading Estructuradas (Reglas Estándar y Reglas Excepción)
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.eti_strategy_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    strategy_version_id UUID NOT NULL REFERENCES public.eti_strategy_versions(id) ON DELETE CASCADE,
    rule_type VARCHAR(32) NOT NULL -- 'ENTRY_TRIGGER', 'CONFIRMATION', 'INVALIDATION', 'STOP_LOSS', 'TAKE_PROFIT'
        CHECK (rule_type IN ('ENTRY_TRIGGER', 'CONFIRMATION', 'INVALIDATION', 'STOP_LOSS', 'TAKE_PROFIT', 'GATE_CONDITION')),
    rule_nature VARCHAR(32) NOT NULL DEFAULT 'STANDARD_CONSENSUS'
        CHECK (rule_nature IN ('STANDARD_CONSENSUS', 'UNIQUE_EXCEPTION')),
    condition_code VARCHAR(128) NOT NULL,
    parameters JSONB DEFAULT '{}'::jsonb,
    activation_context JSONB DEFAULT '{}'::jsonb, -- Régimen necesario para activar excepción (ej. IV > 40, Gap > 1.8%)
    source_author_id UUID REFERENCES public.eti_sources(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------------------------------
-- 6. Operaciones Declaradas por Influencers (Base para Vía A: Replay)
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.eti_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES public.eti_sources(id),
    video_id UUID NOT NULL REFERENCES public.eti_videos(id),
    segment_id UUID REFERENCES public.eti_video_segments(id),
    market_date DATE,
    entry_time_est TIME,
    exit_time_est TIME,
    underlying VARCHAR(16) NOT NULL,
    contract_type VARCHAR(8) CHECK (contract_type IN ('CALL', 'PUT')),
    strike NUMERIC(10, 2),
    expiration_date DATE,
    dte INTEGER,
    declared_entry_premium NUMERIC(10, 4),
    declared_exit_premium NUMERIC(10, 4),
    declared_pnl_usd NUMERIC(12, 2),
    declared_quantity INTEGER,
    date_confidence VARCHAR(16) DEFAULT 'MEDIUM' CHECK (date_confidence IN ('EXACT', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN')),
    claim_type VARCHAR(32) DEFAULT 'RECAP_CLAIM' CHECK (claim_type IN ('LIVE_CLAIM', 'RECAP_CLAIM', 'UNVERIFIED_CLAIM', 'BROKER_VERIFIED')),
    unknown_fields TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------------------------------
-- 7. Evidencia y Trazabilidad (E0 a E6)
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.eti_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    strategy_id UUID NOT NULL REFERENCES public.eti_strategies(id) ON DELETE CASCADE,
    evidence_level VARCHAR(16) NOT NULL CHECK (evidence_level IN ('E0', 'E1', 'E2', 'E3', 'E4', 'E5', 'E6')),
    source_id UUID REFERENCES public.eti_sources(id),
    video_id UUID REFERENCES public.eti_videos(id),
    segment_id UUID REFERENCES public.eti_video_segments(id),
    description TEXT NOT NULL,
    metrics JSONB DEFAULT '{}'::jsonb,
    verified_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------------------------------
-- 8. Cola de Revisión Humana y Auditoría
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.eti_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(32) NOT NULL, -- 'VIDEO_EXTRACTION', 'STRATEGY_RULE', 'OPERATION'
    entity_id UUID NOT NULL,
    decision VARCHAR(32) NOT NULL CHECK (decision IN ('APPROVED', 'MODIFIED', 'REJECTED', 'UNCERTAIN')),
    reviewer_id UUID REFERENCES auth.users(id),
    modifications JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------------------------------
-- 9. Row Level Security (RLS) en tablas eti_*
-- -------------------------------------------------------------------------------------
ALTER TABLE public.eti_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eti_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eti_video_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eti_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eti_strategy_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eti_strategy_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eti_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eti_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eti_reviews ENABLE ROW LEVEL SECURITY;

-- Políticas: Lectura permitida a usuarios autenticados
CREATE POLICY "Lectura de conocimiento ETI para usuarios autenticados"
    ON public.eti_strategies FOR SELECT TO authenticated USING (true);

CREATE POLICY "Lectura de fuentes para usuarios autenticados"
    ON public.eti_sources FOR SELECT TO authenticated USING (true);

CREATE POLICY "Lectura de videos para usuarios autenticados"
    ON public.eti_videos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Lectura de reglas para usuarios autenticados"
    ON public.eti_strategy_rules FOR SELECT TO authenticated USING (true);
