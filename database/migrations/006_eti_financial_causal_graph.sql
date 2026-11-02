-- =====================================================================================
-- Migración 006: Financial Dynamics Engine (FDE) & Financial Causal Graph (FCG)
-- Base de Datos: Supabase (PostgreSQL 15+)
-- Inspirado en Dinámica de Sistemas (Jay Forrester) adaptado al Trading Cuantitativo
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1. Catálogo de Nodos Causales del FCG (6 Capas de Transmisión)
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.eti_fde_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_code VARCHAR(64) UNIQUE NOT NULL,
    node_name VARCHAR(128) NOT NULL,
    layer INTEGER NOT NULL CHECK (layer BETWEEN 0 AND 5),
    layer_name VARCHAR(64) NOT NULL,
    category VARCHAR(64) NOT NULL 
        CHECK (category IN ('GEOPOLITICAL', 'MONETARY', 'LIQUIDITY', 'MACRO_SURPRISE', 'COMMODITY', 'VOLATILITY', 'OPTION_FLOW', 'SECTOR', 'ASSET')),
    unit VARCHAR(32) NOT NULL 
        CHECK (unit IN ('PERCENT', 'USD', 'POINTS', 'INDEX', 'RATIO', 'DISCRETE_STATE', 'BPS')),
    primary_source VARCHAR(64) NOT NULL 
        CHECK (primary_source IN ('FRED', 'FINNHUB', 'YFINANCE', 'BLS', 'EIA', 'CBOE', 'INTERNAL', 'MANUAL')),
    ticker_or_series_id VARCHAR(64),
    current_value NUMERIC(16, 6),
    previous_value NUMERIC(16, 6),
    expected_value NUMERIC(16, 6),
    surprise_shock NUMERIC(16, 6),
    z_score NUMERIC(8, 4),
    regime_signal VARCHAR(32) 
        CHECK (regime_signal IN ('BULLISH', 'BEARISH', 'NEUTRAL', 'EXTREME_VOLATILITY', 'UNKNOWN')),
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_fde_nodes_code ON public.eti_fde_nodes(node_code);
CREATE INDEX IF NOT EXISTS idx_fde_nodes_layer ON public.eti_fde_nodes(layer);
CREATE INDEX IF NOT EXISTS idx_fde_nodes_category ON public.eti_fde_nodes(category);

-- -------------------------------------------------------------------------------------
-- 2. Matriz de Aristas Causales Ponderadas con Memoria y Retardo
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.eti_fde_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_node_code VARCHAR(64) NOT NULL REFERENCES public.eti_fde_nodes(node_code) ON UPDATE CASCADE ON DELETE CASCADE,
    target_node_code VARCHAR(64) NOT NULL REFERENCES public.eti_fde_nodes(node_code) ON UPDATE CASCADE ON DELETE CASCADE,
    relation_type VARCHAR(32) NOT NULL 
        CHECK (relation_type IN ('POSITIVE', 'NEGATIVE', 'AMPLIFY', 'DAMPEN', 'REGIME_SWITCH')),
    weight NUMERIC(6, 4) NOT NULL DEFAULT 0.5000 CHECK (weight BETWEEN -1.0000 AND 1.0000),
    confidence NUMERIC(6, 4) NOT NULL DEFAULT 0.8000 CHECK (confidence BETWEEN 0.0000 AND 1.0000),
    lag_seconds INTEGER NOT NULL DEFAULT 0,
    persistence_days INTEGER NOT NULL DEFAULT 1,
    decay_lambda NUMERIC(6, 4) NOT NULL DEFAULT 0.1000,
    transmission_mechanism TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_fde_edge UNIQUE (source_node_code, target_node_code)
);

CREATE INDEX IF NOT EXISTS idx_fde_edges_source ON public.eti_fde_edges(source_node_code);
CREATE INDEX IF NOT EXISTS idx_fde_edges_target ON public.eti_fde_edges(target_node_code);
CREATE INDEX IF NOT EXISTS idx_fde_edges_active ON public.eti_fde_edges(is_active);

