-- =====================================================================================
-- Migración 004: Modelo de Temas, Playbooks Consolidados y Mercado (Addendum v2.2)
-- Base de Datos: Supabase (PostgreSQL 15+)
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1. Catálogo de Temas (Topics)
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.eti_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(32) NOT NULL UNIQUE, -- 'OPTIONS', 'SCALPING', 'SWING_TRADING'
    name VARCHAR(64) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'PLANNED'
        CHECK (status IN ('ACTIVE', 'PLANNED', 'DISABLED')),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------------------------------
-- 2. Relación Temas <-> Fuentes con Rol y Prioridad
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.eti_topic_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID NOT NULL REFERENCES public.eti_topics(id) ON DELETE CASCADE,
    source_id UUID NOT NULL REFERENCES public.eti_sources(id) ON DELETE CASCADE,
    role VARCHAR(32) NOT NULL
        CHECK (role IN ('ENTRY_RULES', 'MARKET_CONTEXT', 'RISK_MGMT', 'EDUCATION')),
    priority VARCHAR(16) NOT NULL DEFAULT 'MEDIUM'
        CHECK (priority IN ('VERY_HIGH', 'HIGH', 'MEDIUM', 'LOW')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(topic_id, source_id, role)
);

CREATE INDEX IF NOT EXISTS idx_eti_topic_sources_topic ON public.eti_topic_sources(topic_id);
CREATE INDEX IF NOT EXISTS idx_eti_topic_sources_source ON public.eti_topic_sources(source_id);

