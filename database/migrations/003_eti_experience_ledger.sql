-- =====================================================================================
-- Migración: 003_eti_experience_ledger.sql
-- Sprint: ETI-S1B (Experience Ledger Vía C) y Vía A (Replay de Claims)
-- Descripción: Tablas inmutables append-only para registrar en tiempo real cada
--              decisión y ejecución de eTrade, y auditar operaciones de YouTube.
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1. Experience Ledger: Candidatos Evaluados y Reglas ADUANA (Vía C)
-- -------------------------------------------------------------------------------------
-- Registra TODOS los candidatos, incluidos los rechazados por ADUANA para contrafactuales.
CREATE TABLE IF NOT EXISTS public.eti_experience_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    underlying VARCHAR(16) NOT NULL,
    execution_mode VARCHAR(16) NOT NULL CHECK (execution_mode IN ('PAPER', 'LIVE')),
    strategy_name VARCHAR(64) NOT NULL,
    direction VARCHAR(8) NOT NULL CHECK (direction IN ('CALL', 'PUT')),
    apex_score NUMERIC(5, 2) NOT NULL,
    score_components JSONB NOT NULL, -- EV, Coherencia, Liquidez, Riesgo, IV/Griegas, Contexto
    aduana_passed BOOLEAN NOT NULL,
    aduana_rules_detail JSONB NOT NULL, -- Resultado individual de O-1 a O-12
    rejection_reason TEXT,
    market_regime VARCHAR(64),
    config_hash VARCHAR(64),
    eti_query_id UUID, -- Enlace con la consulta a la Decision Intelligence API si la hubo
    decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eti_exp_cand_mode ON public.eti_experience_candidates(execution_mode, decided_at DESC);
CREATE INDEX IF NOT EXISTS idx_eti_exp_cand_passed ON public.eti_experience_candidates(aduana_passed);

-- -------------------------------------------------------------------------------------
-- 2. Experience Ledger: Ejecución Realizada y Resultados (Vía C)
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.eti_experience_trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES public.eti_experience_candidates(id),
    execution_mode VARCHAR(16) NOT NULL CHECK (execution_mode IN ('PAPER', 'LIVE')),
    fill_model VARCHAR(32) NOT NULL DEFAULT 'CONSERVATIVE_BID_ASK',
    contract_symbol VARCHAR(64) NOT NULL,
    quantity INTEGER NOT NULL,
    entry_mid_price NUMERIC(10, 4) NOT NULL,
    entry_fill_price NUMERIC(10, 4) NOT NULL,
    entry_slippage_usd NUMERIC(10, 4) NOT NULL,
    entry_fees_usd NUMERIC(10, 4) NOT NULL,
    entry_at TIMESTAMPTZ NOT NULL,
    exit_fill_price NUMERIC(10, 4),
    exit_slippage_usd NUMERIC(10, 4),
    exit_fees_usd NUMERIC(10, 4),
    exit_reason VARCHAR(64), -- 'TAKE_PROFIT_ACTIVO', 'STOP_LOSS_PASIVO', 'END_OF_DAY', 'INVALIDATION'
    exit_at TIMESTAMPTZ,
    duration_minutes NUMERIC(8, 2),
    mfe_usd NUMERIC(10, 2), -- Max Favorable Excursion
    mae_usd NUMERIC(10, 2), -- Max Adverse Excursion
    net_pnl_usd NUMERIC(12, 2),
    return_pct NUMERIC(8, 4)
);

CREATE INDEX IF NOT EXISTS idx_eti_exp_trades_mode ON public.eti_experience_trades(execution_mode, entry_at DESC);

-- -------------------------------------------------------------------------------------
-- 3. Señales en Sombra (Libro SHADOW_SIGNALS - Evidencia E3)
-- -------------------------------------------------------------------------------------
-- Simulación sin el límite de 3 operaciones diarias para acelerar la acumulación estadística.
CREATE TABLE IF NOT EXISTS public.eti_shadow_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    strategy_version_id UUID REFERENCES public.eti_strategy_versions(id),
    underlying VARCHAR(16) NOT NULL,
    direction VARCHAR(8) NOT NULL,
    signal_time TIMESTAMPTZ NOT NULL,
    simulated_entry_premium NUMERIC(10, 4) NOT NULL,
    simulated_exit_premium NUMERIC(10, 4),
    simulated_pnl_usd NUMERIC(12, 2),
    rule_nature VARCHAR(32) NOT NULL DEFAULT 'STANDARD_CONSENSUS',
    exception_override_applied VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------------------------------