-- -------------------------------------------------------------------------------------
-- 3. Histórico de Estados Globales del Sistema Financiero (FSS)
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.eti_fde_system_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    macro_regime VARCHAR(64) NOT NULL 
        CHECK (macro_regime IN ('EXPANSION', 'DECELERATION', 'CONTRACTION', 'LIQUIDITY_SHOCK', 'INFLATION_SURPRISE', 'NEUTRAL_RANGE', 'COMMODITY_STAGFLATION')),
    system_coherence_index NUMERIC(6, 4) NOT NULL CHECK (system_coherence_index BETWEEN 0.0000 AND 1.0000),
    directional_bias VARCHAR(32) NOT NULL 
        CHECK (directional_bias IN ('BULLISH', 'BEARISH', 'NEUTRAL', 'CHOPPY_VOLATILE')),
    expected_spx_open_action VARCHAR(64) NOT NULL,
    primary_driver_node VARCHAR(64) REFERENCES public.eti_fde_nodes(node_code) ON UPDATE CASCADE ON DELETE SET NULL,
    shock_intensity NUMERIC(6, 4) NOT NULL DEFAULT 0.0,
    recommended_strategy VARCHAR(64) NOT NULL,
    aduana_gate_action VARCHAR(32) NOT NULL 
        CHECK (aduana_gate_action IN ('ALLOW_PUTS_ONLY', 'ALLOW_CALLS_ONLY', 'ALLOW_NEUTRAL_ONLY', 'HALT_ALL', 'NORMAL_EXECUTION')),
    state_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fde_states_timestamp ON public.eti_fde_system_states(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_fde_states_regime ON public.eti_fde_system_states(macro_regime);

-- -------------------------------------------------------------------------------------
-- 4. Contrastación y Calibración Empírica contra Operaciones de Traders
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.eti_fde_empirical_calibrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_id UUID REFERENCES public.eti_operations(id) ON DELETE SET NULL,
    strategy_id UUID REFERENCES public.eti_strategies(id) ON DELETE SET NULL,
    trade_date DATE NOT NULL,
    influencer_name VARCHAR(128) NOT NULL,
    asset VARCHAR(32) NOT NULL,
    real_trade_type VARCHAR(32) NOT NULL,
    real_entry_time TIME,
    real_roi_percent NUMERIC(8, 2),
    predicted_macro_bias VARCHAR(32) NOT NULL,
    predicted_action VARCHAR(64) NOT NULL,
    was_direction_accurate BOOLEAN NOT NULL,
    lag_minutes_actual NUMERIC(6, 2),
    post_trade_weight_adjustment JSONB DEFAULT '{}'::jsonb,
    calibration_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fde_calib_date ON public.eti_fde_empirical_calibrations(trade_date DESC);
CREATE INDEX IF NOT EXISTS idx_fde_calib_influencer ON public.eti_fde_empirical_calibrations(influencer_name);
CREATE INDEX IF NOT EXISTS idx_fde_calib_accuracy ON public.eti_fde_empirical_calibrations(was_direction_accurate);

-- -------------------------------------------------------------------------------------
-- 5. Row Level Security (RLS)
-- -------------------------------------------------------------------------------------
ALTER TABLE public.eti_fde_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eti_fde_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eti_fde_system_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eti_fde_empirical_calibrations ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura pública/autenticada
CREATE POLICY "Lectura pública de nodos FDE" ON public.eti_fde_nodes FOR SELECT USING (true);
CREATE POLICY "Lectura pública de aristas FDE" ON public.eti_fde_edges FOR SELECT USING (true);
CREATE POLICY "Lectura pública de estados FDE" ON public.eti_fde_system_states FOR SELECT USING (true);
CREATE POLICY "Lectura pública de calibraciones FDE" ON public.eti_fde_empirical_calibrations FOR SELECT USING (true);

-- Políticas de escritura para rol de servicio / backend
CREATE POLICY "Escritura de servicio en nodos FDE" ON public.eti_fde_nodes FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Escritura de servicio en aristas FDE" ON public.eti_fde_edges FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Escritura de servicio en estados FDE" ON public.eti_fde_system_states FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Escritura de servicio en calibraciones FDE" ON public.eti_fde_empirical_calibrations FOR ALL USING (auth.role() = 'service_role');