-- -------------------------------------------------------------------------------------
-- 3. Playbooks Consolidados por Tema
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.eti_playbooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID NOT NULL REFERENCES public.eti_topics(id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.eti_playbook_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playbook_id UUID NOT NULL REFERENCES public.eti_playbooks(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(playbook_id, version_number)
);

CREATE TABLE IF NOT EXISTS public.eti_playbook_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playbook_version_id UUID NOT NULL REFERENCES public.eti_playbook_versions(id) ON DELETE CASCADE,
    category VARCHAR(32) NOT NULL
        CHECK (category IN ('CONTEXT_REGIME', 'UNDERLYING_SELECTION', 'CALL_PUT_ENTRY', 'CONFIRMATION', 'RISK_MGMT_EXIT', 'CALENDAR_HOURS')),
    rule_code VARCHAR(64) NOT NULL,
    title VARCHAR(256) NOT NULL,
    description TEXT NOT NULL,
    horizon VARCHAR(16) NOT NULL DEFAULT 'INTRADAY'
        CHECK (horizon IN ('SCALP', 'INTRADAY', 'SWING', 'POSITION')),
    consensus_count INTEGER NOT NULL DEFAULT 1,
    sources_supporting JSONB DEFAULT '[]'::jsonb,
    parameter_variants JSONB DEFAULT '{}'::jsonb,
    contradictions JSONB DEFAULT '[]'::jsonb,
    rule_nature VARCHAR(32) NOT NULL DEFAULT 'STANDARD_CONSENSUS'
        CHECK (rule_nature IN ('STANDARD_CONSENSUS', 'UNIQUE_EXCEPTION')),
    evidence_level VARCHAR(16) NOT NULL DEFAULT 'E1'
        CHECK (evidence_level IN ('E0', 'E1', 'E2', 'E3', 'E4', 'E5', 'E6')),
    validation_status VARCHAR(32) NOT NULL DEFAULT 'STRUCTURED'
        CHECK (validation_status IN ('STRUCTURED', 'BACKTEST_PASSED', 'VALIDATED', 'SUSPENDED')),
    usage_in_robot VARCHAR(32) NOT NULL DEFAULT 'NONE'
        CHECK (usage_in_robot IN ('NONE', 'SHADOW', 'INFORMATIVE', 'GATED_EXECUTION')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.eti_playbook_rule_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playbook_rule_id UUID NOT NULL REFERENCES public.eti_playbook_rules(id) ON DELETE CASCADE,
    strategy_rule_id UUID NOT NULL REFERENCES public.eti_strategy_rules(id) ON DELETE CASCADE,
    UNIQUE(playbook_rule_id, strategy_rule_id)
);

-- -------------------------------------------------------------------------------------
-- 4. Resúmenes de IA Versionados con Citas (Tema / Fuente)
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.eti_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(16) NOT NULL CHECK (entity_type IN ('TOPIC', 'SOURCE')),
    entity_id UUID NOT NULL,
    summary_text TEXT NOT NULL,
    citations_json JSONB DEFAULT '[]'::jsonb,
    version INTEGER NOT NULL DEFAULT 1,
    generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------------------------------
-- 5. Módulo de Mercado: Instrumentos, Snapshots, Amplitud y Movers
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.eti_market_instruments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(16) NOT NULL UNIQUE,
    name VARCHAR(64) NOT NULL,
    asset_class VARCHAR(16) NOT NULL
        CHECK (asset_class IN ('INDEX', 'ETF', 'VOLATILITY', 'BOND', 'FOREX', 'EQUITY')),
    proxy_for VARCHAR(16),
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.eti_market_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instrument_id UUID NOT NULL REFERENCES public.eti_market_instruments(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    price NUMERIC(12, 4) NOT NULL,
    change_pct NUMERIC(8, 4) NOT NULL,
    regime VARCHAR(16) NOT NULL
        CHECK (regime IN ('BULLISH', 'BEARISH', 'SIDEWAYS', 'VOLATILE')),
    ema_alignment VARCHAR(16) CHECK (ema_alignment IN ('BULLISH', 'BEARISH', 'NEUTRAL')),
    rsi_14 NUMERIC(6, 2),
    atr_14 NUMERIC(10, 4),
    atr_percentile NUMERIC(6, 2),
    key_levels JSONB DEFAULT '{}'::jsonb,
    volatility_state VARCHAR(32) DEFAULT 'NORMAL'
);

CREATE INDEX IF NOT EXISTS idx_eti_market_snap_inst ON public.eti_market_snapshots(instrument_id, timestamp DESC);

CREATE TABLE IF NOT EXISTS public.eti_market_breadth (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    universe VARCHAR(32) NOT NULL DEFAULT 'S&P 500',
    advancing_count INTEGER NOT NULL,
    declining_count INTEGER NOT NULL,
    new_highs INTEGER NOT NULL,
    new_lows INTEGER NOT NULL,
    pct_above_sma50 NUMERIC(6, 2) NOT NULL,
    pct_above_sma200 NUMERIC(6, 2) NOT NULL,
    session_bias VARCHAR(16) NOT NULL
        CHECK (session_bias IN ('BULLISH', 'BEARISH', 'NEUTRAL')),
    formula_detail TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.eti_market_movers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    symbol VARCHAR(16) NOT NULL,
    name VARCHAR(64),
    change_pct NUMERIC(8, 4) NOT NULL,
    volume BIGINT NOT NULL,
    relative_volume NUMERIC(6, 2) NOT NULL,
    mover_type VARCHAR(24) NOT NULL
        CHECK (mover_type IN ('TOP_GAINERS', 'TOP_LOSERS', 'UNUSUAL_VOLUME')),
    signals JSONB DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS public.eti_market_projections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instrument_id UUID NOT NULL REFERENCES public.eti_market_instruments(id) ON DELETE CASCADE,
    horizon VARCHAR(16) NOT NULL DEFAULT 'INTRADAY',
    as_of TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    bullish_scenario JSONB NOT NULL,
    sideways_scenario JSONB NOT NULL,
    bearish_scenario JSONB NOT NULL,
    disclaimer TEXT NOT NULL DEFAULT 'Indicativa, no calibrada, no es una señal de operación'
);

CREATE TABLE IF NOT EXISTS public.eti_projection_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    projection_id UUID NOT NULL REFERENCES public.eti_market_projections(id) ON DELETE CASCADE,
    evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    directional_accuracy BOOLEAN,
    levels_touched JSONB DEFAULT '[]'::jsonb,
    score NUMERIC(5, 2)
);