-- 4. Calibración Dinámica de Costes (Vía C -> Vía B)
-- -------------------------------------------------------------------------------------
-- Versiones de parámetros de coste calibradas a partir del slippage y spread medidos en el ledger.
CREATE TABLE IF NOT EXISTS public.eti_cost_calibrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calibration_version VARCHAR(32) NOT NULL UNIQUE,
    sample_trades_count INTEGER NOT NULL,
    avg_slippage_pct NUMERIC(6, 4) NOT NULL,
    avg_spread_pct NUMERIC(6, 4) NOT NULL,
    fee_per_contract NUMERIC(6, 4) NOT NULL DEFAULT 0.70,
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT
);

-- -------------------------------------------------------------------------------------
-- 5. Vía A: Replay de Operaciones Declaradas (Influencers de YouTube)
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.eti_claim_replays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_id UUID NOT NULL REFERENCES public.eti_operations(id) ON DELETE CASCADE,
    historical_dataset_id VARCHAR(64) NOT NULL, -- Identificador del dataset D2 utilizado
    contract_exists BOOLEAN NOT NULL,
    market_bid_at_entry NUMERIC(10, 4),
    market_ask_at_entry NUMERIC(10, 4),
    reconstructed_pnl_usd NUMERIC(12, 2),
    declared_pnl_usd NUMERIC(12, 2),
    pnl_discrepancy_pct NUMERIC(8, 2),
    replay_class VARCHAR(32) NOT NULL
        CHECK (replay_class IN ('REPLAY_CONSISTENT', 'REPLAY_PARTIAL', 'REPLAY_INCONSISTENT', 'NOT_VERIFIABLE')),
    justification TEXT,
    replayed_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------------------------------
-- 6. Métricas de Credibilidad de Fuentes (Informativas - No aprueban estrategias)
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.eti_source_credibility (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES public.eti_sources(id) ON DELETE CASCADE,
    evaluation_period VARCHAR(32) NOT NULL,
    total_claims_evaluated INTEGER NOT NULL,
    verifiable_claims_pct NUMERIC(5, 2) NOT NULL,
    consistent_claims_pct NUMERIC(5, 2) NOT NULL,
    claim_to_rule_gap_pct NUMERIC(6, 2) NOT NULL, -- Brecha entre P&L mostrado en videos vs regla en todo el histórico
    credibility_rank NUMERIC(5, 2) NOT NULL, -- Score 0 a 100 para priorizar la cola de análisis
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------------------------------
-- 7. Trigger de Integridad: Regla Append-Only para el Experience Ledger
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_append_only_ledger()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Violación de integridad: El Experience Ledger es inmutable (append-only). No se permiten operaciones de UPDATE o DELETE.';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_block_candidate_mutations
    BEFORE UPDATE OR DELETE ON public.eti_experience_candidates
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_append_only_ledger();

CREATE OR REPLACE TRIGGER trg_block_trade_mutations
    BEFORE UPDATE OR DELETE ON public.eti_experience_trades
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_append_only_ledger();

-- -------------------------------------------------------------------------------------
-- 8. Row Level Security en Tablas de Ledger y Replay
-- -------------------------------------------------------------------------------------
ALTER TABLE public.eti_experience_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eti_experience_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eti_shadow_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eti_cost_calibrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eti_claim_replays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eti_source_credibility ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura de ledger para usuarios autenticados"
    ON public.eti_experience_candidates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Lectura de trades para usuarios autenticados"
    ON public.eti_experience_trades FOR SELECT TO authenticated USING (true);

CREATE POLICY "Lectura de replays para usuarios autenticados"
    ON public.eti_claim_replays FOR SELECT TO authenticated USING (true);