-- -------------------------------------------------------------------------------------
-- 6. Alteración de Tablas Existentes (Añadir topic_id y Horizontes)
-- -------------------------------------------------------------------------------------
DO $$
BEGIN
    -- eti_strategies
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='eti_strategies' AND column_name='topic_id') THEN
        ALTER TABLE public.eti_strategies ADD COLUMN topic_id UUID REFERENCES public.eti_topics(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='eti_strategies' AND column_name='horizon_declared') THEN
        ALTER TABLE public.eti_strategies ADD COLUMN horizon_declared VARCHAR(16) DEFAULT 'INTRADAY';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='eti_strategies' AND column_name='horizon_effective') THEN
        ALTER TABLE public.eti_strategies ADD COLUMN horizon_effective VARCHAR(16) DEFAULT 'INTRADAY';
    END IF;

    -- eti_strategy_rules
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='eti_strategy_rules' AND column_name='topic_id') THEN
        ALTER TABLE public.eti_strategy_rules ADD COLUMN topic_id UUID REFERENCES public.eti_topics(id);
    END IF;

    -- eti_experience_candidates
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='eti_experience_candidates' AND column_name='topic_id') THEN
        ALTER TABLE public.eti_experience_candidates ADD COLUMN topic_id UUID REFERENCES public.eti_topics(id);
    END IF;

    -- eti_experience_trades
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='eti_experience_trades' AND column_name='topic_id') THEN
        ALTER TABLE public.eti_experience_trades ADD COLUMN topic_id UUID REFERENCES public.eti_topics(id);
    END IF;

    -- eti_shadow_signals
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='eti_shadow_signals' AND column_name='topic_id') THEN
        ALTER TABLE public.eti_shadow_signals ADD COLUMN topic_id UUID REFERENCES public.eti_topics(id);
    END IF;
END $$;

-- -------------------------------------------------------------------------------------
-- 7. Seeds Iniciales: Temas, Fuentes de Opciones e Instrumentos de Mercado
-- -------------------------------------------------------------------------------------

-- A. Temas Canónicos
INSERT INTO public.eti_topics (code, name, status, description)
VALUES 
    ('OPTIONS', 'Opciones', 'ACTIVE', 'Estrategias y trading intradía con contratos de opciones CALL/PUT sobre SPY, QQQ, SPX.'),
    ('SCALPING', 'Scalping', 'PLANNED', 'Estrategias de momentum de alta frecuencia en acciones de baja capitalización. Fuente prevista: Ross Cameron.'),
    ('SWING_TRADING', 'Swing Trading', 'PLANNED', 'Operativa multidía en acciones y ETFs. Fuente prevista: Jesús Navarrete.')
ON CONFLICT (code) DO UPDATE 
SET name = EXCLUDED.name, status = EXCLUDED.status, description = EXCLUDED.description;

-- B. Watchlist de Instrumentos del Mercado
INSERT INTO public.eti_market_instruments (symbol, name, asset_class, proxy_for, display_order)
VALUES
    ('SPY', 'S&P 500 ETF Trust', 'ETF', 'SPX', 1),
    ('QQQ', 'Invesco QQQ (Nasdaq-100)', 'ETF', 'NDX', 2),
    ('DIA', 'SPDR Dow Jones Industrial', 'ETF', 'DJI', 3),
    ('IWM', 'iShares Russell 2000', 'ETF', 'RUT', 4),
    ('VIX', 'CBOE Volatility Index', 'VOLATILITY', NULL, 5),
    ('US10Y', 'US 10-Year Treasury Yield', 'BOND', NULL, 6),
    ('UUP', 'Invesco DB US Dollar Index', 'FOREX', 'DXY', 7)
ON CONFLICT (symbol) DO NOTHING;

-- C. Asignar topic_id por defecto (OPTIONS) a las estrategias y reglas existentes
DO $$
DECLARE
    opt_topic_id UUID;
BEGIN
    SELECT id INTO opt_topic_id FROM public.eti_topics WHERE code = 'OPTIONS';
    IF opt_topic_id IS NOT NULL THEN
        UPDATE public.eti_strategies SET topic_id = opt_topic_id WHERE topic_id IS NULL;
        UPDATE public.eti_strategy_rules SET topic_id = opt_topic_id WHERE topic_id IS NULL;
        UPDATE public.eti_experience_candidates SET topic_id = opt_topic_id WHERE topic_id IS NULL;
        UPDATE public.eti_experience_trades SET topic_id = opt_topic_id WHERE topic_id IS NULL;
        UPDATE public.eti_shadow_signals SET topic_id = opt_topic_id WHERE topic_id IS NULL;
    END IF;
END $$;
